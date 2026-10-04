"""AI endpoints (Phase 12).

All generations persist an AISession + AIInsight and are decision support
only — never diagnosis, never autonomous prescribing. Physician sign-off
flows through the insight review action.
"""

from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import (
    IsDoctorOrAdmin,
    IsFrontDesk,
    IsMedicalStaff,
    IsStaffUser,
)
from apps.ai.models import AIInsight, AIModule, AIReviewStatus, AISession
from apps.ai.providers import get_provider
from apps.ai.serializers import (
    AIInsightSerializer,
    AISessionSerializer,
    ClinicalAskSerializer,
    ClinicalSummarySerializer,
    InsightReviewSerializer,
    PrescriptionAdvisorySerializer,
    SymptomCheckSerializer,
)
from apps.appointments.models import Appointment
from apps.audit.utils import log_audit
from apps.doctors.models import Doctor
from apps.laboratory.models import LabOrderItem
from apps.patients.models import Patient
from apps.pharmacy.models import DispensingItem
from apps.prescriptions.models import Prescription
from config.drf import error_response, success_response

TriagePermission = IsMedicalStaff | IsFrontDesk


def _record_session(request, module, patient_id, input_data):
    patient = None
    if patient_id is not None:
        try:
            patient = Patient.objects.get(pk=patient_id)
        except Patient.DoesNotExist:
            patient = None
    return AISession.objects.create(
        module=module,
        patient=patient,
        requested_by=request.user if request.user.is_authenticated else None,
        input_data=input_data,
        provider=get_provider().name,
    ), patient


def _record_insight(session, kind, title, content, confidence=None):
    return AIInsight.objects.create(
        session=session, kind=kind, title=title, content=content,
        confidence=confidence, requires_review=True,
        review_status=AIReviewStatus.PENDING_REVIEW)


def _audit_analysis(request, session, description):
    log_audit(request.user, "AI_ANALYSIS_CREATED", "ai", description,
               object_type="AISession", object_id=str(session.id), request=request)


def _patient_record(patient: Patient) -> dict:
    prescriptions = Prescription.objects.filter(
        patient=patient).prefetch_related("items").order_by("-date")[:5]
    labs = LabOrderItem.objects.filter(
        lab_order__patient=patient).select_related("test").order_by("-created_at")[:10]
    medications = []
    for prescription in prescriptions:
        medications.extend(
            item.medicine_name for item in prescription.items.all()
            if item.medicine_name not in medications)
    visits = [
        {"date": str(prescription.date), "type": "Prescription",
         "doctor": prescription.doctor.name,
         "diagnosis": prescription.diagnosis,
         "treatment": ", ".join(item.medicine_name
                                for item in prescription.items.all())}
        for prescription in prescriptions
    ]
    age = None
    if patient.date_of_birth:
        today = timezone.localdate()
        age = (today.year - patient.date_of_birth.year
               - ((today.month, today.day)
                  < (patient.date_of_birth.month, patient.date_of_birth.day)))
    return {
        "name": patient.name, "age": age, "gender": patient.gender,
        "blood_group": patient.blood_group, "status": patient.status,
        "allergies": list(patient.allergies or []),
        "chronic": list(patient.chronic_conditions or []),
        "visits": visits,
        "labs": [{"test": lab.test.name, "date": str(lab.lab_order.order_date),
                  "result": lab.result or "—", "status": lab.status}
                 for lab in labs],
        "medications": medications,
    }


@extend_schema(tags=["ai"], summary="Symptom check / triage (decision support)")
class SymptomCheckView(APIView):
    permission_classes = [TriagePermission]
    serializer_class = SymptomCheckSerializer

    @extend_schema(request=SymptomCheckSerializer)
    def post(self, request):
        serializer = SymptomCheckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        result = get_provider().triage({
            "symptoms": data["symptoms"], "vitals": data.get("vitals") or {}})
        session, _ = _record_session(
            request, AIModule.SYMPTOM_CHECKER, data.get("patient"),
            {"age": data.get("age"), "gender": data.get("gender"),
             "conditions": data.get("conditions"), "allergies": data.get("allergies"),
             "symptoms": data["symptoms"], "vitals": data.get("vitals") or {}})
        insight = _record_insight(
            session, "triage_result",
            f"Triage assessment — {result['level']}", result,
            confidence=result.get("confidence"))
        _audit_analysis(
            request, session,
            f"Symptom assessment generated (triage: {result['level']}).")
        return success_response(
            {**result, "session": str(session.id), "insight": str(insight.id)},
            message="Triage assessment generated.",
            status_code=status.HTTP_201_CREATED)


@extend_schema(tags=["ai"], summary="Clinical summary from the live record")
class ClinicalSummaryView(APIView):
    permission_classes = [IsDoctorOrAdmin]
    serializer_class = ClinicalSummarySerializer

    @extend_schema(request=ClinicalSummarySerializer)
    def post(self, request):
        serializer = ClinicalSummarySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            patient = Patient.objects.get(pk=serializer.validated_data["patient"])
        except Patient.DoesNotExist:
            return error_response("Patient not found.",
                                  status_code=status.HTTP_404_NOT_FOUND)
        summary = get_provider().clinical_summary(_patient_record(patient))
        session, _ = _record_session(
            request, AIModule.CLINICAL_ASSISTANT, patient.pk, {"task": "summary"})
        insight = _record_insight(
            session, "clinical_summary",
            f"Clinical summary — {patient.name}", {"summary": summary})
        _audit_analysis(request, session,
                        f"Clinical summary requested for {patient.name}.")
        return success_response(
            {"summary": summary, "session": str(session.id),
             "insight": str(insight.id)},
            message="Clinical summary generated.",
            status_code=status.HTTP_201_CREATED)


@extend_schema(tags=["ai"], summary="Ask about a patient record (decision support)")
class ClinicalAskView(APIView):
    permission_classes = [IsDoctorOrAdmin]
    serializer_class = ClinicalAskSerializer

    @extend_schema(request=ClinicalAskSerializer)
    def post(self, request):
        serializer = ClinicalAskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            patient = Patient.objects.get(
                pk=serializer.validated_data["patient"])
        except Patient.DoesNotExist:
            return error_response("Patient not found.",
                                  status_code=status.HTTP_404_NOT_FOUND)
        question = serializer.validated_data["question"]
        answer = get_provider().clinical_answer(_patient_record(patient), question)
        session, _ = _record_session(
            request, AIModule.CLINICAL_ASSISTANT, patient.pk, {"question": question})
        insight = _record_insight(
            session, "clinical_answer", "Clinical Q&A",
            {"question": question, "answer": answer})
        _audit_analysis(request, session, "Clinical question answered.")
        return success_response(
            {"answer": answer, "session": str(session.id),
             "insight": str(insight.id)},
            message="Answer generated.",
            status_code=status.HTTP_201_CREATED)


@extend_schema(tags=["ai"], summary="Prescription advisory (physician sign-off required)")
class PrescriptionAdvisoryView(APIView):
    permission_classes = [IsDoctorOrAdmin]
    serializer_class = PrescriptionAdvisorySerializer

    @extend_schema(request=PrescriptionAdvisorySerializer)
    def post(self, request):
        serializer = PrescriptionAdvisorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        patient_payload = {"allergies": []}
        patient_id = data.get("patient")
        patient = None
        if patient_id is not None:
            try:
                patient = Patient.objects.get(pk=patient_id)
                patient_payload = {"allergies": list(patient.allergies or [])}
            except Patient.DoesNotExist:
                return error_response("Patient not found.",
                                      status_code=status.HTTP_404_NOT_FOUND)
        advisory = get_provider().prescription_advisory(
            patient_payload, data.get("diagnosis", ""),
            data.get("current_meds", []), data.get("proposed", []))
        session, _ = _record_session(
            request, AIModule.PRESCRIPTION_ADVISORY, patient_id,
            {"diagnosis": data.get("diagnosis", ""),
             "current_meds": data.get("current_meds", []),
             "proposed": data.get("proposed", [])})
        insight = _record_insight(
            session, "advisory",
            f"Prescription advisory — {advisory['overallSeverity']}", advisory)
        _audit_analysis(request, session, "Prescription advisory generated.")
        return success_response(
            {**advisory, "session": str(session.id), "insight": str(insight.id)},
            message="Advisory generated.",
            status_code=status.HTTP_201_CREATED)


def score_noshow(appointment: Appointment) -> dict:
    """Deterministic attendance-risk score from live appointment data."""
    today = timezone.localdate()
    score = 10
    factors = []
    lead_days = (appointment.date - today).days
    if lead_days > 14:
        score += 25
        factors.append(f"Far-future booking (lead time {lead_days} days)")
    elif lead_days >= 7:
        score += 15
        factors.append(f"Lead time {lead_days} days")
    elif lead_days >= 3:
        score += 5
    appointment_type = appointment.type or ""
    if appointment_type == "Online":
        score += 12
        factors.append("Online visit — historically lower show rate")
    elif appointment_type == "Emergency":
        score -= 20
        factors.append("Post-emergency follow-up (high intent)")
    elif appointment_type == "Follow-up":
        score -= 5
        factors.append("Follow-up visit with established doctor")
    history = Appointment.objects.filter(patient=appointment.patient).exclude(
        status__in=["Pending", "Confirmed"])
    kept = history.filter(status="Completed").count()
    missed = history.filter(status="Cancelled").count()
    total = kept + missed
    if total == 0:
        score += 10
        previous = "New patient"
        factors.append("New patient — no attendance history")
    else:
        missed_rate = missed / total
        score += round(missed_rate * 40)
        previous = f"{kept}/{total} kept"
        if missed:
            factors.append(
                f"{missed} missed appointment(s) in history ({kept} of last {total} kept)")
        else:
            factors.append(f"Good attendance pattern ({kept} of last {total} kept)")
    if appointment.time and appointment.time.hour < 9:
        score += 5
        factors.append("Early-morning slot")
    score = max(5, min(95, score))
    level = "High" if score >= 65 else "Medium" if score >= 35 else "Low"
    return {
        "score": score, "level": level, "previous": previous, "factors": factors,
        "priority": "High" if level == "High" else "Normal" if level == "Medium" else "Low",
    }


@extend_schema(tags=["ai"], summary="No-show predictions from live appointments")
class NoShowPredictionView(APIView):
    permission_classes = [IsStaffUser]
    serializer_class = None

    def get(self, request):
        risk = request.query_params.get("risk")
        search = (request.query_params.get("search") or "").strip().lower()
        upcoming = Appointment.objects.select_related("patient", "doctor").filter(
            date__gte=timezone.localdate(),
            status__in=["Pending", "Confirmed"]).order_by("date", "time")
        predictions = []
        for appointment in upcoming:
            scored = score_noshow(appointment)
            if risk and scored["level"] != risk:
                continue
            predictions.append({
                "id": str(appointment.id),
                "appointmentId": str(appointment.id),
                "patientId": str(appointment.patient_id),
                "patientName": appointment.patient.name,
                "doctorId": str(appointment.doctor_id),
                "doctorName": appointment.doctor.name,
                "specialty": appointment.doctor.specialization,
                "date": str(appointment.date),
                "time": appointment.time.strftime("%I:%M %p") if appointment.time else "",
                "previousAttendance": scored["previous"],
                "riskLevel": scored["level"],
                "riskScore": scored["score"],
                "reminderPriority": scored["priority"],
                "factors": scored["factors"],
            })
        if search:
            predictions = [
                prediction for prediction in predictions
                if search in prediction["patientName"].lower()
                or search in prediction["doctorName"].lower()
                or search in prediction["appointmentId"].lower()
            ]
        return success_response(predictions, message="Predictions computed.")


@extend_schema(tags=["ai"], summary="Health analytics from live hospital data")
class HealthAnalyticsView(APIView):
    permission_classes = [IsStaffUser]
    serializer_class = None

    def get(self, request):
        days = {"today": 1, "7d": 7, "30d": 30, "3m": 90}.get(
            request.query_params.get("range", "7d"), 7)
        today = timezone.localdate()
        start = today - timedelta(days=days - 1)
        in_window = Q(date__gte=start, date__lte=today)

        daily = []
        cursor = start
        while cursor <= today:
            day_appointments = Appointment.objects.filter(date=cursor)
            daily.append({
                "label": cursor.strftime("%b %d"),
                "visits": day_appointments.filter(status="Completed").count(),
                "appointments": day_appointments.count(),
            })
            cursor += timedelta(days=1)

        workload = list(Appointment.objects.filter(
            date__gte=start).values("doctor__specialization").annotate(
            load=Count("id")).order_by("-load")[:6])
        statuses = Appointment.objects.filter(date__gte=start).values(
            "status").annotate(count=Count("id"))
        completion = {row["status"]: row["count"] for row in statuses}
        peak = list(Appointment.objects.filter(date__gte=start).values(
            "time").annotate(volume=Count("id")).order_by("time")[:8])
        conditions = list(Prescription.objects.filter(
            date__gte=start).values("diagnosis").annotate(
            cases=Count("id")).order_by("-cases")[:6])
        dispensed = DispensingItem.objects.filter(
            dispensing__date__gte=start).values(
            "dispensing__date").annotate(dispensed=Count("id")).order_by(
            "dispensing__date")
        abnormal = list(LabOrderItem.objects.filter(
            lab_order__order_date__gte=start,
            status="Abnormal").values("test__name").annotate(
            count=Count("id")).order_by("-count")[:5])
        doctors = list(Doctor.objects.annotate(
            visit_count=Count("appointments",
                              filter=Q(appointments__date__gte=start))).order_by(
            "-visit_count")[:5])
        peak_appointments = max([doctor.visit_count for doctor in doctors] + [1])
        doctor_names = {str(doctor.id): doctor.name for doctor in doctors}
        return success_response({
            "range": {"start": str(start), "end": str(today)},
            "visits": {
                "labels": [row["label"] for row in daily],
                "visits": [row["visits"] for row in daily],
                "appointments": [row["appointments"] for row in daily],
            },
            "departmentWorkload": {
                "labels": [row["doctor__specialization"] or "General" for row in workload],
                "load": [row["load"] for row in workload],
            },
            "completion": {
                "completed": completion.get("Completed", 0),
                "noShow": completion.get("Cancelled", 0),
                "cancelled": completion.get("Cancelled", 0),
                "pending": completion.get("Pending", 0) + completion.get("Confirmed", 0),
            },
            "peakHours": {
                "labels": [row["time"].strftime("%I %p") if row["time"] else "—"
                           for row in peak],
                "volume": [row["volume"] for row in peak],
            },
            "conditionTrends": {
                "labels": [row["diagnosis"] or "Unspecified" for row in conditions],
                "cases": [row["cases"] for row in conditions],
            },
            "pharmacyDemand": {
                "labels": [str(row["dispensing__date"]) for row in dispensed],
                "dispensed": [row["dispensed"] for row in dispensed],
            },
            "labAbnormal": [
                {"indicator": row["test__name"], "count": row["count"]}
                for row in abnormal
            ],
            "doctorUtilization": [
                {"doctor": doctor_names.get(str(doctor.id), "—"),
                 "utilization": round(doctor.visit_count / peak_appointments * 100)}
                for doctor in doctors
            ],
            "disclaimer": ("Operational aggregates from live hospital data. "
                           "Decision support only — not a clinical finding."),
        }, message="Analytics computed.")


@extend_schema(tags=["ai"], summary="AI session history")
class AISessionViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsStaffUser]
    serializer_class = AISessionSerializer

    def get_queryset(self):
        qs = AISession.objects.select_related("patient", "requested_by").all()
        module = self.request.query_params.get("module")
        if module:
            qs = qs.filter(module=module)
        patient = self.request.query_params.get("patient")
        if patient:
            qs = qs.filter(patient__id=patient)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(patient__first_name__icontains=search)
                | Q(patient__last_name__icontains=search))
        return qs


@extend_schema(tags=["ai"], summary="AI insight history + physician review")
class AIInsightViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsStaffUser]
    serializer_class = AIInsightSerializer

    def get_queryset(self):
        qs = AIInsight.objects.select_related(
            "session", "session__patient", "session__requested_by",
            "reviewed_by").all()
        module = self.request.query_params.get("module")
        if module:
            qs = qs.filter(session__module=module)
        review_status = self.request.query_params.get("review_status")
        if review_status:
            qs = qs.filter(review_status=review_status)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(title__icontains=search)
                | Q(session__patient__first_name__icontains=search)
                | Q(session__patient__last_name__icontains=search))
        return qs

    def retrieve(self, request, *args, **kwargs):
        return success_response(
            AIInsightSerializer(self.get_object()).data, message="Insight retrieved.")

    @extend_schema(summary="Physician sign-off on an insight", request=None)
    @action(detail=True, methods=["post"])
    def review(self, request, *args, **kwargs):
        if not IsDoctorOrAdmin().has_permission(request, self):
            return error_response(
                "Doctor or super admin review required.",
                status_code=status.HTTP_403_FORBIDDEN)
        serializer = InsightReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        insight = self.get_object()
        if insight.review_status == "Reviewed":
            return error_response("Insight is already reviewed.",
                                  status_code=status.HTTP_400_BAD_REQUEST)
        insight.review_status = "Reviewed"
        insight.reviewed_by = request.user if request.user.is_authenticated else None
        insight.reviewed_at = timezone.now()
        insight.review_note = serializer.validated_data.get("note", "")
        insight.save(update_fields=["review_status", "reviewed_by",
                                    "reviewed_at", "review_note"])
        log_audit(request.user, "AI_INSIGHT_REVIEWED", "ai",
                   f"Insight reviewed: {insight.title}.",
                   object_type="AIInsight", object_id=str(insight.id), request=request)
        return success_response(AIInsightSerializer(insight).data,
                                message="Insight reviewed.")
