"""Shared DRF utilities: consistent envelopes, pagination, error handler."""

from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import exception_handler


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


def success_response(data=None, message: str = "OK", status_code: int = status.HTTP_200_OK) -> Response:
    return Response({"success": True, "message": message, "data": data}, status=status_code)


def error_response(message: str, errors=None, status_code: int = status.HTTP_400_BAD_REQUEST) -> Response:
    return Response({"success": False, "message": message, "errors": errors or {}}, status=status_code)


def custom_exception_handler(exc, context):
    """Wrap DRF errors in the project envelope; never leak internals in prod."""
    response = exception_handler(exc, context)
    if response is None:
        return None
    if isinstance(response.data, dict) and "success" in response.data:
        return response
    detail = response.data
    if isinstance(detail, dict) and "detail" in detail and len(detail) == 1:
        message = str(detail["detail"])
        errors = {}
    elif isinstance(detail, dict):
        message = "Validation failed."
        errors = detail
    else:
        message = str(detail)
        errors = {}
    response.data = {"success": False, "message": message, "errors": errors}
    return response
