"""AI module tests: triage, clinical Q&A, advisory, predictions, analytics, review."""

from datetime import time, timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.ai.models import AIInsight, AISession
from apps.appointments.models import Appointment
from apps.audit.models import AuditLog
from apps.doctors.models import Doctor
from apps.patients.models import Patient


def make_user(email, role, staff=False, superuser=False):
    return User.objects.create_user(
        email=email, password="StrongPass123", first_name="Test",
        last_name="User", role=role, is_staff=staff, is_superuser=superuser)


def make_patient(phone="+8801719000001", nid="198501010051"):
    return Patient.objects.create(
        first_name="Test", last_name="Patient", date_of_birth="1990-01-01",
        gender="Male", phone=phone, nid=nid,
        emergency_contact="Kin", emergency_phone="+8801719000002")


def make_doctor(reg="BMDC-A-91001"):
    return Doctor.objects.create(
        first_name="Doc", last_name="Tor", specialization="General Medicine",
        registration_no=reg, phone="+8801719000011")


class AiApiTests(APITestCase):
    def setUp(self):
        self.admin = make_user("admin@example.com", Role.SUPER_ADMIN, staff=True, superuser=True)
        self.doctor_user = make_user("doctor@example.com", Role.DOCTOR, staff=True)
        self.nurse = make_user("nurse@example.com", Role.NURSE)
        self.receptionist = make_user("recep@example.com", Role.RECEPTIONIST)
        self.patient_user = make_user("patient@example.com", Role.PATIENT)
        self.patient = make_patient()
        self.doctor = make_doctor()

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def _triage_payload(self, **overrides):
        data = {
            "patient": str(self.patient.id), "age": 36, "gender": "Male",
            "conditions": ["Hypertension"], "allergies": [],
            "symptoms": [{"name": "Fever", "category": "General",
                          "severity": "Moderate", "duration": "2 days"}],
            "vitals": {"temperature": "101.2"},
        }
        data.update(overrides)
        return data

    # -- symptom checker -------------------------------------------------
    def test_unauthenticated_blocked(self):
        self.assertEqual(
            self.client.post(reverse("ai-symptom-check"), self._triage_payload(),
                             format="json").status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patient_role_blocked_from_triage(self):
        self._auth(self.patient_user)
        self.assertEqual(
            self.client.post(reverse("ai-symptom-check"), self._triage_payload(),
                             format="json").status_code, status.HTTP_403_FORBIDDEN)

    def test_triage_moderate_and_persisted(self):
        self._auth(self.nurse)
        response = self.client.post(
            reverse("ai-symptom-check"), self._triage_payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        body = response.json()["data"]
        self.assertEqual(body["level"], "Moderate")
        self.assertIn("disclaimer", body)
        self.assertIn("decision support", body["disclaimer"].lower())
        self.assertTrue(AISession.objects.filter(pk=body["session"]).exists())
        self.assertTrue(AIInsight.objects.filter(pk=body["insight"]).exists())
        self.assertTrue(AuditLog.objects.filter(action="AI_ANALYSIS_CREATED").exists())

    def test_triage_emergency_red_flags(self):
        self._auth(self.nurse)
        response = self.client.post(reverse("ai-symptom-check"), self._triage_payload(
            symptoms=[{"name": "Chest pain", "severity": "Severe"},
                      {"name": "Shortness of breath", "severity": "Severe"}],
            vitals={"oxygenSaturation": "91"}), format="json")
        body = response.json()["data"]
        self.assertEqual(body["level"], "Emergency")
        self.assertIn("Emergency", body["nextAction"])

    def test_triage_requires_symptoms(self):
        self._auth(self.nurse)
        response = self.client.post(
            reverse("ai-symptom-check"), self._triage_payload(symptoms=[]), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # -- clinical assistant ----------------------------------------------
    def test_clinical_summary_grounded_in_record(self):
        self._auth(self.doctor_user)
        response = self.client.post(
            reverse("ai-clinical-summary"), {"patient": str(self.patient.id)}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("Test Patient", response.json()["data"]["summary"])

    def test_clinical_ask_and_unknown_patient(self):
        self._auth(self.doctor_user)
        response = self.client.post(reverse("ai-clinical-ask"), {
            "patient": str(self.patient.id),
            "question": "What are the recent abnormal lab results?"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("abnormal lab results", response.json()["data"]["answer"].lower())
        response = self.client.post(reverse("ai-clinical-ask"), {
            "patient": "00000000-0000-0000-0000-000000000000",
            "question": "Summarize."}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_nurse_cannot_use_clinical_assistant(self):
        self._auth(self.nurse)
        self.assertEqual(self.client.post(
            reverse("ai-clinical-summary"), {"patient": str(self.patient.id)},
            format="json").status_code, status.HTTP_403_FORBIDDEN)

    # -- prescription advisory --------------------------------------------
    def test_advisory_flags_allergy_and_duplicate(self):
        self.patient.allergies = ["Penicillin"]
        self.patient.save(update_fields=["allergies"])
        self._auth(self.doctor_user)
        response = self.client.post(reverse("ai-prescription-advisory"), {
            "patient": str(self.patient.id), "diagnosis": "Throat infection",
            "current_meds": ["Paracetamol 500mg"],
            "proposed": [
                {"medicine": "Penicillin 250mg", "dose": "1 cap",
                 "frequency": "Twice daily", "duration": "5 days"},
                {"medicine": "Paracetamol 500mg", "dose": "1 tab",
                 "frequency": "Twice daily", "duration": "5 days"},
            ]}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        body = response.json()["data"]
        categories = [finding["category"] for finding in body["findings"]]
        self.assertIn("Allergy warning", categories)
        self.assertIn("Duplicate medication", categories)
        self.assertEqual(body["overallSeverity"], "High Attention")

    def test_advisory_requires_signoff_note(self):
        self._auth(self.doctor_user)
        body = self.client.post(reverse("ai-prescription-advisory"), {
            "diagnosis": "Fever",
            "proposed": [{"medicine": "Paracetamol", "dose": "1 tab",
                           "frequency": "Twice daily", "duration": "3 days"}]},
            format="json").json()["data"]
        self.assertIn("physician", body["summary"].lower())

    # -- no-show predictions -----------------------------------------------
    def test_noshow_predictions_from_live_appointments(self):
        Appointment.objects.create(
            patient=self.patient, doctor=self.doctor,
            date=timezone.localdate() + timedelta(days=20), time=time(11, 0),
            type="Online", status="Pending", reason="Checkup.")
        self._auth(self.receptionist)
        response = self.client.get(reverse("ai-noshow-predictions"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        predictions = response.json()["data"]
        self.assertEqual(len(predictions), 1)
        self.assertIn(predictions[0]["riskLevel"], ("High", "Medium", "Low"))
        self.assertTrue(predictions[0]["factors"])
        filtered = self.client.get(
            reverse("ai-noshow-predictions"), {"risk": predictions[0]["riskLevel"]})
        self.assertEqual(len(filtered.json()["data"]), 1)
        self.assertEqual(self.client.get(
            reverse("ai-noshow-predictions"), {"risk": "Low" if
            predictions[0]["riskLevel"] != "Low" else "High"}).json()["data"], [])

    # -- analytics -----------------------------------------------------------
    def test_analytics_computed(self):
        Appointment.objects.create(
            patient=self.patient, doctor=self.doctor,
            date=timezone.localdate(), time=time(10, 0),
            type="In-person", status="Completed", reason="Checkup.")
        self._auth(self.receptionist)
        response = self.client.get(reverse("ai-analytics"), {"range": "7d"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()["data"]
        for key in ("visits", "departmentWorkload", "completion", "peakHours",
                    "conditionTrends", "pharmacyDemand", "labAbnormal",
                    "doctorUtilization", "disclaimer"):
            self.assertIn(key, body)

    # -- sessions / insights / review -----------------------------------------
    def test_insight_history_and_review_flow(self):
        self._auth(self.nurse)
        insight_id = self.client.post(
            reverse("ai-symptom-check"), self._triage_payload(),
            format="json").json()["data"]["insight"]
        self._auth(self.receptionist)
        listing = self.client.get(reverse("ai-insights-list"))
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertTrue(any(row["id"] == insight_id
                            for row in listing.json()["results"]))
        # Non-doctor cannot sign off.
        self.assertEqual(self.client.post(
            reverse("ai-insights-review", args=[insight_id]), {},
            format="json").status_code, status.HTTP_403_FORBIDDEN)
        self._auth(self.doctor_user)
        reviewed = self.client.post(
            reverse("ai-insights-review", args=[insight_id]),
            {"note": "Reviewed — matches bedside assessment."}, format="json")
        self.assertEqual(reviewed.status_code, status.HTTP_200_OK)
        self.assertEqual(reviewed.json()["data"]["review_status"], "Reviewed")
        self.assertTrue(AIInsight.objects.filter(
            pk=insight_id, review_status="Reviewed").exists())
        self.assertTrue(AuditLog.objects.filter(action="AI_INSIGHT_REVIEWED").exists())
        # Double review blocked.
        self.assertEqual(self.client.post(
            reverse("ai-insights-review", args=[insight_id]), {},
            format="json").status_code, status.HTTP_400_BAD_REQUEST)

    def test_sessions_filterable(self):
        self._auth(self.nurse)
        self.client.post(reverse("ai-symptom-check"), self._triage_payload(), format="json")
        response = self.client.get(
            reverse("ai-sessions-list"), {"module": "Symptom Checker"})
        self.assertEqual(len(response.json()["results"]), 1)
