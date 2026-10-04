"""Doctor endpoints (Phase 8)."""

from django.db.models import Q
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsFrontDesk
from apps.audit.utils import log_audit
from apps.doctors.models import Doctor, DoctorAvailability, DoctorStatus
from apps.doctors.serializers import DoctorSerializer
from config.drf import success_response


@extend_schema(tags=["doctors"], summary="Doctor roster management")
class DoctorViewSet(viewsets.ModelViewSet):
    """Doctor roster: specialization, fees, availability and duty schedules.

    Read: any authenticated user (roster browsing for booking).
    Write: front-desk staff (nurses, receptionists) and super admins.
    """

    serializer_class = DoctorSerializer
    lookup_field = "id"
    lookup_value_regex = "[0-9a-f-]{36}"

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsFrontDesk()]

    def get_queryset(self):
        qs = Doctor.objects.select_related("user").prefetch_related("schedules").all()
        specialization = self.request.query_params.get("specialization")
        if specialization:
            qs = qs.filter(specialization__iexact=specialization)
        department = self.request.query_params.get("department")
        if department:
            qs = qs.filter(department__iexact=department)
        availability = self.request.query_params.get("availability")
        if availability in [choice for choice, _ in DoctorAvailability.choices]:
            qs = qs.filter(availability=availability)
        doctor_status = self.request.query_params.get("status")
        if doctor_status in [choice for choice, _ in DoctorStatus.choices]:
            qs = qs.filter(status=doctor_status)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(specialization__icontains=search)
                | Q(registration_no__icontains=search)
            )
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        doctor = serializer.save()
        log_audit(request.user, "DOCTOR_CREATED", "doctors",
                   f"Doctor added: {doctor.name} ({doctor.specialization}).",
                   object_type="Doctor", object_id=str(doctor.id), request=request)
        return success_response(DoctorSerializer(doctor).data,
                                message="Doctor created.", status_code=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        doctor = serializer.save()
        log_audit(request.user, "DOCTOR_UPDATED", "doctors",
                   f"Doctor updated: {doctor.name} ({doctor.specialization}).",
                   object_type="Doctor", object_id=str(doctor.id), request=request)
        return success_response(DoctorSerializer(doctor).data, message="Doctor updated.")

    def perform_destroy(self, instance):
        doctor_id = str(instance.id)
        label = f"{instance.name} ({instance.specialization})"
        instance.delete()
        log_audit(self.request.user, "DOCTOR_DELETED", "doctors",
                   f"Doctor removed: {label}.",
                   object_type="Doctor", object_id=doctor_id, request=self.request)

    def retrieve(self, request, *args, **kwargs):
        return success_response(self.get_serializer(self.get_object()).data, message="Doctor retrieved.")
