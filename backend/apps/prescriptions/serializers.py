"""Prescription serializers (Phase 9)."""

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.prescriptions.models import Prescription, PrescriptionItem, PrescriptionStatus


class PrescriptionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrescriptionItem
        fields = (
            "id", "medicine", "medicine_name", "strength", "dosage",
            "frequency", "duration", "route", "quantity",
            "instructions", "notes",
        )
        read_only_fields = ("id",)


class PrescriptionSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    doctor_name = serializers.CharField(source="doctor.name", read_only=True)
    items = PrescriptionItemSerializer(many=True)

    class Meta:
        model = Prescription
        fields = (
            "id", "patient", "patient_name", "doctor", "doctor_name",
            "appointment", "date", "chief_complaint", "diagnosis", "symptoms",
            "clinical_notes", "follow_up_required", "follow_up_date",
            "follow_up_instructions", "status", "items",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_date(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError("Prescription date cannot be in the future.")
        return value

    def validate(self, attrs):
        follow_up_required = attrs.get(
            "follow_up_required",
            getattr(self.instance, "follow_up_required", False),
        )
        follow_up_date = attrs.get(
            "follow_up_date",
            getattr(self.instance, "follow_up_date", None),
        )
        if follow_up_required and not follow_up_date:
            raise serializers.ValidationError(
                {"follow_up_date": "Follow-up date is required when follow-up is required."})
        if self.instance is not None and "status" in attrs:
            current = self.instance.status
            new = attrs["status"]
            if new != current and not Prescription.can_transition(current, new):
                raise serializers.ValidationError(
                    {"status": f"Cannot change status from {current} to {new}."})
        return attrs

    def _check_editable(self):
        if self.instance is not None and self.instance.status != PrescriptionStatus.ACTIVE:
            raise serializers.ValidationError(
                "Cannot modify a Completed/Cancelled prescription.")

    def _create_items(self, prescription, items_data):
        if not items_data:
            raise serializers.ValidationError(
                {"items": "At least one prescription item is required."})
        for entry in items_data:
            PrescriptionItem.objects.create(prescription=prescription, **entry)

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        validated_data.pop("status", None)  # always start Active
        prescription = super().create(validated_data)
        self._create_items(prescription, items_data)
        return prescription

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        if validated_data or items_data is not None:
            self._check_editable()
        prescription = super().update(instance, validated_data)
        if items_data is not None:
            if not items_data:
                raise serializers.ValidationError(
                    {"items": "At least one prescription item is required."})
            prescription.items.all().delete()
            self._create_items(prescription, items_data)
        return prescription
