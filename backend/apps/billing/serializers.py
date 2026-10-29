"""Billing serializers (Phase 11).

All money is Decimal and derived server-side. Clients can never set
paid/due/total/status directly — those are read-only and computed.
"""

from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.billing.models import (
    BillingCategory,
    Claim,
    ClaimStatus,
    Invoice,
    InvoiceItem,
    InvoiceStatus,
    Payment,
    PaymentMethod,
    PaymentStatus,
    RevenueTransaction,
    ServiceType,
    generate_claim_number,
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


class ClaimSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    invoice_number = serializers.CharField(
        source="invoice.invoice_number", read_only=True)
    outstanding = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Claim
        fields = (
            "id", "claim_number", "patient", "patient_name", "invoice",
            "invoice_number", "provider", "policy_number", "claim_amount",
            "approved_amount", "status", "submitted_date", "processed_date",
            "notes", "outstanding", "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "claim_number", "status", "submitted_date",
            "processed_date", "outstanding", "created_at", "updated_at",
        )

    def validate(self, attrs):
        claim_amount = attrs.get(
            "claim_amount", getattr(self.instance, "claim_amount", None))
        approved_amount = attrs.get(
            "approved_amount", getattr(self.instance, "approved_amount", None))
        if (claim_amount is not None and approved_amount is not None
                and approved_amount > claim_amount):
            raise serializers.ValidationError(
                {"approved_amount": "Approved amount cannot exceed claim amount."})
        invoice = attrs.get("invoice", getattr(self.instance, "invoice", None))
        patient = attrs.get("patient", getattr(self.instance, "patient", None))
        if invoice is not None and patient is not None \
                and invoice.patient_id != patient.pk:
            raise serializers.ValidationError(
                {"invoice": "Invoice must belong to the claim patient."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        validated_data["claim_number"] = generate_claim_number()
        # Derive patient from invoice if not provided (frontend create flow
        # only needs invoice + provider; patient comes from the invoice).
        invoice = validated_data.get("invoice")
        if invoice is not None and not validated_data.get("patient"):
            validated_data["patient"] = invoice.patient
        return super().create(validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        if instance.status != ClaimStatus.DRAFT:
            raise serializers.ValidationError(
                "Only Draft claims can be edited. Submit or create a new claim.")
        return super().update(instance, validated_data)


class ClaimDecisionSerializer(serializers.Serializer):
    """Approve / partially approve / reject a claim under review."""

    status = serializers.ChoiceField(
        choices=[ClaimStatus.APPROVED, ClaimStatus.PARTIALLY_APPROVED,
                 ClaimStatus.REJECTED])
    approved_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        validators=[MinValueValidator(0)])
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        status = attrs["status"]
        approved_amount = attrs["approved_amount"]
        if status == ClaimStatus.REJECTED and approved_amount > 0:
            raise serializers.ValidationError(
                {"approved_amount": "Rejected claims must have zero approved amount."})
        if status in (ClaimStatus.APPROVED, ClaimStatus.PARTIALLY_APPROVED) \
                and approved_amount <= 0:
            raise serializers.ValidationError(
                {"approved_amount": "Approved claims must approve a positive amount."})
        return attrs


class ClaimPaySerializer(serializers.Serializer):
    """Mark an approved/partially approved claim as paid (disbursement)."""

    notes = serializers.CharField(required=False, allow_blank=True, default="")
