"""AI URL namespace: /api/ai/."""

from django.urls import path
from rest_framework.routers import SimpleRouter

from apps.ai.views import (
    AIInsightViewSet,
    AISessionViewSet,
    ClinicalAskView,
    ClinicalSummaryView,
    HealthAnalyticsView,
    NoShowPredictionView,
    PrescriptionAdvisoryView,
    SymptomCheckView,
)

router = SimpleRouter()
router.register("sessions", AISessionViewSet, basename="ai-sessions")
router.register("insights", AIInsightViewSet, basename="ai-insights")

urlpatterns = [
    path("symptom-check/", SymptomCheckView.as_view(), name="ai-symptom-check"),
    path("clinical-summary/", ClinicalSummaryView.as_view(), name="ai-clinical-summary"),
    path("clinical-ask/", ClinicalAskView.as_view(), name="ai-clinical-ask"),
    path("prescription-advisory/", PrescriptionAdvisoryView.as_view(),
         name="ai-prescription-advisory"),
    path("noshow-predictions/", NoShowPredictionView.as_view(),
         name="ai-noshow-predictions"),
    path("analytics/", HealthAnalyticsView.as_view(), name="ai-analytics"),
    *router.urls,
]
