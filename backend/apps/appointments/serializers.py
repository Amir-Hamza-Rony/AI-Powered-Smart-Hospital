"""Appointment serializers (Phase 8)."""

from django.utils import timezone
from rest_framework import serializers

from apps.appointments.models import Appointment, AppointmentStatus, AppointmentType


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    doctor_name = serializers.CharField(source="doctor.name", read_only=True)
    specialty = serializers.CharField(source="doctor.specialization", read_only=True)

    class Meta:
        model = Appointment
        fields = (
            "id", "patient", "patient_name", "doctor", "doctor_name", "specialty",
            "date", "time", "type", "status", "reason", "notes",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError("Appointment date cannot be in the past.")
        return value

    def validate(self, attrs):
        # Status transitions apply on update only; creation always starts Pending.
        if self.instance is not None and "status" in attrs:
            current = self.instance.status
            new = attrs["status"]
            if new != current and not Appointment.can_transition(current, new):
                raise serializers.ValidationError(
                    {"status": f"Cannot change status from {current} to {new}."})
        if self.instance is None and "status" in attrs and attrs["status"] != AppointmentStatus.PENDING:
            raise serializers.ValidationError(
                {"status": "New appointments must start as Pending."})
        # Prevent double-booking the same doctor slot (cancelled slots reusable).
        doctor = attrs.get("doctor", getattr(self.instance, "doctor", None))
        date = attrs.get("date", getattr(self.instance, "date", None))
        time = attrs.get("time", getattr(self.instance, "time", None))
        target_status = attrs.get("status", getattr(self.instance, "status", AppointmentStatus.PENDING))
        if doctor is not None and date is not None and time is not None \
                and target_status != AppointmentStatus.CANCELLED:
            conflict = Appointment.objects.filter(
                doctor=doctor, date=date, time=time).exclude(status=AppointmentStatus.CANCELLED)
            if self.instance is not None:
                conflict = conflict.exclude(pk=self.instance.pk)
            if conflict.exists():
                raise serializers.ValidationError(
                    {"non_field_errors": ["This doctor already has an active booking at that date and time."]})
        return attrs

    def create(self, validated_data):
        validated_data.pop("status", None)  # always start Pending
        return super().create(validated_data)
