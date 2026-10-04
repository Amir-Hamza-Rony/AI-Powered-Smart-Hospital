"""Pharmacy endpoints (Phase 9)."""

from django.db import transaction
from django.db.models import F, Q
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsPharmacist, IsStaffUser, IsSuperAdmin
from apps.audit.utils import log_audit
from apps.pharmacy.models import (
    DispensingItem,
    DispensingRecord,
    DispensingStatus,
    Medicine,
    MedicineBatch,
)
from apps.pharmacy.serializers import (
    DispenseRequestSerializer,
    DispensingRecordSerializer,
    MedicineBatchSerializer,
    MedicineSerializer,
)
from config.drf import error_response, success_response

InventoryPermission = IsSuperAdmin | IsPharmacist


@extend_schema(tags=["pharmacy"], summary="Medicine catalog")
class MedicineViewSet(viewsets.ModelViewSet):
    """Reusable medicine catalog with derived stock levels.

    Read: any authenticated user. Write: pharmacists and super admins.
    """

    serializer_class = MedicineSerializer
    lookup_field = "id"
    lookup_value_regex = "[0-9a-f-]{36}"

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [InventoryPermission()]

    def get_queryset(self):
        qs = Medicine.objects.prefetch_related("batches").all()
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category__iexact=category)
        active = self.request.query_params.get("is_active")
        if active in ("true", "True", "1"):
            qs = qs.filter(is_active=True)
        elif active in ("false", "False", "0"):
            qs = qs.filter(is_active=False)
        low_stock = self.request.query_params.get("low_stock")
        if low_stock in ("true", "True", "1", "false", "False", "0"):
            want_low = low_stock in ("true", "True", "1")
            matched = [medicine.pk for medicine in qs if (medicine.available_stock
                       <= medicine.reorder_level) == want_low]
            qs = qs.filter(pk__in=matched)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(generic_name__icontains=search)
                | Q(brand_name__icontains=search)
            )
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        medicine = serializer.save()
        log_audit(request.user, "MEDICINE_CREATED", "pharmacy",
                   f"Medicine added: {medicine.name}.",
                   object_type="Medicine", object_id=str(medicine.id), request=request)
        return success_response(MedicineSerializer(medicine).data,
                                message="Medicine created.",
                                status_code=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        medicine = serializer.save()
        log_audit(request.user, "MEDICINE_UPDATED", "pharmacy",
                   f"Medicine updated: {medicine.name}.",
                   object_type="Medicine", object_id=str(medicine.id), request=request)
        return success_response(MedicineSerializer(medicine).data, message="Medicine updated.")

    def perform_destroy(self, instance):
        medicine_id = str(instance.id)
        label = str(instance)
        instance.delete()
        log_audit(self.request.user, "MEDICINE_UPDATED", "pharmacy",
                   f"Medicine removed: {label}.",
                   object_type="Medicine", object_id=medicine_id, request=self.request)

    def retrieve(self, request, *args, **kwargs):
        return success_response(self.get_serializer(self.get_object()).data,
                                message="Medicine retrieved.")


@extend_schema(tags=["pharmacy"], summary="Medicine batch inventory")
class MedicineBatchViewSet(viewsets.ModelViewSet):
    """Inventory batches with expiry tracking.

    Read: any authenticated user. Write: pharmacists and super admins.
    """

    serializer_class = MedicineBatchSerializer
    lookup_field = "id"
    lookup_value_regex = "[0-9a-f-]{36}"

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [InventoryPermission()]

    def get_queryset(self):
        from django.utils import timezone

        qs = MedicineBatch.objects.select_related("medicine").all()
        medicine = self.request.query_params.get("medicine")
        if medicine:
            qs = qs.filter(medicine__id=medicine)
        expired = self.request.query_params.get("expired")
        today = timezone.localdate()
        if expired in ("true", "True", "1"):
            qs = qs.filter(expiry_date__lt=today)
        elif expired in ("false", "False", "0"):
            qs = qs.filter(expiry_date__gte=today)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(batch_number__icontains=search)
                | Q(medicine__name__icontains=search)
            )
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        batch = serializer.save()
        log_audit(request.user, "BATCH_CREATED", "pharmacy",
                   f"Batch received: {batch.medicine.name} · {batch.batch_number} "
                   f"(qty {batch.quantity}).",
                   object_type="MedicineBatch", object_id=str(batch.id), request=request)
        return success_response(MedicineBatchSerializer(batch).data,
                                message="Batch created.",
                                status_code=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        batch = serializer.save()
        log_audit(request.user, "BATCH_UPDATED", "pharmacy",
                   f"Batch updated: {batch.medicine.name} · {batch.batch_number} "
                   f"(qty {batch.quantity}).",
                   object_type="MedicineBatch", object_id=str(batch.id), request=request)
        return success_response(MedicineBatchSerializer(batch).data, message="Batch updated.")

    def perform_destroy(self, instance):
        batch_id = str(instance.id)
        label = f"{instance.medicine.name} · {instance.batch_number}"
        instance.delete()
        log_audit(self.request.user, "BATCH_UPDATED", "pharmacy",
                   f"Batch removed: {label}.",
                   object_type="MedicineBatch", object_id=batch_id, request=self.request)

    def retrieve(self, request, *args, **kwargs):
        return success_response(self.get_serializer(self.get_object()).data,
                                message="Batch retrieved.")


@extend_schema(tags=["pharmacy"], summary="Prescription dispensing")
class DispensingRecordViewSet(viewsets.ModelViewSet):
    """Prescription fulfillment with atomic FEFO stock deduction.

    Read: internal staff. Create/dispense/cancel: pharmacists and super
    admins (patient pickup flow is a later phase).
    """

    serializer_class = DispensingRecordSerializer
    lookup_field = "id"
    lookup_value_regex = "[0-9a-f-]{36}"

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsStaffUser()]
        return [InventoryPermission()]

    def get_queryset(self):
        qs = DispensingRecord.objects.select_related(
            "prescription", "patient", "dispensed_by").prefetch_related(
            "items__medicine", "items__batch").all()
        prescription = self.request.query_params.get("prescription")
        if prescription:
            qs = qs.filter(prescription__id=prescription)
        patient = self.request.query_params.get("patient")
        if patient:
            qs = qs.filter(patient__id=patient)
        record_status = self.request.query_params.get("status")
        if record_status in [choice for choice, _ in DispensingStatus.choices]:
            qs = qs.filter(status=record_status)
        date = self.request.query_params.get("date")
        if date:
            qs = qs.filter(date=date)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(patient__first_name__icontains=search)
                | Q(patient__last_name__icontains=search)
                | Q(items__medicine__name__icontains=search)
            ).distinct()
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dispensing = serializer.save()
        log_audit(request.user, "DISPENSING_CREATED", "pharmacy",
                   f"Dispensing created: {dispensing.patient.name} "
                   f"(prescription {dispensing.prescription_id}).",
                   object_type="DispensingRecord", object_id=str(dispensing.id),
                   request=request)
        return success_response(DispensingRecordSerializer(dispensing).data,
                                message="Dispensing created.",
                                status_code=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        dispensing = serializer.save()
        log_audit(request.user, "DISPENSING_UPDATED", "pharmacy",
                   f"Dispensing updated: {dispensing.patient.name} ({dispensing.status}).",
                   object_type="DispensingRecord", object_id=str(dispensing.id),
                   request=request)
        return success_response(DispensingRecordSerializer(dispensing).data,
                                message="Dispensing updated.")

    def perform_destroy(self, instance):
        dispensing_id = str(instance.id)
        label = f"{instance.patient.name} ({instance.status})"
        instance.delete()
        log_audit(self.request.user, "DISPENSING_UPDATED", "pharmacy",
                   f"Dispensing deleted: {label}.",
                   object_type="DispensingRecord", object_id=dispensing_id,
                   request=self.request)

    def retrieve(self, request, *args, **kwargs):
        return success_response(self.get_serializer(self.get_object()).data,
                                message="Dispensing retrieved.")

    @extend_schema(summary="Dispense items (FEFO, atomic)", request=DispenseRequestSerializer)
    @action(detail=True, methods=["post"])
    def dispense(self, request, *args, **kwargs):
        from django.utils import timezone

        dispensing = self.get_object()
        if dispensing.status not in (
                DispensingStatus.PENDING, DispensingStatus.PARTIALLY_DISPENSED):
            return error_response(
                f"Cannot dispense a {dispensing.status} record.",
                status_code=status.HTTP_400_BAD_REQUEST)
        serializer = DispenseRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        requested = {str(line["id"]): line["quantity"]
                     for line in serializer.validated_data.get("items", [])}
        today = timezone.localdate()
        with transaction.atomic():
            # NOTE: "batch" is a nullable FK (outer join), which PostgreSQL
            # forbids under FOR UPDATE — lock items (+ inner-joined medicine)
            # here and lock each batch row separately below.
            items = list(DispensingItem.objects.select_for_update().filter(
                dispensing=dispensing).select_related("medicine"))
            if not items:
                return error_response("No dispensing items to dispense.",
                                      status_code=status.HTTP_400_BAD_REQUEST)
            for item in items:
                amount = requested.get(str(item.id), item.remaining)
                if str(item.id) in requested and item.remaining <= 0:
                    return error_response(
                        f"Item {item.medicine.name} is already fully dispensed.",
                        status_code=status.HTTP_400_BAD_REQUEST)
                if amount <= 0 or amount > item.remaining:
                    return error_response(
                        f"Invalid quantity for {item.medicine.name}.",
                        status_code=status.HTTP_400_BAD_REQUEST)
                batch = item.batch
                if batch is None:
                    batch = MedicineBatch.objects.select_for_update().filter(
                        medicine=item.medicine, expiry_date__gte=today,
                        quantity__gt=0).order_by("expiry_date").first()
                    if batch is None or batch.quantity < amount:
                        return error_response(
                            f"Insufficient stock for {item.medicine.name}.",
                            status_code=status.HTTP_400_BAD_REQUEST)
                    item.batch = batch
                else:
                    batch = MedicineBatch.objects.select_for_update().get(pk=batch.pk)
                    if batch.expiry_date < today:
                        return error_response(
                            f"Batch {batch.batch_number} is expired.",
                            status_code=status.HTTP_400_BAD_REQUEST)
                    if batch.quantity < amount:
                        return error_response(
                            f"Insufficient stock in batch {batch.batch_number}.",
                            status_code=status.HTTP_400_BAD_REQUEST)
                batch.quantity -= amount
                batch.save(update_fields=["quantity", "updated_at"])
                item.dispensed_quantity += amount
                item.save(update_fields=["batch", "dispensed_quantity"])
            dispensing.refresh_from_db()
            fully_dispensed = not dispensing.items.filter(
                dispensed_quantity__lt=F("quantity")).exists()
            dispensing.status = (
                DispensingStatus.DISPENSED if fully_dispensed
                else DispensingStatus.PARTIALLY_DISPENSED)
            if dispensing.dispensed_by is None:
                dispensing.dispensed_by = request.user if request.user.is_authenticated else None
            dispensing.save(update_fields=["status", "dispensed_by", "updated_at"])
        log_audit(request.user, "DISPENSING_UPDATED", "pharmacy",
                   f"Dispensed ({dispensing.status.lower()}): {dispensing.patient.name}.",
                   object_type="DispensingRecord", object_id=str(dispensing.id),
                   request=request)
        return success_response(DispensingRecordSerializer(dispensing).data,
                                message=f"Dispensing {dispensing.status.lower()}.")

    @extend_schema(summary="Cancel a pending/partially-dispensed record", request=None)
    @action(detail=True, methods=["post"])
    def cancel(self, request, *args, **kwargs):
        dispensing = self.get_object()
        if not DispensingRecord.can_transition(dispensing.status, DispensingStatus.CANCELLED):
            return error_response(
                f"Cannot change status from {dispensing.status} to Cancelled.",
                status_code=status.HTTP_400_BAD_REQUEST)
        dispensing.status = DispensingStatus.CANCELLED
        dispensing.save(update_fields=["status", "updated_at"])
        log_audit(request.user, "DISPENSING_UPDATED", "pharmacy",
                   f"Dispensing cancelled: {dispensing.patient.name}.",
                   object_type="DispensingRecord", object_id=str(dispensing.id),
                   request=request)
        return success_response(DispensingRecordSerializer(dispensing).data,
                                message="Dispensing cancelled.")
