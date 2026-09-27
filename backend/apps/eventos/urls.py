from django.urls import include, path
from rest_framework.routers import DefaultRouter
from apps.cuentas.views import UsuarioViewSet
from .views import (
    CategoriaEventoViewSet, LugarViewSet, EventoViewSet, TipoEntradaViewSet,
    MiembroEquipoEventoViewSet, InscripcionViewSet, EntradaViewSet,
    EscanearQRView, ReporteEventoView
)

router = DefaultRouter()
router.register('categorias', CategoriaEventoViewSet, basename='categorias')
router.register('lugares', LugarViewSet, basename='lugares')
router.register('eventos', EventoViewSet, basename='eventos')
router.register('tipos-entrada', TipoEntradaViewSet, basename='tipos-entrada')
router.register('equipo-eventos', MiembroEquipoEventoViewSet, basename='equipo-eventos')
router.register('inscripciones', InscripcionViewSet, basename='inscripciones')
router.register('entradas', EntradaViewSet, basename='entradas')
router.register('usuarios', UsuarioViewSet, basename='usuarios')

urlpatterns = [
    path('', include(router.urls)),
    path('validaciones/escanear/', EscanearQRView.as_view(), name='escanear-qr'),
    path('reportes/evento/<int:evento_id>/', ReporteEventoView.as_view(), name='reporte-evento'),
]
