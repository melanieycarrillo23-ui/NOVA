from rest_framework import serializers
from apps.cuentas.serializers import UsuarioSerializer
from .models import (
    CategoriaEvento, Lugar, Evento, MiembroEquipoEvento, TipoEntrada,
    Inscripcion, Entrada, Asistencia, Notificacion
)


class CategoriaEventoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaEvento
        fields = '__all__'


class LugarSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lugar
        fields = '__all__'


class EventoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    lugar_nombre = serializers.CharField(source='lugar.nombre', read_only=True)
    creador_nombre = serializers.CharField(source='creado_por.nombre_completo', read_only=True)

    class Meta:
        model = Evento
        fields = [
            'id', 'creado_por', 'creador_nombre', 'categoria', 'categoria_nombre', 'lugar', 'lugar_nombre',
            'nombre', 'identificador_url', 'descripcion_corta', 'descripcion', 'modalidad', 'visibilidad',
            'estado', 'capacidad', 'fecha_hora_inicio', 'fecha_hora_fin', 'inicio_inscripciones',
            'cierre_inscripciones', 'url_virtual', 'url_imagen_portada', 'creado_en', 'actualizado_en'
        ]
        read_only_fields = ['id', 'creado_por', 'creado_en', 'actualizado_en']
        extra_kwargs = {'identificador_url': {'required': False}}

    def validate(self, attrs):
        inicio = attrs.get('fecha_hora_inicio', getattr(self.instance, 'fecha_hora_inicio', None))
        fin = attrs.get('fecha_hora_fin', getattr(self.instance, 'fecha_hora_fin', None))
        if inicio and fin and fin <= inicio:
            raise serializers.ValidationError('La fecha de finalización debe ser posterior al inicio.')
        return attrs


class MiembroEquipoEventoSerializer(serializers.ModelSerializer):
    usuario_detalle = UsuarioSerializer(source='usuario', read_only=True)
    rol_codigo = serializers.CharField(source='rol.codigo', read_only=True)

    class Meta:
        model = MiembroEquipoEvento
        fields = ['id', 'evento', 'usuario', 'usuario_detalle', 'rol', 'rol_codigo', 'estado', 'asignado_en']
        read_only_fields = ['id', 'asignado_en']


class TipoEntradaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoEntrada
        fields = '__all__'
        read_only_fields = ['id', 'creado_en', 'actualizado_en']


class InscripcionSerializer(serializers.ModelSerializer):
    evento_nombre = serializers.CharField(source='evento.nombre', read_only=True)
    usuario_nombre = serializers.CharField(source='usuario.nombre_completo', read_only=True)

    class Meta:
        model = Inscripcion
        fields = ['id', 'evento', 'evento_nombre', 'usuario', 'usuario_nombre', 'estado', 'inscrito_en', 'cancelado_en']
        read_only_fields = ['id', 'usuario', 'inscrito_en', 'cancelado_en']


class EntradaSerializer(serializers.ModelSerializer):
    evento_id = serializers.IntegerField(source='inscripcion.evento_id', read_only=True)
    evento_nombre = serializers.CharField(source='inscripcion.evento.nombre', read_only=True)
    tipo_entrada_nombre = serializers.CharField(source='tipo_entrada.nombre', read_only=True)

    class Meta:
        model = Entrada
        fields = [
            'id', 'inscripcion', 'evento_id', 'evento_nombre', 'tipo_entrada', 'tipo_entrada_nombre',
            'codigo_publico', 'estado', 'emitida_en', 'utilizada_en', 'cancelada_en'
        ]
        read_only_fields = fields


class AsistenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asistencia
        fields = '__all__'
        read_only_fields = fields


class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = '__all__'
        read_only_fields = ['id', 'usuario', 'creado_en']


class InscribirseSerializer(serializers.Serializer):
    tipo_entrada_id = serializers.IntegerField()


class EscanearQRSerializer(serializers.Serializer):
    evento_id = serializers.IntegerField()
    token_qr = serializers.CharField(max_length=2000)
    informacion_dispositivo = serializers.CharField(max_length=255, required=False, allow_blank=True)

class AsignarMiembroEquipoSerializer(serializers.Serializer):
    correo = serializers.EmailField()

    rol = serializers.ChoiceField(
        choices=['ORGANIZADOR', 'STAFF'],
        default='STAFF'
    )
