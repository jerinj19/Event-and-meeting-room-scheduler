import zoneinfo
from django.utils import timezone


class TimezoneMiddleware:
    """
    Middleware that activates the client's timezone if provided in the
    'X-Timezone' HTTP request header (e.g. 'Asia/Kolkata', 'America/New_York').
    Falls back to settings.TIME_ZONE (UTC) when omitted or invalid.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        tz_name = request.headers.get("X-Timezone") or request.META.get("HTTP_X_TIMEZONE")
        if tz_name:
            try:
                timezone.activate(zoneinfo.ZoneInfo(tz_name.strip()))
            except Exception:
                timezone.deactivate()
        else:
            timezone.deactivate()

        try:
            response = self.get_response(request)
        finally:
            timezone.deactivate()

        return response
