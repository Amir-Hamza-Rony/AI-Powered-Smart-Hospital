"""Billing serializers (Phase 11).

All money is Decimal and derived server-side. Clients can never set
paid/due/total/status directly — those are read-only and computed.
"""

from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.billing.models import (
    BillingCategory,
    Invoice,
    InvoiceItem,
    InvoiceStatus,
    Payment,
    PaymentMethod,
    PaymentStatus,
    RevenueTransaction,
    ServiceType,
    generate_invoice_number,
)


class InvoiceItemSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = InvoiceItem
        fields = (
            "id", "description", "item_type", "category", "quantity",
            "unit_price", "discount", "tax", "line_total",
        )
        read_only_fields = ("id", "line_total")


class InvoiceSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    patient_phone = serializers.CharField(source="patient.phone", read_only=True)
    items = InvoiceItemSerializer(many=True)
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    paid_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    due_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Invoice
        fields = (
            "id", "invoice_number", "patient", "patient_name", "patient_phone",
            "appointment", "service_type", "issue_date", "due_date",
            "payment_terms", "discount", "tax", "status", "notes",
            "subtotal", "total", "paid_amount", "due_amount", "is_overdue",
            "items", "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "invoice_number", "status", "subtotal", "total",
            "paid_amount", "due_amount", "is_overdue", "created_at", "updated_at",
        )

    def validate(self, attrs):
        issue = attrs.get("issue_date", getattr(self.instance, "issue_date", None))
        due = attrs.get("due_date", getattr(self.instance, "due_date", None))
        if issue is not None and due is not None and due < issue:
            raise serializers.ValidationError(
                {"due_date": "Due date cannot be before the issue date."})
        appointment = attrs.get(
            "appointment", getattr(self.instance, "appointment", None))
        patient = attrs.get("patient", getattr(self.instance, "patient", None))
        if appointment is not None and patient is not None \
                and appointment.patient_id != patient.pk:
            raise serializers.ValidationError(
                {"appointment": "Appointment must belong to the invoice patient."})
        return attrs

    def _create_items(self, invoice, items_data):
        if not items_data:
            raise serializers.ValidationError(
                {"items": "At least one billable item is required."})
        for entry in items_data:
            InvoiceItem.objects.create(invoice=invoice, **entry)

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        validated_data["invoice_number"] = generate_invoice_number()
        invoice = super().create(validated_data)
        self._create_items(invoice, items_data)
        return invoice

    @transaction.atomic
    def update(self, instance, validated_data):
        if instance.status != InvoiceStatus.DRAFT:
            raise serializers.ValidationError(
                "Only Draft invoices can be edited. Issue or cancel instead.")
        if instance.payments.exists():
            raise serializers.ValidationError(
                "Invoices with payments cannot be edited.")
        items_data = validated_data.pop("items", None)
        invoice = super().update(instance, validated_data)
        if items_data is not None:
            if not items_data:
                raise serializers.ValidationError(
                    {"items": "At least one billable item is required."})
            invoice.items.all().delete()
            self._create_items(invoice, items_data)
        return invoice


class PaymentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    invoice_number = serializers.CharField(
        source="invoice.invoice_number", read_only=True)

    class Meta:
        model = Payment
        fields = (
            "id", "invoice", "invoice_number", "patient", "patient_name",
            "amount", "payment_date", "payment_method", "reference",
            "status", "received_by", "notes", "created_at",
        )
        read_only_fields = ("id", "received_by", "created_at")

    def validate_payment_date(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError("Payment date cannot be in the future.")
        return value

    def validate(self, attrs):
        invoice = attrs.get("invoice", getattr(self.instance, "invoice", None))
        patient = attrs.get("patient", getattr(self.instance, "patient", None))
        if invoice is not None and patient is not None \
                and invoice.patient_id != patient.pk:
            raise serializers.ValidationError(
                {"patient": "Patient must match the invoice's patient."})
        return attrs


class LedgerSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(
        source="patient.name", read_only=True, default=None)
    invoice_number = serializers.CharField(
        source="invoice.invoice_number", read_only=True, default=None)

    class Meta:
        model = RevenueTransaction
        fields = (
            "id", "invoice", "invoice_number", "payment", "patient",
            "patient_name", "type", "amount", "transaction_date",
            "payment_method", "reference", "description", "recorded_by",
            "notes", "created_at",
        )
        read_only_fields = fields


class PaymentCancelSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, default="")
