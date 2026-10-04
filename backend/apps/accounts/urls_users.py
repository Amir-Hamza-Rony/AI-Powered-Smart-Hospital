"""User URL namespace: /api/users/."""

from django.urls import path
from rest_framework.routers import SimpleRouter

from apps.accounts.views import MeView, UserViewSet

# SimpleRouter (no API-root view) so GET /api/users/ stays the user list.
router = SimpleRouter()
router.register("", UserViewSet, basename="users")

urlpatterns = [
    path("me/", MeView.as_view(), name="users-me"),
    *router.urls,
]
