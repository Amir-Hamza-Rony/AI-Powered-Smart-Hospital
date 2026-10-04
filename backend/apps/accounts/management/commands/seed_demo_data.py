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
        self.stdout.write(self.style.SUCCESS(
            f"Seed complete: {created} new demo account(s). "
            f"Development password for all demo accounts: {DEV_PASSWORD}"
            + (f" Phase 8 demo data: {phase8}." if phase8 else "")
            + (f" Phase 9 demo data: {phase9}." if phase9 else "")
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
