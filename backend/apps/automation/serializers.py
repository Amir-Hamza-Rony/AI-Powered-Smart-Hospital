"""Automation serializers — camelCase-safe via ``source`` where needed."""

from rest_framework import serializers

from apps.automation import models as m


class AutomationWorkflowSerializer(serializers.ModelSerializer):
    class Meta:
        model = m.AutomationWorkflowModel
        fields = "__all__"


class AppointmentReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = m.AppointmentReminder
        fields = "__all__"


class LabCompletionAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = m.LabCompletionAlert
        fields = "__all__"


class StockAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = m.StockAlert
        fields = "__all__"


class PurchaseRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = m.PurchaseRequest
        fields = "__all__"


class QueuePatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = m.QueuePatient
        fields = "__all__"


class AutomationEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = m.AutomationEvent
        fields = "__all__"


class HospitalNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = m.HospitalNotification
        fields = "__all__"
