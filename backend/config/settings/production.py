"""Production settings — strict, refuses insecure defaults."""

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401,F403

if DEBUG:  # pragma: no cover
    raise ImproperlyConfigured("DEBUG must be False in production.")

if SECRET_KEY == "django-insecure-dev-only-change-me" or not SECRET_KEY:  # pragma: no cover
    raise ImproperlyConfigured("SECRET_KEY must be set to a strong value in production.")

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
