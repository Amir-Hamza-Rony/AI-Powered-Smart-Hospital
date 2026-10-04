"""User serializers. Passwords and hashes are never exposed."""

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer

from apps.accounts.models import Role, User


class UserSerializer(serializers.ModelSerializer):
    """Public-safe user representation used in login/me responses."""

    name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ("id", "name", "first_name", "last_name", "email", "phone", "role", "is_active", "date_joined")
        read_only_fields = ("id", "role", "is_active", "date_joined")


class RegisterSerializer(serializers.ModelSerializer):
    """Public self-registration. Always creates a PATIENT; staff are created by admins."""

    password = serializers.CharField(write_only=True, min_length=8, style={"input_type": "password"})

    class Meta:
        model = User
        fields = ("first_name", "last_name", "email", "phone", "password")

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        return User.objects.create_user(role=Role.PATIENT, **validated_data)


class AdminUserCreateSerializer(serializers.ModelSerializer):
    """Admin-only user creation with explicit role assignment."""

    password = serializers.CharField(write_only=True, min_length=8, style={"input_type": "password"})

    class Meta:
        model = User
        fields = ("first_name", "last_name", "email", "phone", "password", "role", "is_active", "is_staff")

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserUpdateSerializer(serializers.ModelSerializer):
    """Self-service profile update — role/status can never be changed here."""

    class Meta:
        model = User
        fields = ("first_name", "last_name", "phone")


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    """Admin management of any user, including role and active status."""

    class Meta:
        model = User
        fields = ("first_name", "last_name", "phone", "role", "is_active", "is_staff")


class LoginSerializer(TokenObtainPairSerializer):
    """Email + password login. Adds the safe user payload to the response."""

    username_field = "email"

    def validate(self, attrs):
        email = attrs.get("email", "")
        password = attrs.get("password", "")
        user = authenticate(self.context["request"], username=email, password=password)
        if user is None:
            raise serializers.ValidationError("Invalid email or password.")
        if not user.is_active:
            raise serializers.ValidationError("This account has been deactivated.")
        data = super().validate({"email": user.email, "password": password})
        data["user"] = UserSerializer(user).data
        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["email"] = user.email
        return token


class RefreshSerializer(TokenRefreshSerializer):
    """Refresh-token rotation response (kept in the project envelope by views)."""


class LogoutSerializer(serializers.Serializer):
    """Refresh token to blacklist on logout."""

    refresh = serializers.CharField()
