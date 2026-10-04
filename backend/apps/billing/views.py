"""Billing endpoints (Phase 11)."""

from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed

from apps.accounts.permissions import IsStaffUser
from apps.audit.utils import log_audit
from apps.billing.models import (
    PAYABLE_STATUSES,
    Invoice,
    InvoiceStatus,
    LedgerType,
    Payment,
    PaymentStatus,
    RevenueTransaction,
    ServiceType,
)
from apps.billing.serializers import (
    InvoiceSerializer,
    LedgerSerializer,
    PaymentCancelSerializer,
    PaymentSerializer,
)
from config.drf import error_response, success_response

SERVICE_TO_LEDGER = {
    ServiceType.CONSULTATION: LedgerType.CONSULTATION_REVENUE,
    ServiceType.LABORATORY: LedgerType.LABORATORY_REVENUE,
    ServiceType.PHARMACY: LedgerType.PHARMACY_REVENUE,
    ServiceType.PROCEDURE: LedgerType.PROCEDURE_REVENUE,
    ServiceType.PACKAGE: LedgerType.ADJUSTMENT,
    ServiceType.OTHER: LedgerType.ADJUSTMENT,
}


def _refresh_invoice_status(invoice: Invoice) -> Invoice:
    """Recompute status from derived balances. Caller owns the transaction."""
    if invoice.due_amount <= 0:
        invoice.status = InvoiceStatus.PAID
    elif invoice.paid_amount > 0:
        if invoice.status != InvoiceStatus.OVERDUE:
            invoice.status = InvoiceStatus.PARTIALLY_PAID
    elif invoice.status in (InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID):
        # Fully reversed back to zero paid.
        invoice.status = InvoiceStatus.PENDING
    invoice.save(update_fields=["status", "updated_at"])
    return invoice


def _ledger_type_for(invoice: Invoice, payment: Payment) -> str:
    if payment.payment_method == "Insurance":
        return LedgerType.INSURANCE_PAYMENT
    return SERVICE_TO_LEDGER.get(invoice.service_type, LedgerType.ADJUSTMENT)


@extend_schema(tags=["invoices"], summary="Invoice management")
class InvoiceViewSet(viewsets.ModelViewSet):
    """Itemized invoices with server-derived totals.

    Read/write: internal staff (patient self-service billing is a later
    phase). Totals/paid/due/status are derived — clients set items only.
    """

    serializer_class = InvoiceSerializer
    lookup_field = "id"
    lookup_value_regex = "[0-9a-f-]{36}"
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        qs = Invoice.objects.select_related("patient").prefetch_related(
            "items", "payments").all()
        patient = self.request.query_params.get("patient")
        if patient:
            qs = qs.filter(patient__id=patient)
        invoice_status = self.request.query_params.get("status")
        if invoice_status in [choice for choice, _ in InvoiceStatus.choices]:
            qs = qs.filter(status=invoice_status)
        service_type = self.request.query_params.get("service_type")
        if service_type:
            qs = qs.filter(service_type=service_type)
        date = self.request.query_params.get("date")
        if date:
            qs = qs.filter(issue_date=date)
        date_from = self.request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(issue_date__gte=date_from)
        date_to = self.request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(issue_date__lte=date_to)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(invoice_number__icontains=search)
                | Q(patient__first_name__icontains=search)
                | Q(patient__last_name__icontains=search)
            )
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invoice = serializer.save()
        if request.user.is_authenticated:
            invoice.created_by = request.user
            invoice.save(update_fields=["created_by", "updated_at"])
        log_audit(request.user, "INVOICE_CREATED", "billing",
                   f"Invoice {invoice.invoice_number} created for "
                   f"{invoice.patient.name} (total {invoice.total}).",
                   object_type="Invoice", object_id=str(invoice.id), request=request)
        return success_response(InvoiceSerializer(invoice).data,
                                message="Invoice created.",
                                status_code=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        invoice = serializer.save()
        log_audit(request.user, "INVOICE_UPDATED", "billing",
                   f"Invoice {invoice.invoice_number} updated.",
                   object_type="Invoice", object_id=str(invoice.id), request=request)
        return success_response(InvoiceSerializer(invoice).data, message="Invoice updated.")

    def perform_destroy(self, instance):
        if instance.status != InvoiceStatus.DRAFT or instance.payments.exists():
            from rest_framework.exceptions import ValidationError

            raise ValidationError("Only Draft invoices without payments can be deleted.")
        number = instance.invoice_number
        invoice_id = str(instance.id)
        instance.delete()
        log_audit(self.request.user, "INVOICE_CANCELLED", "billing",
                   f"Draft invoice {number} deleted.",
                   object_type="Invoice", object_id=invoice_id, request=self.request)

    def retrieve(self, request, *args, **kwargs):
        return success_response(self.get_serializer(self.get_object()).data,
                                message="Invoice retrieved.")

    def _transition(self, request, target, audit_action, message):
        invoice = self.get_object()
        if not Invoice.can_transition(invoice.status, target):
            return error_response(
                f"Cannot change status from {invoice.status} to {target}.",
                status_code=status.HTTP_400_BAD_REQUEST)
        old_status = invoice.status
        invoice.status = target
        invoice.save(update_fields=["status", "updated_at"])
        log_audit(request.user, audit_action, "billing",
                   f"Invoice {invoice.invoice_number} {old_status} → {target}.",
                   object_type="Invoice", object_id=str(invoice.id), request=request)
        return success_response(InvoiceSerializer(invoice).data, message=message)

    @extend_schema(summary="Issue a draft invoice", request=None)
    @action(detail=True, methods=["post"])
    def issue(self, request, *args, **kwargs):
        return self._transition(request, InvoiceStatus.PENDING,
                                "INVOICE_ISSUED", "Invoice issued.")

    @extend_schema(summary="Cancel an open invoice", request=None)
    @action(detail=True, methods=["post"])
    def cancel(self, request, *args, **kwargs):
        invoice = self.get_object()
        if invoice.payments.filter(status=PaymentStatus.COMPLETED).exists():
            return error_response(
                "Invoices with completed payments cannot be cancelled. Reverse payments first.",
                status_code=status.HTTP_400_BAD_REQUEST)
        return self._transition(request, InvoiceStatus.CANCELLED,
                                "INVOICE_CANCELLED", "Invoice cancelled.")

    @extend_schema(summary="Mark a past-due invoice overdue", request=None)
    @action(detail=True, methods=["post"])
    def overdue(self, request, *args, **kwargs):
        invoice = self.get_object()
        if not invoice.is_overdue:
            return error_response(
                "Only invoices past their due date with an outstanding balance can be overdue.",
                status_code=status.HTTP_400_BAD_REQUEST)
        return self._transition(request, InvoiceStatus.OVERDUE,
                                "INVOICE_UPDATED", "Invoice marked overdue.")


@extend_schema(tags=["payments"], summary="Payment recording")
class PaymentViewSet(viewsets.ModelViewSet):
    """Ledger-grade payment records. Amounts validated against the live
    invoice balance inside an atomic locked transaction."""

    serializer_class = PaymentSerializer
    lookup_field = "id"
    lookup_value_regex = "[0-9a-f-]{36}"
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        qs = Payment.objects.select_related("invoice", "patient").all()
        invoice = self.request.query_params.get("invoice")
        if invoice:
            qs = qs.filter(invoice__id=invoice)
        patient = self.request.query_params.get("patient")
        if patient:
            qs = qs.filter(patient__id=patient)
        method = self.request.query_params.get("payment_method")
        if method:
            qs = qs.filter(payment_method=method)
        payment_status = self.request.query_params.get("status")
        if payment_status in [choice for choice, _ in PaymentStatus.choices]:
            qs = qs.filter(status=payment_status)
        date_from = self.request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(payment_date__gte=date_from)
        date_to = self.request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(payment_date__lte=date_to)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(reference__icontains=search)
                | Q(patient__first_name__icontains=search)
                | Q(patient__last_name__icontains=search)
                | Q(invoice__invoice_number__icontains=search)
            )
        return qs

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invoice = Invoice.objects.select_for_update().get(
            pk=serializer.validated_data["invoice"].pk)
        amount = Decimal(str(serializer.validated_data["amount"]))
        if invoice.status not in PAYABLE_STATUSES:
            return error_response(
                f"Cannot accept payments on a {invoice.status} invoice.",
                status_code=status.HTTP_400_BAD_REQUEST)
        if amount <= 0:
            return error_response("Payment amount must be positive.",
                                  status_code=status.HTTP_400_BAD_REQUEST)
        if amount > invoice.due_amount:
            return error_response(
                f"Payment exceeds the outstanding balance of {invoice.due_amount}.",
                status_code=status.HTTP_400_BAD_REQUEST)
        payment = serializer.save(
            received_by=request.user if request.user.is_authenticated else None)
        if payment.status == PaymentStatus.COMPLETED:
            RevenueTransaction.objects.create(
                invoice=invoice, payment=payment, patient=invoice.patient,
                type=_ledger_type_for(invoice, payment), amount=payment.amount,
                transaction_date=payment.payment_date,
                payment_method=payment.payment_method, reference=payment.reference,
                description=f"Payment {payment.reference or payment.id} "
                            f"for invoice {invoice.invoice_number}.",
                recorded_by=request.user if request.user.is_authenticated else None)
            _refresh_invoice_status(invoice)
        log_audit(request.user, "PAYMENT_CREATED", "billing",
                   f"Payment {payment.amount} recorded for invoice "
                   f"{invoice.invoice_number} ({payment.status}).",
                   object_type="Payment", object_id=str(payment.id), request=request)
        return success_response(PaymentSerializer(payment).data,
                                message="Payment recorded.",
                                status_code=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        raise MethodNotAllowed("PATCH", detail="Payments are immutable. Use cancel/reverse.")

    def perform_destroy(self, instance):
        raise MethodNotAllowed("DELETE", detail="Payments cannot be deleted. Use cancel/reverse.")

    def retrieve(self, request, *args, **kwargs):
        return success_response(self.get_serializer(self.get_object()).data,
                                message="Payment retrieved.")

    @extend_schema(summary="Cancel a pending payment or reverse a completed one",
                   request=PaymentCancelSerializer)
    @action(detail=True, methods=["post"])
    def cancel(self, request, *args, **kwargs):
        cancel_serializer = PaymentCancelSerializer(data=request.data)
        cancel_serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            payment = Payment.objects.select_for_update().get(pk=self.get_object().pk)
            if payment.status == PaymentStatus.PENDING:
                payment_id = str(payment.id)
                invoice_number = payment.invoice.invoice_number
                payment.delete()
                log_audit(request.user, "PAYMENT_REVERSED", "billing",
                           f"Pending payment voided for invoice {invoice_number}.",
                           object_type="Payment", object_id=payment_id, request=request)
                return success_response(None, message="Pending payment voided.")
            if payment.status != PaymentStatus.COMPLETED:
                return error_response(
                    f"Cannot cancel a {payment.status} payment.",
                    status_code=status.HTTP_400_BAD_REQUEST)
            invoice = Invoice.objects.select_for_update().get(pk=payment.invoice_id)
            payment.status = PaymentStatus.REFUNDED
            payment.save(update_fields=["status"])
            RevenueTransaction.objects.create(
                invoice=invoice, payment=payment, patient=invoice.patient,
                type=LedgerType.REFUND, amount=payment.amount,
                transaction_date=payment.payment_date,
                payment_method=payment.payment_method, reference=payment.reference,
                description=f"Reversal of payment for invoice {invoice.invoice_number}. "
                            f"{cancel_serializer.validated_data.get('reason', '')}".strip(),
                recorded_by=request.user if request.user.is_authenticated else None)
            _refresh_invoice_status(invoice)
            log_audit(request.user, "PAYMENT_REVERSED", "billing",
                       f"Payment {payment.amount} reversed for invoice "
                       f"{invoice.invoice_number}.",
                       object_type="Payment", object_id=str(payment.id), request=request)
            return success_response(PaymentSerializer(payment).data,
                                    message="Payment reversed.")


@extend_schema(tags=["ledger"], summary="Revenue ledger (read-only)")
class LedgerViewSet(viewsets.ReadOnlyModelViewSet):
    """Immutable financial ledger. No create/update/delete API."""

    serializer_class = LedgerSerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        qs = RevenueTransaction.objects.select_related(
            "invoice", "payment", "patient").all()
        patient = self.request.query_params.get("patient")
        if patient:
            qs = qs.filter(patient__id=patient)
        entry_type = self.request.query_params.get("type")
        if entry_type:
            qs = qs.filter(type=entry_type)
        method = self.request.query_params.get("payment_method")
        if method:
            qs = qs.filter(payment_method=method)
        date_from = self.request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(transaction_date__gte=date_from)
        date_to = self.request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(transaction_date__lte=date_to)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(reference__icontains=search)
                | Q(description__icontains=search)
                | Q(invoice__invoice_number__icontains=search)
            )
        return qs

    def retrieve(self, request, *args, **kwargs):
        return success_response(self.get_serializer(self.get_object()).data,
                                message="Ledger entry retrieved.")
