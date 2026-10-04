"""Appointment endpoints (Phase 8)."""

from django.db.models import Q
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsStaffUser
from apps.appointments.models import Appointment, AppointmentStatus
from apps.appointments.serializers import AppointmentSerializer
from apps.audit.utils import log_audit
from config.drf import error_response, success_response


@extend_schema(tags=["appointments"], summary="Appointment management")
class AppointmentViewSet(viewsets.ModelViewSet):
    """Patient–doctor bookings with validated status transitions.

    Pending → Confirmed → Completed, cancellation from Pending/Confirmed.
    Completed/Cancelled are terminal.

    Read: any authenticated user. Write: internal staff only
    (patient self-booking portal is a later phase).
    """

    serializer_class = AppointmentSerializer
    lookup_field = "id"
    lookup_value_regex = "[0-9a-f-]{36}"

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsStaffUser()]

    def get_queryset(self):
        qs = Appointment.objects.select_related("patient", "doctor").all()
        patient = self.request.query_params.get("patient")
        if patient:
            qs = qs.filter(patient__id=patient)
        doctor = self.request.query_params.get("doctor")
        if doctor:
            qs = qs.filter(doctor__id=doctor)
        appointment_status = self.request.query_params.get("status")
        if appointment_status in [choice for choice, _ in AppointmentStatus.choices]:
            qs = qs.filter(status=appointment_status)
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
                | Q(reason__icontains=search)
            )
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        appointment = serializer.save()
        log_audit(request.user, "APPOINTMENT_CREATED", "appointments",
                   f"Appointment booked: {appointment.patient.name} with {appointment.doctor.name} "
                   f"on {appointment.date} {appointment.time}.",
                   object_type="Appointment", object_id=str(appointment.id), request=request)
        return success_response(AppointmentSerializer(appointment).data,
                                message="Appointment created.",
                                status_code=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        old_status = instance.status
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        appointment = serializer.save()
        if appointment.status != old_status:
            log_audit(request.user, "APPOINTMENT_UPDATED", "appointments",
                       f"Appointment {old_status} → {appointment.status}: {appointment.patient.name} "
                       f"with {appointment.doctor.name} on {appointment.date}.",
                       object_type="Appointment", object_id=str(appointment.id), request=request)
        else:
            log_audit(request.user, "APPOINTMENT_UPDATED", "appointments",
                       f"Appointment updated: {appointment.patient.name} "
                       f"with {appointment.doctor.name} on {appointment.date}.",
                       object_type="Appointment", object_id=str(appointment.id), request=request)
        return success_response(AppointmentSerializer(appointment).data, message="Appointment updated.")

    def perform_destroy(self, instance):
        appointment_id = str(instance.id)
        label = f"{instance.patient.name} with {instance.doctor.name} on {instance.date}"
        instance.delete()
        log_audit(self.request.user, "APPOINTMENT_UPDATED", "appointments",
                   f"Appointment deleted: {label}.",
                   object_type="Appointment", object_id=appointment_id, request=self.request)

    def retrieve(self, request, *args, **kwargs):
        return success_response(self.get_serializer(self.get_object()).data,
                                message="Appointment retrieved.")

    def _transition(self, request, target):
        appointment = self.get_object()
        if not Appointment.can_transition(appointment.status, target):
            return error_response(
                f"Cannot change status from {appointment.status} to {target}.",
                status_code=status.HTTP_400_BAD_REQUEST)
        appointment.status = target
        appointment.save(update_fields=["status", "updated_at"])
        log_audit(request.user, "APPOINTMENT_UPDATED", "appointments",
                   f"Appointment {target.lower()}: {appointment.patient.name} "
                   f"with {appointment.doctor.name} on {appointment.date}.",
                   object_type="Appointment", object_id=str(appointment.id), request=request)
        return success_response(AppointmentSerializer(appointment).data,
                                message=f"Appointment {target.lower()}.")

    @extend_schema(summary="Confirm a pending appointment", request=None)
    @action(detail=True, methods=["post"])
    def confirm(self, request, *args, **kwargs):
        return self._transition(request, AppointmentStatus.CONFIRMED)

    @extend_schema(summary="Mark a confirmed appointment completed", request=None)
    @action(detail=True, methods=["post"])
    def complete(self, request, *args, **kwargs):
        return self._transition(request, AppointmentStatus.COMPLETED)

    @extend_schema(summary="Cancel a pending/confirmed appointment", request=None)
    @action(detail=True, methods=["post"])
    def cancel(self, request, *args, **kwargs):
        return self._transition(request, AppointmentStatus.CANCELLED)
