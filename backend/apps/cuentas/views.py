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

from .models import Usuario
from .permissions import PuedeGestionarUsuarios
from .serializers import (
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
            Evento.objects
            .select_related(
                'categoria',
                'lugar',
                'creado_por',
            )
        )

        usuario = self.request.user

        if (
            usuario.is_authenticated
            and es_admin(usuario)
        ):
            qs_visible = qs

        elif self.action in (
            'list',
            'retrieve',
        ):
            publico = Q(
                estado=Evento.Estado.PUBLICADO,
                visibilidad=Evento.Visibilidad.PUBLICO,
            )

            if usuario.is_authenticated:
                qs_visible = qs.filter(
                    publico
                    |
                    Q(
                        creado_por=usuario
                    )
                    |
                    Q(
                        equipo__usuario=usuario
                    )
                ).distinct()

            else:
                qs_visible = qs.filter(
                    publico
                )

        else:
            qs_visible = qs


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

            modalidad = (
                self.request
                .query_params
                .get(
                    'modalidad',
                    ''
                )
                .strip()
                .upper()
            )

            if busqueda:
                qs_visible = qs_visible.filter(
                    Q(
                        nombre__icontains=
                            busqueda
                    )
                    |
                    Q(
                        categoria__nombre__icontains=
                            busqueda
                    )
                    |
                    Q(
                        lugar__nombre__icontains=
                            busqueda
                    )
                    |
                    Q(
                        lugar__ciudad__icontains=
                            busqueda
                    )
                    |
                    Q(
                        descripcion_corta__icontains=
                            busqueda
                    )
                )

            modalidades_validas = {
                Evento.Modalidad.PRESENCIAL,
                Evento.Modalidad.VIRTUAL,
                Evento.Modalidad.HIBRIDO,
            }

            if (
                modalidad
                in modalidades_validas
            ):
                qs_visible = qs_visible.filter(
                    modalidad=modalidad
                )

            qs_visible = qs_visible.order_by(
                'fecha_hora_inicio',
                'id'
            )

        return qs_visible

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