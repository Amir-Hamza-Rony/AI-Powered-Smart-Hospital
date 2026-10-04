"""Patient endpoints (Phase 8)."""

from django.db.models import Q
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsStaffUser
from apps.audit.utils import log_audit
from apps.patients.models import BloodGroup, Gender, Patient, PatientStatus
from apps.patients.serializers import PatientSerializer
from config.drf import success_response


@extend_schema(tags=["patients"], summary="Patient management")
class PatientViewSet(viewsets.ModelViewSet):
    """Staff-managed patient registry with NID/phone deduplication.

    Read: any authenticated user. Write: internal staff only
    (patient self-service portal is a later phase).
    """

    serializer_class = PatientSerializer
    lookup_field = "id"
    lookup_value_regex = "[0-9a-f-]{36}"

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsStaffUser()]

    def get_queryset(self):
        qs = Patient.objects.all()
        gender = self.request.query_params.get("gender")
        if gender in [choice for choice, _ in Gender.choices]:
            qs = qs.filter(gender=gender)
        patient_status = self.request.query_params.get("status")
        if patient_status in [choice for choice, _ in PatientStatus.choices]:
            qs = qs.filter(status=patient_status)
        blood_group = self.request.query_params.get("blood_group")
        if blood_group in [choice for choice, _ in BloodGroup.choices]:
            qs = qs.filter(blood_group=blood_group)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(phone__icontains=search)
                | Q(email__icontains=search)
                | Q(nid__icontains=search)
            )
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        patient = serializer.save()
        log_audit(request.user, "PATIENT_CREATED", "patients",
                   f"Patient registered: {patient.name} ({patient.phone}).",
                   object_type="Patient", object_id=str(patient.id), request=request)
        return success_response(PatientSerializer(patient).data,
                                message="Patient created.", status_code=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        patient = serializer.save()
        log_audit(request.user, "PATIENT_UPDATED", "patients",
                   f"Patient updated: {patient.name} ({patient.phone}).",
                   object_type="Patient", object_id=str(patient.id), request=request)
        return success_response(PatientSerializer(patient).data, message="Patient updated.")

    def perform_destroy(self, instance):
        patient_id = str(instance.id)
        label = f"{instance.name} ({instance.phone})"
        instance.delete()
        log_audit(self.request.user, "PATIENT_DELETED", "patients",
                   f"Patient deleted: {label}.",
                   object_type="Patient", object_id=patient_id, request=self.request)

    def retrieve(self, request, *args, **kwargs):
        return success_response(self.get_serializer(self.get_object()).data, message="Patient retrieved.")
