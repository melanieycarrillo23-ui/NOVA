from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Usuario, Rol, UsuarioRol


class UsuarioSerializer(serializers.ModelSerializer):
    telefono = serializers.RegexField(regex=r'\A3[0-9]{9}\Z', required=False, allow_blank=True, trim_whitespace=False, error_messages={'invalid': 'Ingresa un celular de 10 dígitos que empiece por 3, sin +57, espacios ni letras.'})
    roles = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = ['id', 'nombre_completo', 'correo', 'telefono', 'url_imagen_perfil', 'estado', 'roles', 'creado_en']
        read_only_fields = ['id', 'estado', 'roles', 'creado_en']

    def get_roles(self, obj):
        return list(obj.asignaciones_roles.select_related('rol').values_list('rol__codigo', flat=True))


class RegistroUsuarioSerializer(serializers.ModelSerializer):
    telefono = serializers.RegexField(regex=r'\A3[0-9]{9}\Z', required=False, allow_blank=True, trim_whitespace=False, error_messages={'invalid': 'Ingresa un celular de 10 dígitos que empiece por 3, sin +57, espacios ni letras.'})
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = Usuario
        fields = ['id', 'nombre_completo', 'correo', 'telefono', 'password']
        read_only_fields = ['id']

    def create(self, validated_data):
        password = validated_data.pop('password')
        usuario = Usuario.objects.create_user(password=password, **validated_data)
        rol_usuario, _ = Rol.objects.get_or_create(codigo='USUARIO', defaults={'nombre': 'Usuario'})
        UsuarioRol.objects.get_or_create(usuario=usuario, rol=rol_usuario)
        return usuario


class NovaTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['nombre'] = user.nombre_completo
        token['roles'] = list(user.asignaciones_roles.select_related('rol').values_list('rol__codigo', flat=True))
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['usuario'] = UsuarioSerializer(self.user).data
        return data

class CerrarSesionSerializer(serializers.Serializer):
    refresh = serializers.CharField()

class CambiarEstadoUsuarioSerializer(serializers.Serializer):
    estado = serializers.ChoiceField(
        choices=Usuario.Estado.choices
    )


class AsignarRolUsuarioSerializer(serializers.Serializer):
    rol = serializers.ChoiceField(choices=['ORGANIZADOR', 'STAFF'])

