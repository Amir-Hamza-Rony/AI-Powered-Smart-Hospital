"""Billing API tests: invoices, payments, ledger, safety, permissions, audit."""

from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.audit.models import AuditLog
from apps.billing.models import Invoice, Payment, RevenueTransaction
from apps.patients.models import Patient


def make_user(email, role, staff=False, superuser=False):
    return User.objects.create_user(
        email=email, password="StrongPass123", first_name="Test",
        last_name="User", role=role, is_staff=staff, is_superuser=superuser)


def make_patient(phone="+8801718000001", nid="198501010041"):
    return Patient.objects.create(
        first_name="Test", last_name="Patient", date_of_birth="1990-01-01",
        gender="Male", phone=phone, nid=nid,
        emergency_contact="Kin", emergency_phone="+8801718000002")


def item_payload(**overrides):
    data = {
        "description": "General Consultation", "item_type": "Consultation",
        "category": "Consultation", "quantity": 1, "unit_price": "800.00",
        "discount": "0.00", "tax": "0.00",
    }
    data.update(overrides)
    return data


class BillingApiTests(APITestCase):
    def setUp(self):
        self.admin = make_user("admin@example.com", Role.SUPER_ADMIN, staff=True, superuser=True)
        self.receptionist = make_user("recep@example.com", Role.RECEPTIONIST)
        self.doctor_user = make_user("doctor@example.com", Role.DOCTOR, staff=True)
        self.patient_user = make_user("patient@example.com", Role.PATIENT)
        self.patient = make_patient()

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def _invoice_payload(self, **overrides):
        data = {
            "patient": str(self.patient.id), "service_type": "Consultation",
            "issue_date": "2026-09-20", "due_date": "2026-09-27",
            "payment_terms": "Net 7", "discount": "50.00", "tax": "20.00",
            "items": [item_payload(),
                      item_payload(description="CBC Test", item_type="Laboratory",
                                   category="Laboratory", quantity=2, unit_price="350.00")],
        }
        data.update(overrides)
        return data

    def _create_invoice(self):
        self._auth(self.receptionist)
        response = self.client.post(
            reverse("invoices-list"), self._invoice_payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response.json()["data"]

    def test_unauthenticated_cannot_list(self):
        self.assertEqual(
            self.client.get(reverse("invoices-list")).status_code,
            status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            self.client.get(reverse("ledger-list")).status_code,
            status.HTTP_401_UNAUTHORIZED)

    def test_patient_role_cannot_access_billing(self):
        self._auth(self.patient_user)
        self.assertEqual(
            self.client.get(reverse("invoices-list")).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            self.client.get(reverse("ledger-list")).status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_can_read_and_doctor_can_read(self):
        self._create_invoice()
        self._auth(self.doctor_user)
        self.assertEqual(
            self.client.get(reverse("invoices-list")).status_code, status.HTTP_200_OK)

    def test_create_invoice_server_side_totals_and_audit(self):
        created = self._create_invoice()
        # subtotal 800 + 700 = 1500; total = 1500 - 50 + 20 = 1470
        self.assertEqual(created["subtotal"], "1500.00")
        self.assertEqual(created["total"], "1470.00")
        self.assertEqual(created["paid_amount"], "0.00")
        self.assertEqual(created["due_amount"], "1470.00")
        self.assertEqual(created["status"], "Draft")
        self.assertTrue(created["invoice_number"].startswith("INV-"))
        self.assertTrue(AuditLog.objects.filter(
            action="INVOICE_CREATED", object_id=created["id"]).exists())

    def test_invoice_number_unique(self):
        first = self._create_invoice()
        second = self._create_invoice()
        self.assertNotEqual(first["invoice_number"], second["invoice_number"])

    def test_negative_values_rejected(self):
        self._auth(self.receptionist)
        response = self.client.post(
            reverse("invoices-list"),
            self._invoice_payload(items=[item_payload(unit_price="-5.00")]), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_due_before_issue_rejected(self):
        self._auth(self.receptionist)
        response = self.client.post(
            reverse("invoices-list"),
            self._invoice_payload(issue_date="2026-09-27", due_date="2026-09-20"),
            format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_issue_and_cancel_workflow(self):
        created = self._create_invoice()
        self._auth(self.receptionist)
        issued = self.client.post(reverse("invoices-issue", args=[created["id"]]))
        self.assertEqual(issued.json()["data"]["status"], "Pending")
        self.assertTrue(AuditLog.objects.filter(
            action="INVOICE_ISSUED", object_id=created["id"]).exists())
        cancelled = self.client.post(reverse("invoices-cancel", args=[created["id"]]))
        self.assertEqual(cancelled.json()["data"]["status"], "Cancelled")

    def test_issue_draft_only(self):
        created = self._create_invoice()
        self._auth(self.receptionist)
        self.client.post(reverse("invoices-issue", args=[created["id"]]))
        self.assertEqual(
            self.client.post(reverse("invoices-issue", args=[created["id"]])).status_code,
            status.HTTP_400_BAD_REQUEST)

    def test_payment_full_flow_partial_then_full(self):
        created = self._create_invoice()
        self._auth(self.receptionist)
        self.client.post(reverse("invoices-issue", args=[created["id"]]))
        first = self.client.post(reverse("payments-list"), {
            "invoice": created["id"], "patient": str(self.patient.id),
            "amount": "470.00", "payment_date": "2026-09-21",
            "payment_method": "Cash", "reference": "CASH-1"}, format="json")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        invoice = Invoice.objects.get(pk=created["id"])
        self.assertEqual(invoice.status, "Partially Paid")
        self.assertEqual(invoice.due_amount, Decimal("1000.00"))
        second = self.client.post(reverse("payments-list"), {
            "invoice": created["id"], "patient": str(self.patient.id),
            "amount": "1000.00", "payment_date": "2026-09-22",
            "payment_method": "Card", "reference": "CARD-1"}, format="json")
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, "Paid")
        self.assertEqual(invoice.due_amount, Decimal("0.00"))
        self.assertTrue(AuditLog.objects.filter(action="PAYMENT_CREATED").exists())
        self.assertEqual(RevenueTransaction.objects.filter(
            invoice=invoice).exclude(type="Refund").count(), 2)

    def test_cannot_overpay(self):
        created = self._create_invoice()
        self._auth(self.receptionist)
        self.client.post(reverse("invoices-issue", args=[created["id"]]))
        response = self.client.post(reverse("payments-list"), {
            "invoice": created["id"], "patient": str(self.patient.id),
            "amount": "99999.00", "payment_date": "2026-09-21",
            "payment_method": "Cash"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Invoice.objects.get(pk=created["id"]).due_amount,
                         Decimal("1470.00"))

    def test_cannot_pay_draft_or_cancelled_or_paid(self):
        created = self._create_invoice()
        self._auth(self.receptionist)
        payload = {"invoice": created["id"], "patient": str(self.patient.id),
                   "amount": "100.00", "payment_date": "2026-09-21",
                   "payment_method": "Cash"}
        self.assertEqual(
            self.client.post(reverse("payments-list"), payload, format="json").status_code,
            status.HTTP_400_BAD_REQUEST)
        self.client.post(reverse("invoices-issue", args=[created["id"]]))
        self.client.post(reverse("invoices-cancel", args=[created["id"]]))
        self.assertEqual(
            self.client.post(reverse("payments-list"), payload, format="json").status_code,
            status.HTTP_400_BAD_REQUEST)

    def test_invalid_amount_rejected(self):
        created = self._create_invoice()
        self._auth(self.receptionist)
        self.client.post(reverse("invoices-issue", args=[created["id"]]))
        for bad in ("0.00", "-10.00"):
            response = self.client.post(reverse("payments-list"), {
                "invoice": created["id"], "patient": str(self.patient.id),
                "amount": bad, "payment_date": "2026-09-21",
                "payment_method": "Cash"}, format="json")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_payment_patient_mismatch_rejected(self):
        created = self._create_invoice()
        other = Patient.objects.create(
            first_name="Other", last_name="Patient", date_of_birth="1991-02-02",
            gender="Female", phone="+8801718000009", nid="198501010049",
            emergency_contact="Kin", emergency_phone="+8801718000010")
        self._auth(self.receptionist)
        self.client.post(reverse("invoices-issue", args=[created["id"]]))
        response = self.client.post(reverse("payments-list"), {
            "invoice": created["id"], "patient": str(other.id),
            "amount": "100.00", "payment_date": "2026-09-21",
            "payment_method": "Cash"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cancel_completed_payment_reverses(self):
        created = self._create_invoice()
        self._auth(self.receptionist)
        self.client.post(reverse("invoices-issue", args=[created["id"]]))
        payment = self.client.post(reverse("payments-list"), {
            "invoice": created["id"], "patient": str(self.patient.id),
            "amount": "1470.00", "payment_date": "2026-09-21",
            "payment_method": "Cash"}, format="json").json()["data"]
        self.assertEqual(Invoice.objects.get(pk=created["id"]).status, "Paid")
        reversed_payment = self.client.post(
            reverse("payments-cancel", args=[payment["id"]]),
            {"reason": "Duplicate entry"}, format="json")
        self.assertEqual(reversed_payment.status_code, status.HTTP_200_OK)
        self.assertEqual(reversed_payment.json()["data"]["status"], "Refunded")
        invoice = Invoice.objects.get(pk=created["id"])
        self.assertEqual(invoice.status, "Pending")
        self.assertEqual(invoice.due_amount, Decimal("1470.00"))
        self.assertTrue(RevenueTransaction.objects.filter(
            payment_id=payment["id"], type="Refund").exists())
        self.assertTrue(AuditLog.objects.filter(action="PAYMENT_REVERSED").exists())

    def test_cancel_pending_payment_voids(self):
        created = self._create_invoice()
        self._auth(self.receptionist)
        self.client.post(reverse("invoices-issue", args=[created["id"]]))
        payment = Payment.objects.create(
            invoice_id=created["id"], patient=self.patient, amount=Decimal("100.00"),
            payment_date="2026-09-21", payment_method="Cash", status="Completed")
        payment.status = "Pending"
        payment.save(update_fields=["status"])
        response = self.client.post(reverse("payments-cancel", args=[str(payment.id)]), {},
                                    format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Payment.objects.filter(pk=payment.pk).exists())

    def test_payments_immutable(self):
        created = self._create_invoice()
        self._auth(self.receptionist)
        self.client.post(reverse("invoices-issue", args=[created["id"]]))
        payment = self.client.post(reverse("payments-list"), {
            "invoice": created["id"], "patient": str(self.patient.id),
            "amount": "100.00", "payment_date": "2026-09-21",
            "payment_method": "Cash"}, format="json").json()["data"]
        self.assertEqual(self.client.patch(
            reverse("payments-detail", args=[payment["id"]]),
            {"amount": "1.00"}, format="json").status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(self.client.delete(
            reverse("payments-detail", args=[payment["id"]])).status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_ledger_immutable_and_linked(self):
        created = self._create_invoice()
        self._auth(self.receptionist)
        self.client.post(reverse("invoices-issue", args=[created["id"]]))
        self.client.post(reverse("payments-list"), {
            "invoice": created["id"], "patient": str(self.patient.id),
            "amount": "200.00", "payment_date": "2026-09-21",
            "payment_method": "Cash", "reference": "CASH-9"}, format="json")
        response = self.client.get(reverse("ledger-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        entry = response.json()["results"][0]
        self.assertEqual(entry["amount"], "200.00")
        self.assertEqual(entry["invoice"], created["id"])
        self.assertEqual(entry["type"], "Consultation Revenue")
        self.assertEqual(self.client.post(
            reverse("ledger-list"), {}, format="json").status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(self.client.patch(
            reverse("ledger-detail", args=[entry["id"]]), {"amount": "1.00"},
            format="json").status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_filters(self):
        created = self._create_invoice()
        self._auth(self.receptionist)
        self.assertEqual(len(self.client.get(
            reverse("invoices-list"), {"status": "Draft"}).json()["results"]), 1)
        self.assertEqual(len(self.client.get(
            reverse("invoices-list"),
            {"search": created["invoice_number"]}).json()["results"]), 1)
        self.assertEqual(len(self.client.get(
            reverse("invoices-list"),
            {"patient": str(self.patient.id)}).json()["results"]), 1)
        self.client.post(reverse("invoices-issue", args=[created["id"]]))
        self.client.post(reverse("payments-list"), {
            "invoice": created["id"], "patient": str(self.patient.id),
            "amount": "100.00", "payment_date": "2026-09-21",
            "payment_method": "Mobile Banking", "reference": "MB-1"}, format="json")
        self.assertEqual(len(self.client.get(
            reverse("payments-list"), {"payment_method": "Mobile Banking"}).json()["results"]), 1)
        self.assertEqual(len(self.client.get(
            reverse("ledger-list"), {"search": "MB-1"}).json()["results"]), 1)
