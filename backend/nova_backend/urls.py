from django.contrib import admin
from django.urls import include, path

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)

from apps.cuentas.views import (
    NovaTokenObtainPairView,
)


urlpatterns = [
    path(
        'admin/',
        admin.site.urls
    ),

    path(
        'api/schema/',
        SpectacularAPIView.as_view(),
        name='api-schema'
    ),

    path(
        'api/documentacion/',
        SpectacularSwaggerView.as_view(
            url_name='api-schema'
        ),
        name='api-documentacion'
    ),

    path(
        'api/auth/token/',
        NovaTokenObtainPairView.as_view(),
        name='token_obtain_pair'
    ),

    path(
        'api/auth/token/refresh/',
        TokenRefreshView.as_view(),
        name='token_refresh'
    ),

    path(
        'api/auth/',
        include('apps.cuentas.urls')
    ),

    path(
        'api/',
        include('apps.eventos.urls')
    ),
]