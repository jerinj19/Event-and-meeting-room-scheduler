"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
import logging

from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


logger = logging.getLogger('users.api')


def api_not_found(request, exception):
    if request.path.startswith('/api/'):
        logger.warning(
            'API error status=404 code=NOT_FOUND method=%s path=%s',
            request.method,
            request.path,
        )
        return JsonResponse(
            {
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'The requested resource was not found.',
                    'details': {},
                }
            },
            status=404,
        )
    return JsonResponse({'detail': 'Not found.'}, status=404)


handler404 = 'config.urls.api_not_found'

from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('bookings.urls')),
    path('api/', include('users.urls')),
    path('api/', include('rooms.urls')),
]

