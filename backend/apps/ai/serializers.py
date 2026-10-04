"""AI serializers (Phase 12)."""

from rest_framework import serializers

from apps.ai.models import AIInsight, AIModule, AISession


class SymptomEntrySerializer(serializers.Serializer):
    name = serializers.CharField()
    category = serializers.CharField(required=False, allow_blank=True, default="")
    severity = serializers.ChoiceField(
        choices=["Mild", "Moderate", "Severe"], default="Moderate")
    duration = serializers.CharField(required=False, allow_blank=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class VitalsSerializer(serializers.Serializer):
    temperature = serializers.CharField(required=False, allow_blank=True, default="")
    bloodPressure = serializers.CharField(required=False, allow_blank=True, default="")
    heartRate = serializers.CharField(required=False, allow_blank=True, default="")
    oxygenSaturation = serializers.CharField(required=False, allow_blank=True, default="")
    recentMedications = serializers.CharField(required=False, allow_blank=True, default="")
    additionalNotes = serializers.CharField(required=False, allow_blank=True, default="")


class SymptomCheckSerializer(serializers.Serializer):
    patient = serializers.UUIDField(required=False, allow_null=True, default=None)
    age = serializers.IntegerField(required=False, min_value=0, max_value=130, default=None)
    gender = serializers.ChoiceField(
        choices=["Male", "Female", "Other"], required=False, default="")
    conditions = serializers.ListField(
        child=serializers.CharField(), required=False, default=list)
    allergies = serializers.ListField(
        child=serializers.CharField(), required=False, default=list)
    symptoms = SymptomEntrySerializer(many=True, min_length=1)
    vitals = VitalsSerializer(required=False, default=dict)


class ClinicalSummarySerializer(serializers.Serializer):
    patient = serializers.UUIDField()


class ClinicalAskSerializer(serializers.Serializer):
    patient = serializers.UUIDField()
    question = serializers.CharField(min_length=3, max_length=2000)


class ProposedMedicineSerializer(serializers.Serializer):
    medicine = serializers.CharField()
    dose = serializers.CharField(required=False, allow_blank=True, default="")
    frequency = serializers.CharField(required=False, allow_blank=True, default="")
    duration = serializers.CharField(required=False, allow_blank=True, default="")
    route = serializers.CharField(required=False, allow_blank=True, default="Oral")


class PrescriptionAdvisorySerializer(serializers.Serializer):
    patient = serializers.UUIDField(required=False, allow_null=True, default=None)
    diagnosis = serializers.CharField(required=False, allow_blank=True, default="")
    current_meds = serializers.ListField(
        child=serializers.CharField(), required=False, default=list)
    proposed = ProposedMedicineSerializer(many=True, min_length=1)


class InsightReviewSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, default="")


class AISessionSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(
        source="patient.name", read_only=True, default=None)
    requested_by_email = serializers.CharField(
        source="requested_by.email", read_only=True, default=None)

    class Meta:
        model = AISession
        fields = ("id", "module", "patient", "patient_name", "requested_by",
                  "requested_by_email", "input_data", "provider", "created_at")
        read_only_fields = fields


class AIInsightSerializer(serializers.ModelSerializer):
    module = serializers.CharField(source="session.module", read_only=True)
    patient = serializers.UUIDField(source="session.patient_id", read_only=True, default=None)
    patient_name = serializers.CharField(
        source="session.patient.name", read_only=True, default=None)
    requested_by_email = serializers.CharField(
        source="session.requested_by.email", read_only=True, default=None)

    class Meta:
        model = AIInsight
        fields = ("id", "session", "module", "patient", "patient_name", "kind",
                  "title", "content", "confidence", "requires_review",
                  "review_status", "reviewed_by", "requested_by_email",
                  "reviewed_at", "review_note", "created_at")
        read_only_fields = fields
