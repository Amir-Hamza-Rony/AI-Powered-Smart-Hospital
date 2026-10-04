"""Authentication and user-management endpoints (Phase 7)."""

from django.db.models import Q
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.accounts.models import Role, User
from apps.accounts.permissions import IsSuperAdmin
from apps.accounts.serializers import (
    AdminUserCreateSerializer,
    AdminUserUpdateSerializer,
    LoginSerializer,
    LogoutSerializer,
    RefreshSerializer,
    RegisterSerializer,
    UserSerializer,
    UserUpdateSerializer,
)
from apps.audit.utils import log_audit
from config.drf import error_response, success_response


def _client_user(request):
    return request.user if request.user.is_authenticated else None


# AUTH -----------------------------------------------------------------------

@extend_schema(tags=["auth"], summary="Register a new patient account")
class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        log_audit(user, "USER_CREATED", "accounts", f"Patient account registered: {user.email}.",
                   object_type="User", object_id=str(user.id), request=request)
        return success_response(UserSerializer(user).data, message="Registration successful.", status_code=status.HTTP_201_CREATED)


@extend_schema(tags=["auth"], summary="Log in with email and password")
class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            return error_response("Invalid email or password.", status_code=status.HTTP_401_UNAUTHORIZED)
        data = serializer.validated_data
        user = User.objects.get(email__iexact=request.data.get("email", ""))
        log_audit(user, "LOGIN", "auth", f"User logged in: {user.email}.",
                   object_type="User", object_id=str(user.id), request=request)
        return success_response(
            {"access": data["access"], "refresh": data["refresh"], "user": data["user"]},
            message="Login successful.",
        )


@extend_schema(tags=["auth"], summary="Refresh the access token")
class RefreshView(TokenRefreshView):
    permission_classes = [AllowAny]
    serializer_class = RefreshSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except (TokenError, InvalidToken, Exception):
            return error_response("Invalid or expired refresh token.", status_code=status.HTTP_401_UNAUTHORIZED)
        return success_response(dict(serializer.validated_data), message="Token refreshed.")


@extend_schema(tags=["auth"], summary="Log out (blacklists the refresh token)", request=LogoutSerializer)
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = LogoutSerializer

    def post(self, request):
        refresh = request.data.get("refresh")
        if not refresh:
            return error_response("A refresh token is required to log out.", status_code=status.HTTP_400_BAD_REQUEST)
        try:
            RefreshToken(refresh).blacklist()
        except (TokenError, InvalidToken, Exception):
            return error_response("Invalid or expired refresh token.", status_code=status.HTTP_400_BAD_REQUEST)
        log_audit(request.user, "LOGOUT", "auth", f"User logged out: {request.user.email}.",
                   object_type="User", object_id=str(request.user.id), request=request)
        return success_response(None, message="Logout successful.")


@extend_schema(tags=["auth"], summary="Get the current authenticated user")
class MeView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    @extend_schema(responses=UserSerializer)
    def get(self, request):
        return success_response(UserSerializer(request.user).data, message="Current user.")

    @extend_schema(request=UserUpdateSerializer, responses=UserSerializer)
    def patch(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_audit(request.user, "USER_UPDATED", "accounts", f"Profile updated: {request.user.email}.",
                   object_type="User", object_id=str(request.user.id), request=request)
        return success_response(UserSerializer(request.user).data, message="Profile updated.")


# USER MANAGEMENT ---------------------------------------------------------------

@extend_schema(tags=["users"], summary="Admin user management")
class UserViewSet(viewsets.ModelViewSet):
    """Admin-only CRUD over users, with role / active / search filtering."""

    permission_classes = [IsSuperAdmin]
    lookup_field = "id"
    lookup_value_regex = "[0-9a-f-]{36}"

    def get_queryset(self):
        qs = User.objects.all().order_by("-date_joined")
        role = self.request.query_params.get("role")
        if role:
            valid = [choice for choice, _ in Role.choices]
            if role in valid:
                qs = qs.filter(role=role)
        active = self.request.query_params.get("is_active")
        if active in ("true", "True", "1"):
            qs = qs.filter(is_active=True)
        elif active in ("false", "False", "0"):
            qs = qs.filter(is_active=False)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(phone__icontains=search)
            )
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return AdminUserCreateSerializer
        if self.action in ("update", "partial_update"):
            return AdminUserUpdateSerializer
        return UserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        log_audit(request.user, "USER_CREATED", "accounts", f"Admin created user: {user.email} ({user.role}).",
                   object_type="User", object_id=str(user.id), request=request)
        return success_response(UserSerializer(user).data, message="User created.", status_code=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.id == request.user.id and "is_active" in request.data and request.data.get("is_active") in (False, "false", "False", "0", 0):
            return error_response("You cannot deactivate your own account.", status_code=status.HTTP_400_BAD_REQUEST)
        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return success_response(UserSerializer(instance).data, message="User updated.")

    def perform_update(self, serializer):
        user = serializer.save()
        log_audit(self.request.user, "USER_UPDATED", "accounts", f"Admin updated user: {user.email}.",
                   object_type="User", object_id=str(user.id), request=self.request)

    def perform_destroy(self, instance):
        if instance.id == self.request.user.id:
            from rest_framework.exceptions import ValidationError

            raise ValidationError("You cannot delete your own account.")
        email = instance.email
        user_id = str(instance.id)
        instance.delete()
        log_audit(self.request.user, "USER_DELETED", "accounts", f"Admin deleted user: {email}.",
                   object_type="User", object_id=user_id, request=self.request)

    def retrieve(self, request, *args, **kwargs):
        return success_response(UserSerializer(self.get_object()).data, message="User retrieved.")
