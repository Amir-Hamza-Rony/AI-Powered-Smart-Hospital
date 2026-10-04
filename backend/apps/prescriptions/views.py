"""Prescription endpoints (Phase 9)."""

from django.db.models import Q
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsDoctorOrAdmin
from apps.audit.utils import log_audit
from apps.prescriptions.models import Prescription, PrescriptionStatus
from apps.prescriptions.serializers import PrescriptionSerializer
from config.drf import success_response


@extend_schema(tags=["prescriptions"], summary="Prescription management")
class PrescriptionViewSet(viewsets.ModelViewSet):
    """Clinical prescriptions with medicine items.

    Active → Completed/Cancelled; Completed/Cancelled are terminal and
    immutable. Read: any authenticated user. Write: doctors and super
    admins (patient self-service portal is a later phase).
    """

    serializer_class = PrescriptionSerializer
    lookup_field = "id"
    lookup_value_regex = "[0-9a-f-]{36}"

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsDoctorOrAdmin()]

    def get_queryset(self):
        qs = Prescription.objects.select_related(
            "patient", "doctor").prefetch_related("items").all()
        patient = self.request.query_params.get("patient")
        if patient:
            qs = qs.filter(patient__id=patient)
        doctor = self.request.query_params.get("doctor")
        if doctor:
            qs = qs.filter(doctor__id=doctor)
        prescription_status = self.request.query_params.get("status")
        if prescription_status in [choice for choice, _ in PrescriptionStatus.choices]:
            qs = qs.filter(status=prescription_status)
        date = self.request.query_params.get("date")
        if date:
            qs = qs.filter(date=date)
        date_from = self.request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(date__gte=date_from)
        date_to = self.request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(date__lte=date_to)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(patient__first_name__icontains=search)
                | Q(patient__last_name__icontains=search)
                | Q(doctor__first_name__icontains=search)
                | Q(doctor__last_name__icontains=search)
                | Q(diagnosis__icontains=search)
            )
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        prescription = serializer.save()
        log_audit(request.user, "PRESCRIPTION_CREATED", "prescriptions",
                   f"Prescription issued: {prescription.patient.name} by {prescription.doctor.name} "
                   f"on {prescription.date}.",
                   object_type="Prescription", object_id=str(prescription.id), request=request)
        return success_response(PrescriptionSerializer(prescription).data,
                                message="Prescription created.",
                                status_code=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        old_status = instance.status
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        prescription = serializer.save()
        if prescription.status != old_status:
            log_audit(request.user, "PRESCRIPTION_UPDATED", "prescriptions",
                       f"Prescription {old_status} → {prescription.status}: "
                       f"{prescription.patient.name} by {prescription.doctor.name}.",
                       object_type="Prescription", object_id=str(prescription.id), request=request)
        else:
            log_audit(request.user, "PRESCRIPTION_UPDATED", "prescriptions",
                       f"Prescription updated: {prescription.patient.name} "
                       f"by {prescription.doctor.name} on {prescription.date}.",
                       object_type="Prescription", object_id=str(prescription.id), request=request)
        return success_response(PrescriptionSerializer(prescription).data,
                                message="Prescription updated.")

    def perform_destroy(self, instance):
        prescription_id = str(instance.id)
        label = f"{instance.patient.name} by {instance.doctor.name} on {instance.date}"
        instance.delete()
        log_audit(self.request.user, "PRESCRIPTION_DELETED", "prescriptions",
                   f"Prescription deleted: {label}.",
                   object_type="Prescription", object_id=prescription_id, request=self.request)

    def retrieve(self, request, *args, **kwargs):
        return success_response(self.get_serializer(self.get_object()).data,
                                message="Prescription retrieved.")
