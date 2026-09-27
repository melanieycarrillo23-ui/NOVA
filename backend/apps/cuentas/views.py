from rest_framework import generics, permissions, viewsets
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from .models import Usuario
from .permissions import EsAdministrador
from .serializers import (NovaTokenObtainPairSerializer,RegistroUsuarioSerializer,UsuarioSerializer,CerrarSesionSerializer,CambiarEstadoUsuarioSerializer)
from rest_framework.decorators import action

class NovaTokenObtainPairView(TokenObtainPairView):
    serializer_class = NovaTokenObtainPairSerializer


class RegistroUsuarioView(generics.CreateAPIView):
    serializer_class = RegistroUsuarioSerializer
    permission_classes = [permissions.AllowAny]


class PerfilActualView(generics.RetrieveUpdateAPIView):
    serializer_class = UsuarioSerializer

    def get_object(self):
        return self.request.user

class CerrarSesionView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = CerrarSesionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        refresh = serializer.validated_data['refresh']

        try:
            token = RefreshToken(refresh)
            token.blacklist()
        except TokenError:
            return Response(
                {
                    'detail':
                    'El refresh token es inválido, expiró '
                    'o ya fue utilizado.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {
                'detail':
                'Sesión cerrada correctamente.'
            },
            status=status.HTTP_200_OK
        )

class UsuarioViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Usuario.objects.prefetch_related(
        'asignaciones_roles__rol'
    ).all()

    serializer_class = UsuarioSerializer
    permission_classes = [EsAdministrador]

    @action(
        detail=True,
        methods=['patch'],
        url_path='estado'
    )
    def cambiar_estado(self, request, pk=None):
        usuario = self.get_object()

        serializer = CambiarEstadoUsuarioSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        nuevo_estado = serializer.validated_data[
            'estado'
        ]

        if usuario.id == request.user.id:
            return Response(
                {
                    'detail':
                    'No puedes cambiar el estado de tu propia cuenta.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        usuario.estado = nuevo_estado

        usuario.save(
            update_fields=[
                'estado',
                'actualizado_en'
            ]
        )

        return Response(
            UsuarioSerializer(usuario).data,
            status=status.HTTP_200_OK
        )
