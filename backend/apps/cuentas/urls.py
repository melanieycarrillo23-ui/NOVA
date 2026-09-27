from django.urls import path
from .views import RegistroUsuarioView, PerfilActualView
from .views import (
    RegistroUsuarioView,
    PerfilActualView,
    CerrarSesionView,
)

urlpatterns = [
    path('registro/', RegistroUsuarioView.as_view(), name='registro'),
    path('me/', PerfilActualView.as_view(), name='perfil-actual'),
    path('logout/', CerrarSesionView.as_view(), name='logout'),
]
