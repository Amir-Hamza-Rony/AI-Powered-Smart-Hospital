"""Laboratory serializers (Phase 9)."""

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.laboratory.models import (
    LabOrder,
    LabOrderItem,
    LabOrderStatus,
    LabPriority,
    LabResultStatus,
    LabTest,
    LabTestStatus,
)


class LabTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTest
        fields = (
            "id", "name", "code", "category", "description", "price",
            "sample_type", "turnaround_time", "preparation", "status",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_code(self, value):
        qs = LabTest.objects.filter(code=value)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A lab test with this code already exists.")
        return value


class LabOrderItemSerializer(serializers.ModelSerializer):
    test_name = serializers.CharField(source="test.name", read_only=True)
    test_code = serializers.CharField(source="test.code", read_only=True)

    class Meta:
        model = LabOrderItem
        fields = (
            "id", "test", "test_name", "test_code", "result", "unit",
            "reference_range", "result_notes", "status",
        )
        read_only_fields = ("id", "test_name", "test_code")


class LabOrderSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    doctor_name = serializers.CharField(source="doctor.name", read_only=True)
    items = LabOrderItemSerializer(many=True)

    class Meta:
        model = LabOrder
        fields = (
            "id", "patient", "patient_name", "doctor", "doctor_name",
            "appointment", "order_date", "priority", "status",
            "instructions", "notes", "report_reference", "items",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_order_date(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError("Order date cannot be in the future.")
        return value

    def validate(self, attrs):
        if self.instance is not None and "status" in attrs:
            current = self.instance.status
            new = attrs["status"]
            if new != current and not LabOrder.can_transition(current, new):
                raise serializers.ValidationError(
                    {"status": f"Cannot change status from {current} to {new}."})
        return attrs

    def _check_items_editable(self):
        if self.instance is not None and self.instance.status != LabOrderStatus.PENDING:
            raise serializers.ValidationError(
                "Order items can only be changed while the order is Pending.")

    def _create_items(self, lab_order, items_data):
        if not items_data:
            raise serializers.ValidationError(
                {"items": "At least one test is required."})
        seen = set()
        for entry in items_data:
            test = entry.get("test")
            test_id = str(test.pk if hasattr(test, "pk") else test)
            if test_id in seen:
                raise serializers.ValidationError(
                    {"items": "Duplicate test in order."})
            seen.add(test_id)
            LabOrderItem.objects.create(lab_order=lab_order, **entry)

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        validated_data.pop("status", None)  # always start Pending
        lab_order = super().create(validated_data)
        self._create_items(lab_order, items_data)
        return lab_order

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        if items_data is not None:
            self._check_items_editable()
        lab_order = super().update(instance, validated_data)
        if items_data is not None:
            if not items_data:
                raise serializers.ValidationError(
                    {"items": "At least one test is required."})
            lab_order.items.all().delete()
            self._create_items(lab_order, items_data)
        return lab_order


class LabResultUpdateSerializer(serializers.Serializer):
    """Enter/update results for the tests of one order."""

    items = serializers.ListField(child=serializers.DictField(), min_length=1)

    def validate_items(self, value):
        for entry in value:
            if "test" not in entry and "item" not in entry:
                raise serializers.ValidationError(
                    "Each entry must reference 'test' or 'item'.")
            if entry.get("status", LabResultStatus.NORMAL) not in [
                    choice for choice, _ in LabResultStatus.choices]:
                raise serializers.ValidationError(
                    f"Invalid result status: {entry.get('status')}.")
        return value
