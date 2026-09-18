import logging

from rest_framework.views import exception_handler as drf_exception_handler


logger = logging.getLogger('users.api')


def api_exception_handler(exc, context):
    """
    Wraps DRF's default exception handling so every error response follows
    the project-wide envelope defined in api_contract.md:

        { "error": { "code": ..., "message": ..., "details": {...} } }

    Views that already raise a pre-shaped {"error": {...}} payload (e.g.
    CancelBookingView) pass straight through unchanged.
    """
    response = drf_exception_handler(exc, context)

    if response is None:
        logger.exception(
            'Unhandled API exception method=%s path=%s',
            getattr(context.get('request'), 'method', 'UNKNOWN'),
            getattr(context.get('request'), 'path', 'UNKNOWN'),
        )
        return None

    if isinstance(response.data, dict) and "error" in response.data:
        logger.warning(
            'API error status=%s code=%s method=%s path=%s',
            response.status_code,
            response.data['error'].get('code', 'ERROR'),
            context['request'].method,
            context['request'].path,
        )
        return response

    code_map = {
        400: "VALIDATION_ERROR",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        429: "THROTTLED",
    }

    details = {}
    message = response.data
    if isinstance(response.data, dict):
        if "detail" in response.data:
            message = str(response.data["detail"])
            details = {
                key: value for key, value in response.data.items() if key != 'detail'
            }
        else:
            details = response.data
            message = 'Request validation failed.'

    response.data = {
        "error": {
            "code": code_map.get(response.status_code, "ERROR"),
            "message": message,
            "details": details,
        }
    }
    logger.warning(
        'API error status=%s code=%s method=%s path=%s',
        response.status_code,
        response.data['error']['code'],
        context['request'].method,
        context['request'].path,
    )
    return response
