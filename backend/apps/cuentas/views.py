from django.db import transaction
from django.db.models import Q
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.auditoria.services import registrar_actividad

from .models import Rol, Usuario, UsuarioRol
from .permissions import EsAdministrador, PuedeGestionarUsuarios
from .serializers import (
    AsignarRolUsuarioSerializer,
    CambiarEstadoUsuarioSerializer,
    CerrarSesionSerializer,
    NovaTokenObtainPairSerializer,
    RegistroUsuarioSerializer,
    UsuarioSerializer,
)


class NovaTokenObtainPairView(
    TokenObtainPairView
):
    serializer_class = (
        NovaTokenObtainPairSerializer
    )


class RegistroUsuarioView(
    generics.CreateAPIView
):
    serializer_class = (
        RegistroUsuarioSerializer
    )

    permission_classes = [
        permissions.AllowAny
    ]


class PerfilActualView(
    generics.RetrieveUpdateAPIView
):
    serializer_class = (
        UsuarioSerializer
    )

    def get_object(self):
        return self.request.user


class CerrarSesionView(APIView):
    permission_classes = [
        permissions.AllowAny
    ]

    def post(
        self,
        request
    ):
        serializer = (
            CerrarSesionSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        refresh = (
            serializer.validated_data[
                'refresh'
            ]
        )

        try:
            token = RefreshToken(
                refresh
            )

            token.blacklist()

        except TokenError:
            return Response(
                {
                    'detail':
                        'El refresh token es inválido, '
                        'expiró o ya fue utilizado.'
                },
                status=
                    status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {
                'detail':
                    'Sesión cerrada correctamente.'
            },
            status=
                status.HTTP_200_OK
        )


class UsuarioPagination(
    PageNumberPagination
):
    page_size = 10

    page_size_query_param = (
        'page_size'
    )

    max_page_size = 100


class UsuarioViewSet(
    viewsets.ReadOnlyModelViewSet
):
    serializer_class = (
        UsuarioSerializer
    )

    permission_classes = [
        PuedeGestionarUsuarios
    ]

    pagination_class = (
        UsuarioPagination
    )

    def get_queryset(self):
        qs = (
            Usuario.objects
            .prefetch_related(
                'asignaciones_roles__rol'
            )
        )

        if self.action == 'list':

            busqueda = (
                self.request
                .query_params
                .get(
                    'search',
                    ''
                )
                .strip()
            )

            estado = (
                self.request
                .query_params
                .get(
                    'estado',
                    ''
                )
                .strip()
                .upper()
            )

            if busqueda:
                qs = qs.filter(
                    Q(
                        nombre_completo__icontains=
                            busqueda
                    )
                    |
                    Q(
                        correo__icontains=
                            busqueda
                    )
                )

            estados_validos = {
                Usuario.Estado.ACTIVO,
                Usuario.Estado.BLOQUEADO,
                Usuario.Estado.INACTIVO,
            }

            if estado in estados_validos:
                qs = qs.filter(
                    estado=estado
                )

        return qs.order_by(
            'nombre_completo',
            'id'
        )

    @action(
        detail=True,
        methods=['patch'],
        url_path='estado'
    )
    def cambiar_estado(
        self,
        request,
        pk=None
    ):
        usuario = self.get_object()

        serializer = (
            CambiarEstadoUsuarioSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        nuevo_estado = (
            serializer.validated_data[
                'estado'
            ]
        )

        if (
            usuario.id
            == request.user.id
        ):
            return Response(
                {
                    'detail':
                        'No puedes cambiar '
                        'el estado de tu propia cuenta.'
                },
                status=
                    status.HTTP_400_BAD_REQUEST
            )

        usuario.estado = (
            nuevo_estado
        )

        usuario.save(
            update_fields=[
                'estado',
                'actualizado_en'
            ]
        )

        registrar_actividad(
            usuario=request.user,
            accion=
                'USUARIO_ESTADO_CAMBIADO',
            tipo_entidad='Usuario',
            entidad_id=usuario.id,
            metadatos={
                'nuevo_estado':
                    nuevo_estado,

                'correo':
                    usuario.correo
            },
            request=request
        )

        return Response(
            UsuarioSerializer(
                usuario
            ).data,
            status=
                status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], url_path='roles', permission_classes=[EsAdministrador])
    @transaction.atomic
    def asignar_rol(self, request, pk=None):
        usuario = self.get_object()
        serializer = AsignarRolUsuarioSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        codigo = serializer.validated_data['rol']
        rol = Rol.objects.filter(codigo=codigo).first()
        if rol is None:
            return Response(
                {'detail': 'El rol no está configurado. Ejecuta preparar_base antes de asignarlo.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        _, creado = UsuarioRol.objects.get_or_create(usuario=usuario, rol=rol)
        if creado:
            registrar_actividad(
                usuario=request.user,
                accion='USUARIO_ROL_ASIGNADO',
                tipo_entidad='Usuario',
                entidad_id=usuario.id,
                metadatos={'rol': codigo, 'correo': usuario.correo},
                request=request,
            )
        # El objeto original puede tener las asignaciones anteriores precargadas.
        usuario._prefetched_objects_cache = {}
        return Response(UsuarioSerializer(usuario).data, status=status.HTTP_200_OK)

