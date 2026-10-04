"""Patient serializers (Phase 8)."""

from django.utils import timezone
from rest_framework import serializers

from apps.patients.models import BloodGroup, Gender, Patient, PatientStatus


class PatientSerializer(serializers.ModelSerializer):
    name = serializers.CharField(read_only=True)

    class Meta:
        model = Patient
        fields = (
            "id", "name", "first_name", "last_name", "date_of_birth", "gender",
            "blood_group", "phone", "email", "nid", "address",
            "emergency_contact", "emergency_phone", "allergies",
            "chronic_conditions", "medical_history", "notes", "status",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_date_of_birth(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError("Date of birth cannot be in the future.")
        return value

    def validate_nid(self, value):
        if value in (None, ""):
            return None
        value = str(value).strip()
        qs = Patient.objects.filter(nid=value)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A patient with this NID already exists.")
        return value

    def validate_phone(self, value):
        qs = Patient.objects.filter(phone=value)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A patient with this phone number already exists.")
        return value

    def validate(self, attrs):
        for field in ("allergies", "chronic_conditions"):
            if field in attrs and attrs[field] is not None and not isinstance(attrs[field], list):
                raise serializers.ValidationError({field: "Must be a list of strings."})
        return attrs
