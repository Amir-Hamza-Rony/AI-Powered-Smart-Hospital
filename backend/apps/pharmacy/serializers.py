"""Pharmacy serializers (Phase 9)."""

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.pharmacy.models import (
    DispensingItem,
    DispensingRecord,
    DispensingStatus,
    Medicine,
    MedicineBatch,
)


class MedicineSerializer(serializers.ModelSerializer):
    current_stock = serializers.IntegerField(read_only=True)
    available_stock = serializers.IntegerField(read_only=True)
    expired_stock = serializers.IntegerField(read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    has_near_expiry = serializers.BooleanField(read_only=True)
    stock_status = serializers.CharField(read_only=True)

    class Meta:
        model = Medicine
        fields = (
            "id", "name", "generic_name", "brand_name", "category",
            "strength", "dosage_form", "manufacturer",
            "prescription_required", "unit_price", "reorder_level",
            "is_active", "current_stock", "available_stock",
            "expired_stock", "is_low_stock", "has_near_expiry",
            "stock_status", "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "current_stock", "available_stock", "expired_stock",
            "is_low_stock", "has_near_expiry", "stock_status",
            "created_at", "updated_at",
        )


class MedicineBatchSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    is_near_expiry = serializers.BooleanField(read_only=True)

    class Meta:
        model = MedicineBatch
        fields = (
            "id", "medicine", "medicine_name", "batch_number", "quantity",
            "purchase_price", "selling_price", "manufacture_date",
            "expiry_date", "is_expired", "is_near_expiry",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "is_expired", "is_near_expiry", "created_at", "updated_at")

    def validate(self, attrs):
        manufacture = attrs.get(
            "manufacture_date", getattr(self.instance, "manufacture_date", None))
        expiry = attrs.get(
            "expiry_date", getattr(self.instance, "expiry_date", None))
        if manufacture is not None and expiry is not None and manufacture > expiry:
            raise serializers.ValidationError(
                {"expiry_date": "Expiry date cannot be before the manufacture date."})
        return attrs


class DispensingItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    batch_number = serializers.CharField(source="batch.batch_number", read_only=True)
    remaining = serializers.IntegerField(read_only=True)

    class Meta:
        model = DispensingItem
        fields = (
            "id", "medicine", "medicine_name", "batch", "batch_number",
            "quantity", "dispensed_quantity", "remaining", "unit_price",
        )
        read_only_fields = ("id", "dispensed_quantity", "remaining")


class DispenseLineSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1)


class DispenseRequestSerializer(serializers.Serializer):
    items = DispenseLineSerializer(many=True, required=False)


class DispensingRecordSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    items = DispensingItemSerializer(many=True)

    class Meta:
        model = DispensingRecord
        fields = (
            "id", "prescription", "patient", "patient_name", "dispensed_by",
            "date", "status", "notes", "items", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_date(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError("Dispensing date cannot be in the future.")
        return value

    def validate(self, attrs):
        prescription = attrs.get("prescription", getattr(self.instance, "prescription", None))
        patient = attrs.get("patient", getattr(self.instance, "patient", None))
        if prescription is not None and patient is not None \
                and prescription.patient_id != patient.pk:
            raise serializers.ValidationError(
                {"patient": "Patient must match the prescription's patient."})
        if self.instance is not None and "status" in attrs:
            current = self.instance.status
            new = attrs["status"]
            if new != current and not DispensingRecord.can_transition(current, new):
                raise serializers.ValidationError(
                    {"status": f"Cannot change status from {current} to {new}."})
        return attrs

    def _create_items(self, dispensing, items_data):
        if not items_data:
            raise serializers.ValidationError(
                {"items": "At least one dispensing item is required."})
        for entry in items_data:
            batch = entry.get("batch")
            medicine = entry.get("medicine")
            medicine_pk = getattr(medicine, "pk", medicine)
            if batch is not None and batch.medicine_id != medicine_pk:
                raise serializers.ValidationError(
                    {"items": "Batch must belong to the item's medicine."})
            DispensingItem.objects.create(dispensing=dispensing, **entry)

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        validated_data.pop("status", None)  # always start Pending
        dispensing = super().create(validated_data)
        self._create_items(dispensing, items_data)
        return dispensing

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        if instance.status != DispensingStatus.PENDING:
            if items_data is not None or validated_data:
                raise serializers.ValidationError(
                    "Only Pending dispensing records can be modified.")
        dispensing = super().update(instance, validated_data)
        if items_data is not None:
            if not items_data:
                raise serializers.ValidationError(
                    {"items": "At least one dispensing item is required."})
            dispensing.items.all().delete()
            # Reset progress when lines are replaced while still Pending.
            self._create_items(dispensing, items_data)
        return dispensing
