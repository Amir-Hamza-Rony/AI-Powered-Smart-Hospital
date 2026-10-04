"""Seed development demo accounts (one per role). Development only.

Usage:
    python manage.py seed_demo_data
"""

from datetime import date, time, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import Role, User
from apps.audit.utils import log_audit

# DEVELOPMENT-ONLY credentials. Never use these in production.
DEV_PASSWORD = "Demo1234!"
DEMO_USERS = [
    ("Super Admin", "admin@smarthospital.local", Role.SUPER_ADMIN, True, True),
    ("Doctor", "doctor@smarthospital.local", Role.DOCTOR, True, False),
    ("Nurse", "nurse@smarthospital.local", Role.NURSE, False, False),
    ("Receptionist", "receptionist@smarthospital.local", Role.RECEPTIONIST, False, False),
    ("Pharmacist", "pharmacist@smarthospital.local", Role.PHARMACIST, False, False),
    ("Pathologist", "pathologist@smarthospital.local", Role.PATHOLOGIST, False, False),
    ("Patient", "patient@smarthospital.local", Role.PATIENT, False, False),
]


class Command(BaseCommand):
    help = "Create development demo accounts (safe to re-run)."

    def handle(self, *args, **options):
        created = 0
        for label, email, role, is_staff, is_superuser in DEMO_USERS:
            user, was_created = User.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": "Demo",
                    "last_name": label,
                    "phone": "+8801700000000",
                    "role": role,
                    "is_staff": is_staff,
                    "is_superuser": is_superuser,
                    "is_active": True,
                },
            )
            if was_created:
                user.set_password(DEV_PASSWORD)
                user.save()
                log_audit(user, "USER_CREATED", "accounts", f"Seeded demo {label.lower()} account: {email}.",
                           object_type="User", object_id=str(user.id))
                created += 1
        phase8 = self._seed_phase8()
        phase9 = self._seed_phase9()
        phase11 = self._seed_phase11()
        self.stdout.write(self.style.SUCCESS(
            f"Seed complete: {created} new demo account(s). "
            f"Development password for all demo accounts: {DEV_PASSWORD}"
            + (f" Phase 8 demo data: {phase8}." if phase8 else "")
            + (f" Phase 9 demo data: {phase9}." if phase9 else "")
            + (f" Phase 11 demo data: {phase11}." if phase11 else "")
        ))

    def _seed_phase8(self):
        """Deterministic Phase 8 demo patients/doctors/appointments (idempotent)."""
        from apps.appointments.models import Appointment
        from apps.doctors.models import Doctor, DoctorSchedule, Weekday
        from apps.patients.models import Patient

        summary = []
        patients_data = [
            {"first_name": "Demo", "last_name": "Patient One", "date_of_birth": date(1990, 5, 14),
             "gender": "Male", "blood_group": "B+", "phone": "+8801711000001",
             "email": "demo.patient1@example.com", "nid": "199005140001",
             "address": "Dhaka, Bangladesh", "emergency_contact": "Next of Kin",
             "emergency_phone": "+8801711000002", "status": "Active"},
            {"first_name": "Demo", "last_name": "Patient Two", "date_of_birth": date(1985, 11, 2),
             "gender": "Female", "blood_group": "O+", "phone": "+8801711000003",
             "email": "demo.patient2@example.com", "nid": "198511020003",
             "address": "Chattogram, Bangladesh", "emergency_contact": "Next of Kin",
             "emergency_phone": "+8801711000004", "status": "Active"},
        ]
        patients = []
        new_patients = 0
        for data in patients_data:
            patient, was_created = Patient.objects.get_or_create(
                nid=data["nid"], defaults={**data, "allergies": [], "chronic_conditions": []})
            patients.append(patient)
            new_patients += was_created
        summary.append(f"{new_patients} new patient(s)")

        doctor_user = User.objects.filter(email="doctor@smarthospital.local").first()
        doctor, was_created = Doctor.objects.get_or_create(
            registration_no="BMDC-DEMO-001",
            defaults={
                "user": doctor_user if doctor_user is not None and doctor_user.role == Role.DOCTOR else None,
                "first_name": "Demo", "last_name": "Doctor",
                "specialization": "General Medicine", "qualification": "MBBS",
                "experience_years": 10, "phone": "+8801712000001",
                "email": "demo.doctor@example.com", "department": "General",
                "room": "101", "consultation_fee": 800,
                "availability": "Available", "status": "Active",
            },
        )
        summary.append(f"{1 if was_created else 0} new doctor(s)")
        for day in (Weekday.MONDAY, Weekday.TUESDAY, Weekday.WEDNESDAY, Weekday.SATURDAY):
            DoctorSchedule.objects.get_or_create(
                doctor=doctor, day=day,
                defaults={"is_available": True, "slots": ["09:00 AM", "10:30 AM"]})

        future = timezone.localdate() + timedelta(days=7)
        _, appt_created = Appointment.objects.get_or_create(
            patient=patients[0], doctor=doctor, date=future, time=time(9, 0),
            defaults={"type": "In-person", "status": "Pending",
                       "reason": "Demo follow-up visit."})
        summary.append(f"{1 if appt_created else 0} new appointment(s)")
        return ", ".join(summary)

    def _seed_phase9(self):
        """Deterministic Phase 9 demo catalog/orders/prescriptions (idempotent)."""
        from apps.laboratory.models import LabOrder, LabOrderItem, LabTest
        from apps.patients.models import Patient
        from apps.doctors.models import Doctor
        from apps.pharmacy.models import DispensingRecord, Medicine, MedicineBatch
        from apps.prescriptions.models import Prescription, PrescriptionItem

        summary = []
        patient = Patient.objects.filter(nid="199005140001").first()
        doctor = Doctor.objects.filter(registration_no="BMDC-DEMO-001").first()
        if patient is None or doctor is None:
            return "skipped (Phase 8 demo data missing)"

        medicines_data = [
            {"name": "Paracetamol 500mg", "generic_name": "Paracetamol",
             "category": "Analgesic", "strength": "500mg", "dosage_form": "Tablet",
             "manufacturer": "Demo Pharma", "unit_price": 2.5, "reorder_level": 100},
            {"name": "Amoxicillin 250mg", "generic_name": "Amoxicillin",
             "category": "Antibiotic", "strength": "250mg", "dosage_form": "Capsule",
             "manufacturer": "Demo Pharma", "unit_price": 5.0, "reorder_level": 50},
        ]
        new_medicines = 0
        medicines = []
        for data in medicines_data:
            medicine, was_created = Medicine.objects.get_or_create(
                name=data["name"], defaults=data)
            medicines.append(medicine)
            new_medicines += was_created
        summary.append(f"{new_medicines} new medicine(s)")

        today = timezone.localdate()
        new_batches = 0
        for medicine, batch_number in zip(medicines, ("DEMO-B-001", "DEMO-B-002")):
            _, was_created = MedicineBatch.objects.get_or_create(
                medicine=medicine, batch_number=batch_number,
                defaults={"quantity": 500, "purchase_price": 1.5,
                           "selling_price": medicine.unit_price,
                           "expiry_date": today + timedelta(days=365)})
            new_batches += was_created
        summary.append(f"{new_batches} new batch(es)")

        tests_data = [
            {"name": "Complete Blood Count", "code": "DEMO-LT-001",
             "category": "Hematology", "price": 350, "sample_type": "Blood"},
            {"name": "Fasting Blood Sugar", "code": "DEMO-LT-002",
             "category": "Biochemistry", "price": 150, "sample_type": "Blood"},
        ]
        new_tests = 0
        tests = []
        for data in tests_data:
            test, was_created = LabTest.objects.get_or_create(
                code=data["code"], defaults=data)
            tests.append(test)
            new_tests += was_created
        summary.append(f"{new_tests} new lab test(s)")

        lab_order, order_created = LabOrder.objects.get_or_create(
            patient=patient, doctor=doctor, order_date=today,
            defaults={"priority": "Normal", "status": "Pending",
                       "instructions": "Demo order."})
        for test in tests:
            LabOrderItem.objects.get_or_create(lab_order=lab_order, test=test)
        summary.append(f"{1 if order_created else 0} new lab order(s)")

        prescription, rx_created = Prescription.objects.get_or_create(
            patient=patient, doctor=doctor, date=today,
            defaults={"diagnosis": "Demo viral fever",
                       "chief_complaint": "Fever",
                       "follow_up_required": False, "status": "Active"})
        if rx_created:
            PrescriptionItem.objects.create(
                prescription=prescription, medicine=medicines[0],
                medicine_name=medicines[0].name, dosage="1 tablet",
                frequency="Twice daily", duration="5 days", quantity=10,
                instructions="After meals.")
        summary.append(f"{1 if rx_created else 0} new prescription(s)")

        _, disp_created = DispensingRecord.objects.get_or_create(
            prescription=prescription, patient=patient,
            date=today,
            defaults={"status": "Pending", "notes": "Demo dispensing."})
        # (Items are added at dispense time in real flow; seed keeps the
        # record shell so re-runs stay idempotent.)
        summary.append(f"{1 if disp_created else 0} new dispensing record(s)")
        return ", ".join(summary)

    def _seed_phase11(self):
        """Deterministic Phase 11 demo invoices/payments/ledger (idempotent)."""
        from datetime import timedelta
        from decimal import Decimal

        from apps.billing.models import (
            Invoice,
            InvoiceItem,
            InvoiceStatus,
            LedgerType,
            Payment,
            PaymentStatus,
            RevenueTransaction,
        )
        from apps.doctors.models import Doctor
        from apps.patients.models import Patient

        summary = []
        today = timezone.localdate()
        patient = Patient.objects.filter(nid="199005140001").first()
        patient2 = Patient.objects.filter(nid="198511020003").first()
        if patient is None:
            return "skipped (Phase 8 demo data missing)"

        specs = [
            # (invoice_number, patient, service, days_ago, items, payments)
            ("INV-DEMO-0001", patient, "Consultation", 20,
             [("General Consultation", "Consultation", "Consultation", 1, "800.00")],
             [("800.00", 18, "Cash", "CASH-DEMO-1")]),
            ("INV-DEMO-0002", patient, "Laboratory", 10,
             [("Complete Blood Count", "Laboratory", "Laboratory", 1, "350.00"),
              ("Fasting Blood Sugar", "Laboratory", "Laboratory", 1, "150.00")],
             [("200.00", 8, "Mobile Banking", "MB-DEMO-1")]),
            ("INV-DEMO-0003", patient2 or patient, "Pharmacy", 5,
             [("Paracetamol 500mg", "Pharmacy", "Medicine", 10, "2.50")],
             []),
        ]
        new_invoices = new_payments = new_ledger = 0
        for number, owner, service, days_ago, items, payments in specs:
            invoice, inv_created = Invoice.objects.get_or_create(
                invoice_number=number,
                defaults={"patient": owner, "service_type": service,
                           "issue_date": today - timedelta(days=days_ago),
                           "due_date": today - timedelta(days=days_ago - 7),
                           "payment_terms": "Net 7", "status": "Pending"})
            new_invoices += inv_created
            if inv_created:
                for desc, item_type, category, qty, price in items:
                    InvoiceItem.objects.create(
                        invoice=invoice, description=desc, item_type=item_type,
                        category=category, quantity=qty, unit_price=price)
            for amount, paid_ago, method, reference in payments:
                payment, pay_created = Payment.objects.get_or_create(
                    invoice=invoice, reference=reference,
                    defaults={"patient": owner, "amount": amount,
                               "payment_date": today - timedelta(days=paid_ago),
                               "payment_method": method, "status": "Completed"})
                new_payments += pay_created
                if pay_created:
                    RevenueTransaction.objects.get_or_create(
                        payment=payment,
                        defaults={"invoice": invoice, "patient": owner,
                                   "type": {  # service → revenue type
                                       "Consultation": LedgerType.CONSULTATION_REVENUE,
                                       "Laboratory": LedgerType.LABORATORY_REVENUE,
                                       "Pharmacy": LedgerType.PHARMACY_REVENUE,
                                   }.get(service, LedgerType.ADJUSTMENT),
                                   "amount": amount,
                                   "transaction_date": payment.payment_date,
                                   "payment_method": method, "reference": reference,
                                   "description": f"Demo payment {reference} "
                                                  f"for invoice {number}."})
                    new_ledger += 1
            # Recompute status from balances (idempotent: same result every run).
            invoice = Invoice.objects.get(pk=invoice.pk)
            if invoice.due_amount <= 0:
                want = InvoiceStatus.PAID
            elif invoice.paid_amount > 0:
                want = InvoiceStatus.PARTIALLY_PAID
            else:
                want = InvoiceStatus.PENDING
            if invoice.status != want:
                invoice.status = want
                invoice.save(update_fields=["status", "updated_at"])
        summary.append(f"{new_invoices} new invoice(s)")
        summary.append(f"{new_payments} new payment(s)")
        summary.append(f"{new_ledger} new ledger entr{'y' if new_ledger == 1 else 'ies'}")
        return ", ".join(summary)
