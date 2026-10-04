"""Reusable RBAC permission classes.

Views must compose these — never re-implement role checks inline.
"""

from rest_framework.permissions import BasePermission

from apps.accounts.models import Role


def _has_role(user, *roles: str) -> bool:
    return bool(user and user.is_authenticated and getattr(user, "role", None) in roles)


class IsSuperAdmin(BasePermission):
    """Full system access: user management, audit logs, configuration."""

    message = "Super admin access required."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_superuser or user.role == Role.SUPER_ADMIN))


class IsDoctor(BasePermission):
    """Assigned patients, prescriptions, clinical workflows, queue control."""

    message = "Doctor access required."

    def has_permission(self, request, view):
        return _has_role(request.user, Role.DOCTOR)


class IsNurse(BasePermission):
    """Check-in support, triage data entry, ward care."""

    message = "Nurse access required."

    def has_permission(self, request, view):
        return _has_role(request.user, Role.NURSE)


class IsReceptionist(BasePermission):
    """Scheduling, check-in, queue updates."""

    message = "Receptionist access required."

    def has_permission(self, request, view):
        return _has_role(request.user, Role.RECEPTIONIST)


class IsPharmacist(BasePermission):
    """Inventory, fulfillment, dispensing records."""

    message = "Pharmacist access required."

    def has_permission(self, request, view):
        return _has_role(request.user, Role.PHARMACIST)


class IsPathologist(BasePermission):
    """Lab orders, diagnostic reports, uploads."""

    message = "Pathologist access required."

    def has_permission(self, request, view):
        return _has_role(request.user, Role.PATHOLOGIST)


class IsPatient(BasePermission):
    """Own records, booking, own prescriptions and queue status."""

    message = "Patient access required."

    def has_permission(self, request, view):
        return _has_role(request.user, Role.PATIENT)


class IsDoctorOrAdmin(BasePermission):
    """Clinical endpoints shared by doctors and super admins."""

    message = "Doctor or super admin access required."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_superuser or user.role in (Role.DOCTOR, Role.SUPER_ADMIN))
        )


class IsStaffUser(BasePermission):
    """Any internal staff member (non-patient authenticated user)."""

    message = "Staff access required."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and (user.is_staff or user.role != Role.PATIENT)
        )


class IsMedicalStaff(BasePermission):
    """Doctors, nurses and super admins."""

    message = "Medical staff access required."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_superuser or user.role in (Role.DOCTOR, Role.NURSE, Role.SUPER_ADMIN))
        )


class IsFrontDesk(BasePermission):
    """Nurses and receptionists: check-in, triage entry, scheduling, queue."""

    message = "Front-desk access required."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_superuser or user.role in (Role.NURSE, Role.RECEPTIONIST, Role.SUPER_ADMIN))
        )
