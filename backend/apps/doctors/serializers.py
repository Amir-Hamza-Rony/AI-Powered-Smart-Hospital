"""Doctor serializers (Phase 8)."""

from rest_framework import serializers

from apps.accounts.models import Role, User
from apps.doctors.models import Doctor, DoctorAvailability, DoctorSchedule, DoctorStatus, Weekday


class DoctorScheduleSerializer(serializers.ModelSerializer):
    day_display = serializers.CharField(source="get_day_display", read_only=True)

    class Meta:
        model = DoctorSchedule
        fields = ("id", "day", "day_display", "is_available", "slots")
        read_only_fields = ("id", "day_display")

    def validate_slots(self, value):
        if value is not None and not isinstance(value, list):
            raise serializers.ValidationError("Slots must be a list of strings.")
        return value


class DoctorSerializer(serializers.ModelSerializer):
    name = serializers.CharField(read_only=True)
    schedules = DoctorScheduleSerializer(many=True, required=False)

    class Meta:
        model = Doctor
        fields = (
            "id", "name", "first_name", "last_name", "user", "specialization",
            "qualification", "experience_years", "registration_no", "phone",
            "email", "department", "room", "consultation_fee", "availability",
            "status", "schedules", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_user(self, value):
        if value is not None and value.role != Role.DOCTOR:
            raise serializers.ValidationError("Linked user must have the DOCTOR role.")
        if value is not None:
            qs = Doctor.objects.filter(user=value)
            if self.instance is not None:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("This user is already linked to a doctor profile.")
        return value

    def validate_registration_no(self, value):
        qs = Doctor.objects.filter(registration_no=value)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A doctor with this registration number already exists.")
        return value

    def _save_schedules(self, doctor, schedules_data):
        seen = set()
        for entry in schedules_data or []:
            day = entry.get("day")
            if day in seen:
                raise serializers.ValidationError({"schedules": "Duplicate day in schedule."})
            seen.add(day)
            DoctorSchedule.objects.update_or_create(
                doctor=doctor, day=day,
                defaults={
                    "is_available": entry.get("is_available", True),
                    "slots": entry.get("slots", []),
                },
            )

    def create(self, validated_data):
        schedules_data = validated_data.pop("schedules", [])
        doctor = super().create(validated_data)
        self._save_schedules(doctor, schedules_data)
        return doctor

    def update(self, instance, validated_data):
        schedules_data = validated_data.pop("schedules", None)
        doctor = super().update(instance, validated_data)
        if schedules_data is not None:
            self._save_schedules(doctor, schedules_data)
        return doctor
