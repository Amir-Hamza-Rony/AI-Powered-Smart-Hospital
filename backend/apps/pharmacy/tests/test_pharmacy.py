"""Pharmacy API tests: catalog, batches, stock signals, dispensing, permissions, audit."""

from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.audit.models import AuditLog
from apps.doctors.models import Doctor
from apps.patients.models import Patient
from apps.pharmacy.models import Medicine, MedicineBatch
from apps.prescriptions.models import Prescription, PrescriptionItem


def make_user(email, role, staff=False, superuser=False):
    return User.objects.create_user(
        email=email, password="StrongPass123", first_name="Test",
        last_name="User", role=role, is_staff=staff, is_superuser=superuser)


def make_patient(phone="+8801717000001", nid="198501010031"):
    return Patient.objects.create(
        first_name="Test", last_name="Patient", date_of_birth="1990-01-01",
        gender="Male", phone=phone, nid=nid,
        emergency_contact="Kin", emergency_phone="+8801717000002")


def make_medicine(name="Paracetamol 500mg", reorder=10):
    return Medicine.objects.create(
        name=name, generic_name="Paracetamol", category="Analgesic",
        strength="500mg", dosage_form="Tablet", manufacturer="Acme",
        unit_price="2.50", reorder_level=reorder)


def make_batch(medicine, number="B-0001", qty=100, days_to_expiry=365):
    return MedicineBatch.objects.create(
        medicine=medicine, batch_number=number, quantity=qty,
        purchase_price="1.50", selling_price="2.50",
        expiry_date=timezone.localdate() + timedelta(days=days_to_expiry))


def make_prescription(patient, doctor):
    prescription = Prescription.objects.create(
        patient=patient, doctor=doctor, date="2026-09-20", diagnosis="Fever")
    PrescriptionItem.objects.create(
        prescription=prescription, medicine_name="Paracetamol",
        dosage="1 tablet", frequency="Twice daily", duration="5 days",
        quantity=10)
    return prescription


class PharmacyApiTests(APITestCase):
    def setUp(self):
        self.admin = make_user("admin@example.com", Role.SUPER_ADMIN, staff=True, superuser=True)
        self.pharmacist = make_user("pharm@example.com", Role.PHARMACIST)
        self.doctor_user = make_user("doctor@example.com", Role.DOCTOR, staff=True)
        self.patient_user = make_user("patient@example.com", Role.PATIENT)
        self.patient = make_patient()
        self.doctor = Doctor.objects.create(
            first_name="Doc", last_name="Tor", specialization="General Medicine",
            registration_no="BMDC-A-90001", phone="+8801717000011")

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def test_medicine_permissions(self):
        payload = {"name": "Aspirin", "unit_price": "1.00", "reorder_level": 5}
        self.assertEqual(
            self.client.post(reverse("medicines-list"), payload, format="json").status_code,
            status.HTTP_401_UNAUTHORIZED)
        self._auth(self.patient_user)
        self.assertEqual(
            self.client.get(reverse("medicines-list")).status_code, status.HTTP_200_OK)
        self.assertEqual(
            self.client.post(reverse("medicines-list"), payload, format="json").status_code,
            status.HTTP_403_FORBIDDEN)
        self._auth(self.pharmacist)
        response = self.client.post(reverse("medicines-list"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(AuditLog.objects.filter(
            action="MEDICINE_CREATED",
            object_id=response.json()["data"]["id"]).exists())

    def test_negative_price_rejected(self):
        self._auth(self.pharmacist)
        self.assertEqual(self.client.post(
            reverse("medicines-list"),
            {"name": "Bad", "unit_price": "-5.00"}, format="json").status_code,
            status.HTTP_400_BAD_REQUEST)

    def test_batch_creation_and_uniqueness(self):
        medicine = make_medicine()
        self._auth(self.pharmacist)
        response = self.client.post(reverse("batches-list"), {
            "medicine": str(medicine.id), "batch_number": "B-1001",
            "quantity": 100, "expiry_date": "2027-12-31"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(AuditLog.objects.filter(
            action="BATCH_CREATED",
            object_id=response.json()["data"]["id"]).exists())
        self.assertEqual(self.client.post(reverse("batches-list"), {
            "medicine": str(medicine.id), "batch_number": "B-1001",
            "quantity": 50, "expiry_date": "2027-12-31"}, format="json").status_code,
            status.HTTP_400_BAD_REQUEST)

    def test_manufacture_after_expiry_rejected(self):
        medicine = make_medicine()
        self._auth(self.pharmacist)
        self.assertEqual(self.client.post(reverse("batches-list"), {
            "medicine": str(medicine.id), "batch_number": "B-1002", "quantity": 10,
            "manufacture_date": "2027-01-01",
            "expiry_date": "2026-01-01"}, format="json").status_code,
            status.HTTP_400_BAD_REQUEST)

    def test_stock_signals(self):
        low = make_medicine(name="LowMed", reorder=50)
        make_batch(low, number="B-L1", qty=10)
        expiring = make_medicine(name="ExpMed", reorder=5)
        make_batch(expiring, number="B-E1", qty=100, days_to_expiry=30)
        expired = make_medicine(name="OldMed", reorder=5)
        MedicineBatch.objects.create(
            medicine=expired, batch_number="B-X1", quantity=20,
            expiry_date=timezone.localdate() - timedelta(days=1))
        self._auth(self.doctor_user)
        by_name = {row["name"]: row for row in
                   self.client.get(reverse("medicines-list")).json()["results"]}
        self.assertEqual(by_name["LowMed"]["stock_status"], "Low Stock")
        self.assertTrue(by_name["LowMed"]["is_low_stock"])
        self.assertEqual(by_name["ExpMed"]["stock_status"], "Near Expiry")
        self.assertTrue(by_name["ExpMed"]["has_near_expiry"])
        self.assertEqual(by_name["OldMed"]["stock_status"], "Out of Stock")
        self.assertEqual(by_name["OldMed"]["available_stock"], 0)
        self.assertEqual(by_name["OldMed"]["expired_stock"], 20)
        low_filter = self.client.get(reverse("medicines-list"), {"low_stock": "true"})
        names = [row["name"] for row in low_filter.json()["results"]]
        self.assertIn("LowMed", names)
        self.assertNotIn("ExpMed", names)
        expired_batches = self.client.get(reverse("batches-list"), {"expired": "true"})
        self.assertEqual(
            expired_batches.json()["results"][0]["batch_number"], "B-X1")

    def _dispensing_payload(self, prescription, medicine, quantity=5, batch=None):
        data = {
            "prescription": str(prescription.id), "patient": str(self.patient.id),
            "date": "2026-09-21",
            "items": [{"medicine": str(medicine.id), "quantity": quantity,
                       "unit_price": "2.50"}],
        }
        if batch is not None:
            data["items"][0]["batch"] = str(batch.id)
        return data

    def test_dispensing_full_flow_and_stock_decrease(self):
        medicine = make_medicine()
        batch = make_batch(medicine, qty=100)
        prescription = make_prescription(self.patient, self.doctor)
        self._auth(self.pharmacist)
        created = self.client.post(
            reverse("dispensing-list"),
            self._dispensing_payload(prescription, medicine), format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created.json()["data"]["status"], "Pending")
        self.assertTrue(AuditLog.objects.filter(
            action="DISPENSING_CREATED",
            object_id=created.json()["data"]["id"]).exists())
        dispensed = self.client.post(
            reverse("dispensing-dispense", args=[created.json()["data"]["id"]]),
            {}, format="json")
        self.assertEqual(dispensed.status_code, status.HTTP_200_OK)
        self.assertEqual(dispensed.json()["data"]["status"], "Dispensed")
        batch.refresh_from_db()
        self.assertEqual(batch.quantity, 95)

    def test_dispensing_patient_mismatch_rejected(self):
        medicine = make_medicine()
        make_batch(medicine)
        other = Patient.objects.create(
            first_name="Other", last_name="Patient", date_of_birth="1991-02-02",
            gender="Female", phone="+8801717000009", nid="198501010039",
            emergency_contact="Kin", emergency_phone="+8801717000010")
        prescription = make_prescription(other, self.doctor)
        self._auth(self.pharmacist)
        payload = self._dispensing_payload(prescription, medicine)
        payload["patient"] = str(self.patient.id)
        self.assertEqual(self.client.post(
            reverse("dispensing-list"), payload, format="json").status_code,
            status.HTTP_400_BAD_REQUEST)

    def test_insufficient_stock_rejected(self):
        medicine = make_medicine()
        make_batch(medicine, qty=2)
        prescription = make_prescription(self.patient, self.doctor)
        self._auth(self.pharmacist)
        created = self.client.post(
            reverse("dispensing-list"),
            self._dispensing_payload(prescription, medicine, quantity=10),
            format="json")
        self.assertEqual(self.client.post(
            reverse("dispensing-dispense", args=[created.json()["data"]["id"]]),
            {}, format="json").status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(MedicineBatch.objects.get().quantity, 2)

    def test_expired_batch_cannot_be_dispensed(self):
        medicine = make_medicine()
        expired = MedicineBatch.objects.create(
            medicine=medicine, batch_number="B-OLD", quantity=50,
            expiry_date=timezone.localdate() - timedelta(days=1))
        prescription = make_prescription(self.patient, self.doctor)
        self._auth(self.pharmacist)
        created = self.client.post(
            reverse("dispensing-list"),
            self._dispensing_payload(prescription, medicine, batch=expired),
            format="json")
        self.assertEqual(self.client.post(
            reverse("dispensing-dispense", args=[created.json()["data"]["id"]]),
            {}, format="json").status_code, status.HTTP_400_BAD_REQUEST)

    def test_partial_dispense_and_cancel(self):
        medicine = make_medicine()
        make_batch(medicine, qty=100)
        prescription = make_prescription(self.patient, self.doctor)
        self._auth(self.pharmacist)
        record_id = self.client.post(
            reverse("dispensing-list"),
            self._dispensing_payload(prescription, medicine, quantity=10),
            format="json").json()["data"]["id"]
        item_id = self.client.get(
            reverse("dispensing-detail", args=[record_id])).json()["data"]["items"][0]["id"]
        partial = self.client.post(
            reverse("dispensing-dispense", args=[record_id]),
            {"items": [{"id": item_id, "quantity": 4}]}, format="json")
        self.assertEqual(partial.json()["data"]["status"], "Partially Dispensed")
        cancelled = self.client.post(reverse("dispensing-cancel", args=[record_id]))
        self.assertEqual(cancelled.json()["data"]["status"], "Cancelled")
        self.assertEqual(MedicineBatch.objects.get().quantity, 96)

    def test_dispensing_permissions(self):
        medicine = make_medicine()
        make_batch(medicine)
        prescription = make_prescription(self.patient, self.doctor)
        self._auth(self.doctor_user)
        self.assertEqual(
            self.client.get(reverse("dispensing-list")).status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.post(
            reverse("dispensing-list"),
            self._dispensing_payload(prescription, medicine),
            format="json").status_code, status.HTTP_403_FORBIDDEN)
