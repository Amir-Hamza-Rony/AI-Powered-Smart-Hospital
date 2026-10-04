"""Billing models (Phase 11).

Patient → billable items → Invoice → Payment(s) → derived balance →
RevenueTransaction ledger. All money is Decimal; totals are derived
server-side and never trusted from input. Ledger rows are immutable.
"""

import uuid
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


class InvoiceStatus(models.TextChoices):
    DRAFT = "Draft", "Draft"
    PENDING = "Pending", "Pending"
    PARTIALLY_PAID = "Partially Paid", "Partially Paid"
    PAID = "Paid", "Paid"
    OVERDUE = "Overdue", "Overdue"
    CANCELLED = "Cancelled", "Cancelled"


class ServiceType(models.TextChoices):
    CONSULTATION = "Consultation", "Consultation"
    LABORATORY = "Laboratory", "Laboratory"
    PHARMACY = "Pharmacy", "Pharmacy"
    PROCEDURE = "Procedure", "Procedure"
    PACKAGE = "Package", "Package"
    OTHER = "Other", "Other"


class BillingCategory(models.TextChoices):
    CONSULTATION = "Consultation", "Consultation"
    LABORATORY = "Laboratory", "Laboratory"
    MEDICINE = "Medicine", "Medicine"
    PROCEDURE = "Procedure", "Procedure"
    OTHER = "Other", "Other"


class PaymentMethod(models.TextChoices):
    CASH = "Cash", "Cash"
    CARD = "Card", "Card"
    MOBILE_BANKING = "Mobile Banking", "Mobile Banking"
    BANK_TRANSFER = "Bank Transfer", "Bank Transfer"
    INSURANCE = "Insurance", "Insurance"


class PaymentStatus(models.TextChoices):
    COMPLETED = "Completed", "Completed"
    PENDING = "Pending", "Pending"
    FAILED = "Failed", "Failed"
    REFUNDED = "Refunded", "Refunded"


class LedgerType(models.TextChoices):
    CONSULTATION_REVENUE = "Consultation Revenue", "Consultation Revenue"
    LABORATORY_REVENUE = "Laboratory Revenue", "Laboratory Revenue"
    PHARMACY_REVENUE = "Pharmacy Revenue", "Pharmacy Revenue"
    PROCEDURE_REVENUE = "Procedure Revenue", "Procedure Revenue"
    REFUND = "Refund", "Refund"
    INSURANCE_PAYMENT = "Insurance Payment", "Insurance Payment"
    ADJUSTMENT = "Adjustment", "Adjustment"


# Allowed explicit transitions. Payment-driven moves to Partially Paid/Paid
# are applied by the payment flow itself, not by clients.
INVOICE_TRANSITIONS = {
    InvoiceStatus.DRAFT: {InvoiceStatus.PENDING, InvoiceStatus.CANCELLED},
    InvoiceStatus.PENDING: {
        InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID,
        InvoiceStatus.OVERDUE, InvoiceStatus.CANCELLED},
    InvoiceStatus.PARTIALLY_PAID: {
        InvoiceStatus.PAID, InvoiceStatus.OVERDUE, InvoiceStatus.CANCELLED},
    InvoiceStatus.OVERDUE: {
        InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID, InvoiceStatus.CANCELLED},
    InvoiceStatus.PAID: set(),
    InvoiceStatus.CANCELLED: set(),
}

# Invoice states that may receive payments.
PAYABLE_STATUSES = {
    InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE,
}


def _money(value=0):
    return Decimal(str(value))


class Invoice(models.Model):
    """Itemized bill for a patient. Totals are derived, never stored input."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_number = models.CharField(max_length=30, unique=True, db_index=True)
    patient = models.ForeignKey(
        "patients.Patient", on_delete=models.PROTECT, related_name="invoices")
    appointment = models.ForeignKey(
        "appointments.Appointment", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="invoices")
    service_type = models.CharField(
        max_length=20, choices=ServiceType.choices, default=ServiceType.CONSULTATION)
    issue_date = models.DateField(db_index=True)
    due_date = models.DateField()
    payment_terms = models.CharField(max_length=50, blank=True, default="")
    discount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    tax = models.DecimalField(
        max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    status = models.CharField(
        max_length=15, choices=InvoiceStatus.choices, default=InvoiceStatus.DRAFT)
    notes = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="created_invoices")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-issue_date", "-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["patient", "issue_date"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.invoice_number} · {self.patient.name} ({self.status})"

    @classmethod
    def can_transition(cls, current: str, new: str) -> bool:
        return new in INVOICE_TRANSITIONS.get(current, set())

    @property
    def subtotal(self) -> Decimal:
        return sum((item.quantity * item.unit_price for item in self.items.all()),
                   _money())

    @property
    def items_discount(self) -> Decimal:
        return sum((item.discount for item in self.items.all()), _money())

    @property
    def items_tax(self) -> Decimal:
        return sum((item.tax for item in self.items.all()), _money())

    @property
    def total(self) -> Decimal:
        return max(_money(), self.subtotal - self.discount
                   - self.items_discount + self.tax + self.items_tax)

    @property
    def paid_amount(self) -> Decimal:
        return sum((payment.amount for payment in self.payments.filter(
            status=PaymentStatus.COMPLETED)), _money())

    @property
    def due_amount(self) -> Decimal:
        return max(_money(), self.total - self.paid_amount)

    @property
    def is_overdue(self) -> bool:
        return (self.status not in (InvoiceStatus.PAID, InvoiceStatus.CANCELLED)
                and self.due_amount > 0 and self.due_date < timezone.localdate())


def generate_invoice_number() -> str:
    """Unique human-friendly number; uniqueness enforced by DB constraint."""
    import secrets

    year = timezone.localdate().year
    for _ in range(10):
        candidate = f"INV-{year}-{secrets.randbelow(900000) + 100000}"
        if not Invoice.objects.filter(invoice_number=candidate).exists():
            return candidate
    return f"INV-{year}-{uuid.uuid4().hex[:6].upper()}"


class InvoiceItem(models.Model):
    """One billable line on an invoice. Line total derived server-side."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(
        Invoice, on_delete=models.CASCADE, related_name="items")
    description = models.CharField(max_length=255)
    item_type = models.CharField(
        max_length=20, choices=ServiceType.choices, default=ServiceType.OTHER)
    category = models.CharField(
        max_length=20, choices=BillingCategory.choices, default=BillingCategory.OTHER)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    discount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    tax = models.DecimalField(
        max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])

    class Meta:
        ordering = ["invoice", "description"]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.description} × {self.quantity}"

    @property
    def line_total(self) -> Decimal:
        return max(_money(), self.quantity * self.unit_price - self.discount + self.tax)


class Payment(models.Model):
    """Recorded payment against an invoice (ledger entry, not a gateway)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(
        Invoice, on_delete=models.PROTECT, related_name="payments")
    patient = models.ForeignKey(
        "patients.Patient", on_delete=models.PROTECT, related_name="payments")
    amount = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    payment_date = models.DateField(db_index=True)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    reference = models.CharField(max_length=100, blank=True, default="")
    status = models.CharField(
        max_length=10, choices=PaymentStatus.choices, default=PaymentStatus.COMPLETED)
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="received_payments")
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-payment_date", "-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["patient", "payment_date"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.amount} → {self.invoice.invoice_number} ({self.status})"


class RevenueTransaction(models.Model):
    """Immutable financial ledger row. Reversals are new rows, never edits."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(
        Invoice, null=True, blank=True, on_delete=models.PROTECT,
        related_name="ledger_entries")
    payment = models.ForeignKey(
        Payment, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="ledger_entries")
    patient = models.ForeignKey(
        "patients.Patient", null=True, blank=True, on_delete=models.PROTECT,
        related_name="ledger_entries")
    type = models.CharField(max_length=25, choices=LedgerType.choices)
    amount = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    transaction_date = models.DateField(db_index=True)
    payment_method = models.CharField(
        max_length=20, choices=PaymentMethod.choices, blank=True, default="")
    reference = models.CharField(max_length=100, blank=True, default="")
    description = models.TextField(blank=True, default="")
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="ledger_entries")
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-transaction_date", "-created_at"]
        indexes = [
            models.Index(fields=["type"]),
            models.Index(fields=["patient", "transaction_date"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.type} · {self.amount} · {self.transaction_date}"
