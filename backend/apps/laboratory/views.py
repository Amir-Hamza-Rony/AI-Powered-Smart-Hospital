"""Laboratory endpoints (Phase 9)."""

from django.db.models import Q
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsPathologist, IsStaffUser, IsSuperAdmin
from apps.audit.utils import log_audit
from apps.laboratory.models import (
    LabOrder,
    LabOrderStatus,
    LabPriority,
    LabResultStatus,
    LabTest,
)
from apps.laboratory.serializers import (
    LabOrderSerializer,
    LabResultUpdateSerializer,
    LabTestSerializer,
)
from config.drf import error_response, success_response

LabWorkflowPermission = IsSuperAdmin | IsPathologist


@extend_schema(tags=["laboratory"], summary="Lab test catalog")
class LabTestViewSet(viewsets.ModelViewSet):
    """Reusable diagnostic test catalog.

    Read: any authenticated user. Write: pathologists and super admins.
    """

    serializer_class = LabTestSerializer
    lookup_field = "id"
    lookup_value_regex = "[0-9a-f-]{36}"

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [LabWorkflowPermission()]

    def get_queryset(self):
        qs = LabTest.objects.all()
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category__iexact=category)
        test_status = self.request.query_params.get("status")
        if test_status in ("Active", "Inactive"):
            qs = qs.filter(status=test_status)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(code__icontains=search))
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        test = serializer.save()
        log_audit(request.user, "LAB_TEST_CREATED", "laboratory",
                   f"Lab test added: {test.code} · {test.name}.",
                   object_type="LabTest", object_id=str(test.id), request=request)
        return success_response(LabTestSerializer(test).data,
                                message="Lab test created.",
                                status_code=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        test = serializer.save()
        log_audit(request.user, "LAB_TEST_UPDATED", "laboratory",
                   f"Lab test updated: {test.code} · {test.name}.",
                   object_type="LabTest", object_id=str(test.id), request=request)
        return success_response(LabTestSerializer(test).data, message="Lab test updated.")

    def perform_destroy(self, instance):
        test_id = str(instance.id)
        label = f"{instance.code} · {instance.name}"
        instance.delete()
        log_audit(self.request.user, "LAB_TEST_UPDATED", "laboratory",
                   f"Lab test removed: {label}.",
                   object_type="LabTest", object_id=test_id, request=self.request)

    def retrieve(self, request, *args, **kwargs):
        return success_response(self.get_serializer(self.get_object()).data,
                                message="Lab test retrieved.")


@extend_schema(tags=["laboratory"], summary="Lab order management")
class LabOrderViewSet(viewsets.ModelViewSet):
    """Diagnostic orders with the Pending → Processing → Ready workflow
    (→ Completed; cancellation from Pending/Processing).

    Read: any authenticated user. Create/update: internal staff.
    Workflow actions and result entry: pathologists and super admins.
    """

    serializer_class = LabOrderSerializer
    lookup_field = "id"
    lookup_value_regex = "[0-9a-f-]{36}"

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        if self.action in ("process", "ready", "cancel", "results"):
            return [LabWorkflowPermission()]
        return [IsStaffUser()]

    def get_queryset(self):
        qs = LabOrder.objects.select_related("patient", "doctor").prefetch_related(
            "items__test").all()
        patient = self.request.query_params.get("patient")
        if patient:
            qs = qs.filter(patient__id=patient)
        doctor = self.request.query_params.get("doctor")
        if doctor:
            qs = qs.filter(doctor__id=doctor)
        order_status = self.request.query_params.get("status")
        if order_status in [choice for choice, _ in LabOrderStatus.choices]:
            qs = qs.filter(status=order_status)
        priority = self.request.query_params.get("priority")
        if priority in [choice for choice, _ in LabPriority.choices]:
            qs = qs.filter(priority=priority)
        date = self.request.query_params.get("date")
        if date:
            qs = qs.filter(order_date=date)
        date_from = self.request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(order_date__gte=date_from)
        date_to = self.request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(order_date__lte=date_to)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(patient__first_name__icontains=search)
                | Q(patient__last_name__icontains=search)
                | Q(items__test__name__icontains=search)
            ).distinct()
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lab_order = serializer.save()
        log_audit(request.user, "LAB_ORDER_CREATED", "laboratory",
                   f"Lab order placed: {lab_order.patient.name} on {lab_order.order_date}.",
                   object_type="LabOrder", object_id=str(lab_order.id), request=request)
        return success_response(LabOrderSerializer(lab_order).data,
                                message="Lab order created.",
                                status_code=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        old_status = instance.status
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        lab_order = serializer.save()
        if lab_order.status != old_status:
            log_audit(request.user, "LAB_ORDER_UPDATED", "laboratory",
                       f"Lab order {old_status} → {lab_order.status}: "
                       f"{lab_order.patient.name} on {lab_order.order_date}.",
                       object_type="LabOrder", object_id=str(lab_order.id), request=request)
        else:
            log_audit(request.user, "LAB_ORDER_UPDATED", "laboratory",
                       f"Lab order updated: {lab_order.patient.name} on {lab_order.order_date}.",
                       object_type="LabOrder", object_id=str(lab_order.id), request=request)
        return success_response(LabOrderSerializer(lab_order).data, message="Lab order updated.")

    def perform_destroy(self, instance):
        order_id = str(instance.id)
        label = f"{instance.patient.name} on {instance.order_date}"
        instance.delete()
        log_audit(self.request.user, "LAB_ORDER_UPDATED", "laboratory",
                   f"Lab order deleted: {label}.",
                   object_type="LabOrder", object_id=order_id, request=self.request)

    def retrieve(self, request, *args, **kwargs):
        return success_response(self.get_serializer(self.get_object()).data,
                                message="Lab order retrieved.")

    def _transition(self, request, target):
        lab_order = self.get_object()
        if not LabOrder.can_transition(lab_order.status, target):
            return error_response(
                f"Cannot change status from {lab_order.status} to {target}.",
                status_code=status.HTTP_400_BAD_REQUEST)
        if target == LabOrderStatus.READY and lab_order.items.filter(result="").exists():
            return error_response(
                "All tests must have results before the order is Ready.",
                status_code=status.HTTP_400_BAD_REQUEST)
        old_status = lab_order.status
        lab_order.status = target
        lab_order.save(update_fields=["status", "updated_at"])
        log_audit(request.user, "LAB_ORDER_UPDATED", "laboratory",
                   f"Lab order {old_status} → {target}: {lab_order.patient.name} "
                   f"on {lab_order.order_date}.",
                   object_type="LabOrder", object_id=str(lab_order.id), request=request)
        return success_response(LabOrderSerializer(lab_order).data,
                                message=f"Lab order {target.lower()}.")

    @extend_schema(summary="Start processing a pending lab order", request=None)
    @action(detail=True, methods=["post"])
    def process(self, request, *args, **kwargs):
        return self._transition(request, LabOrderStatus.PROCESSING)

    @extend_schema(summary="Mark a processing lab order ready", request=None)
    @action(detail=True, methods=["post"])
    def ready(self, request, *args, **kwargs):
        return self._transition(request, LabOrderStatus.READY)

    @extend_schema(summary="Cancel a pending/processing lab order", request=None)
    @action(detail=True, methods=["post"])
    def cancel(self, request, *args, **kwargs):
        return self._transition(request, LabOrderStatus.CANCELLED)

    @extend_schema(summary="Enter/update test results", request=LabResultUpdateSerializer)
    @action(detail=True, methods=["post"])
    def results(self, request, *args, **kwargs):
        lab_order = self.get_object()
        if lab_order.status not in (LabOrderStatus.PROCESSING, LabOrderStatus.READY):
            return error_response(
                "Results can only be entered while the order is Processing or Ready.",
                status_code=status.HTTP_400_BAD_REQUEST)
        serializer = LabResultUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        items_by_id = {str(item.id): item for item in lab_order.items.all()}
        tests_by_id = {str(item.test_id): item for item in lab_order.items.all()}
        for entry in serializer.validated_data["items"]:
            item = None
            if "item" in entry:
                item = items_by_id.get(str(entry["item"]))
            else:
                item = tests_by_id.get(str(entry["test"]))
            if item is None:
                return error_response(
                    "One or more entries do not belong to this order.",
                    status_code=status.HTTP_400_BAD_REQUEST)
            item.result = entry.get("result", item.result)
            item.unit = entry.get("unit", item.unit)
            item.reference_range = entry.get("reference_range", item.reference_range)
            item.result_notes = entry.get("result_notes", item.result_notes)
            item.status = entry.get("status", item.status)
            item.save(update_fields=[
                "result", "unit", "reference_range", "result_notes", "status", "updated_at"])
        log_audit(request.user, "LAB_RESULT_UPDATED", "laboratory",
                   f"Lab results updated: {lab_order.patient.name} on {lab_order.order_date}.",
                   object_type="LabOrder", object_id=str(lab_order.id), request=request)
        return success_response(LabOrderSerializer(lab_order).data, message="Results updated.")
