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
        self.stdout.write(self.style.SUCCESS(
            f"Seed complete: {created} new demo account(s). "
            f"Development password for all demo accounts: {DEV_PASSWORD}"
            + (f" Phase 8 demo data: {phase8}." if phase8 else "")
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
