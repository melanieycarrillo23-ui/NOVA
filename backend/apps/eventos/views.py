import hashlib
import io
import secrets

import qrcode
from django.core import signing
from django.db import transaction
from django.db.models import Count, Q
from django.http import HttpResponse
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView



from apps.cuentas.models import Rol, Usuario, UsuarioRol
from apps.cuentas.permissions import usuario_tiene_rol, EsAdministrador
from apps.cuentas.views import UsuarioViewSet
from .models import (
    CategoriaEvento, Lugar, Evento, MiembroEquipoEvento, TipoEntrada,
    Inscripcion, Entrada, EscaneoEntrada, Asistencia, Notificacion
)
from .permissions import es_admin, es_organizador_evento, es_staff_evento
from .serializers import (
    CategoriaEventoSerializer,LugarSerializer,
    EventoSerializer,MiembroEquipoEventoSerializer,
    TipoEntradaSerializer,InscripcionSerializer,
    EntradaSerializer,NotificacionSerializer,
    InscribirseSerializer, EscanearQRSerializer,
    AsignarMiembroEquipoSerializer
)


def crear_identificador_evento(nombre):
    base = slugify(nombre)[:180] or 'evento'
    candidato = base
    while Evento.objects.filter(identificador_url=candidato).exists():
        candidato = f'{base}-{secrets.token_hex(3)}'
    return candidato


def token_qr_para_codigo(codigo_publico):
    firmador = signing.Signer(salt='nova.qr.v1')
    return firmador.sign(codigo_publico)

def hash_token(token):
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def generar_codigo_publico():
    while True:
        codigo = f'NOVA-{timezone.now():%Y}-{secrets.token_hex(4).upper()}'
        if not Entrada.objects.filter(codigo_publico=codigo).exists():
            return codigo


class CategoriaEventoViewSet(viewsets.ModelViewSet):
    queryset = CategoriaEvento.objects.all()
    serializer_class = CategoriaEventoSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [EsAdministrador()]

    def perform_create(self, serializer):
        serializer.save()


class LugarViewSet(viewsets.ModelViewSet):
    queryset = Lugar.objects.all()
    serializer_class = LugarSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        if not usuario_tiene_rol(self.request.user, 'ORGANIZADOR', 'ADMIN'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Solo organizadores o administradores pueden crear lugares.')
        serializer.save()

    def perform_update(self, serializer):
        if not es_admin(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Solo un administrador puede modificar lugares compartidos.')
        serializer.save()

    def perform_destroy(self, instance):
        if not es_admin(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Solo un administrador puede eliminar lugares compartidos.')
        instance.delete()


class EventoViewSet(viewsets.ModelViewSet):
    serializer_class = EventoSerializer

    def get_queryset(self):
        qs = Evento.objects.select_related('categoria', 'lugar', 'creado_por')
        usuario = self.request.user
        if usuario.is_authenticated and es_admin(usuario):
            return qs
        if self.action in ('list', 'retrieve'):
            publico = Q(estado=Evento.Estado.PUBLICADO, visibilidad=Evento.Visibilidad.PUBLICO)
            if usuario.is_authenticated:
                return qs.filter(publico | Q(creado_por=usuario) | Q(equipo__usuario=usuario)).distinct()
            return qs.filter(publico)
        return qs

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        if not usuario_tiene_rol(self.request.user, 'ORGANIZADOR', 'ADMIN'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Necesitas el rol ORGANIZADOR para crear eventos.')
        identificador = serializer.validated_data.get('identificador_url') or crear_identificador_evento(serializer.validated_data['nombre'])
        evento = serializer.save(creado_por=self.request.user, identificador_url=identificador)
        rol_organizador, _ = Rol.objects.get_or_create(codigo='ORGANIZADOR', defaults={'nombre': 'Organizador'})
        MiembroEquipoEvento.objects.get_or_create(
            evento=evento, usuario=self.request.user, rol=rol_organizador,
            defaults={'asignado_por': self.request.user}
        )

    def perform_update(self, serializer):
        if not es_organizador_evento(self.request.user, self.get_object()):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('No puedes modificar este evento.')
        serializer.save()

    def perform_destroy(self, instance):
        if not es_organizador_evento(self.request.user, instance):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('No puedes eliminar este evento.')
        instance.delete()

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def mios(self, request):
        qs = Evento.objects.select_related('categoria', 'lugar', 'creado_por').filter(
            Q(creado_por=request.user) | Q(equipo__usuario=request.user, equipo__rol__codigo='ORGANIZADOR')
        ).distinct()
        return Response(self.get_serializer(qs, many=True).data)

    @action(
        detail=False,
        methods=['get'],
        permission_classes=[permissions.IsAuthenticated]
    )
    def asignados(self, request):
        qs = Evento.objects.select_related(
            'categoria',
            'lugar',
            'creado_por'
        ).filter(
            equipo__usuario=request.user,
            equipo__rol__codigo='STAFF',
            equipo__estado=MiembroEquipoEvento.Estado.ACTIVO
        ).distinct()

        return Response(
            self.get_serializer(qs, many=True).data
        )


    @action(
        detail=True,
        methods=['get'],
        url_path='buscar-usuario-equipo',
        permission_classes=[permissions.IsAuthenticated]
    )
    def buscar_usuario_equipo(self, request, pk=None):
        evento = self.get_object()

        if not es_organizador_evento(request.user, evento):
            return Response(
                {
                    'detail':
                    'No puedes administrar el equipo de este evento.'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        correo = request.query_params.get(
            'correo',
            ''
        ).strip()

        if not correo:
            return Response(
                {'detail': 'Debes indicar un correo.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        usuario = Usuario.objects.filter(
            correo__iexact=correo,
            estado=Usuario.Estado.ACTIVO
        ).first()

        if not usuario:
            return Response(
                {
                    'detail':
                    'No existe un usuario activo con ese correo.'
                },
                status=status.HTTP_404_NOT_FOUND
            )

        roles_evento = list(
            MiembroEquipoEvento.objects.filter(
                evento=evento,
                usuario=usuario,
                estado=MiembroEquipoEvento.Estado.ACTIVO
            ).values_list(
                'rol__codigo',
                flat=True
            )
        )

        return Response({
            'id': usuario.id,
            'nombre_completo': usuario.nombre_completo,
            'correo': usuario.correo,
            'roles_evento': roles_evento
        })


    @action(
        detail=True,
        methods=['post'],
        url_path='asignar-equipo',
        permission_classes=[permissions.IsAuthenticated]
    )
    @transaction.atomic
    def asignar_equipo(self, request, pk=None):
        evento = self.get_object()

        if not es_organizador_evento(request.user, evento):
            return Response(
                {
                    'detail':
                    'No puedes administrar el equipo de este evento.'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = AsignarMiembroEquipoSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        correo = serializer.validated_data['correo']
        codigo_rol = serializer.validated_data['rol']

        usuario = Usuario.objects.filter(
            correo__iexact=correo,
            estado=Usuario.Estado.ACTIVO
        ).first()

        if not usuario:
            return Response(
                {
                    'detail':
                    'No existe un usuario activo con ese correo.'
                },
                status=status.HTTP_404_NOT_FOUND
            )

        rol = Rol.objects.get(
            codigo=codigo_rol
        )

        UsuarioRol.objects.get_or_create(
            usuario=usuario,
            rol=rol
        )

        miembro, creado = (
            MiembroEquipoEvento.objects.get_or_create(
                evento=evento,
                usuario=usuario,
                rol=rol,
                defaults={
                    'asignado_por': request.user,
                    'estado':
                    MiembroEquipoEvento.Estado.ACTIVO
                }
            )
        )

        if (
            not creado
            and miembro.estado
            != MiembroEquipoEvento.Estado.ACTIVO
        ):
            miembro.estado = (
                MiembroEquipoEvento.Estado.ACTIVO
            )

            miembro.asignado_por = request.user

            miembro.save(
                update_fields=[
                    'estado',
                    'asignado_por'
                ]
            )

        return Response(
            MiembroEquipoEventoSerializer(
                miembro
            ).data,
            status=(
                status.HTTP_201_CREATED
                if creado
                else status.HTTP_200_OK
            )
        )


    @action(
        detail=True,
        methods=['post'],
        permission_classes=[permissions.IsAuthenticated]
    )
    @transaction.atomic
    def inscribirse(self, request, pk=None):
        evento = self.get_object()

        serializer = InscribirseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if evento.estado != Evento.Estado.PUBLICADO:
            return Response(
                {
                    'detail':
                    'El evento no está disponible para inscripciones.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        ahora = timezone.now()

        if (
            evento.inicio_inscripciones
            and ahora < evento.inicio_inscripciones
        ):
            return Response(
                {
                    'detail':
                    'Las inscripciones aún no han iniciado.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if (
            evento.cierre_inscripciones
            and ahora > evento.cierre_inscripciones
        ):
            return Response(
                {
                    'detail':
                    'Las inscripciones ya finalizaron.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        inscritos = evento.inscripciones.filter(
            estado=Inscripcion.Estado.CONFIRMADA
        ).count()

        if evento.capacidad and inscritos >= evento.capacidad:
            return Response(
                {
                    'detail':
                    'El evento alcanzó su capacidad.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            tipo = TipoEntrada.objects.get(
                id=serializer.validated_data['tipo_entrada_id'],
                evento=evento,
                estado=TipoEntrada.Estado.ACTIVO
            )
        except TipoEntrada.DoesNotExist:
            return Response(
                {
                    'detail':
                    'Tipo de entrada inválido.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        entradas_tipo = tipo.entradas.exclude(
            estado=Entrada.Estado.CANCELADA
        ).count()

        if tipo.cupo and entradas_tipo >= tipo.cupo:
            return Response(
                {
                    'detail':
                    'No quedan cupos para este tipo de entrada.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        inscripcion, creada = Inscripcion.objects.get_or_create(
            evento=evento,
            usuario=request.user,
            defaults={
                'estado': Inscripcion.Estado.CONFIRMADA
            }
        )

        if (
            not creada
            and inscripcion.estado != Inscripcion.Estado.CANCELADA
        ):
            return Response(
                {
                    'detail':
                    'Ya estás inscrito en este evento.'
                },
                status=status.HTTP_409_CONFLICT
            )

        if not creada:
            inscripcion.estado = Inscripcion.Estado.CONFIRMADA
            inscripcion.cancelado_en = None

            inscripcion.save(
                update_fields=[
                    'estado',
                    'cancelado_en'
                ]
            )

        codigo = generar_codigo_publico()
        token = token_qr_para_codigo(codigo)

        entrada, _ = Entrada.objects.update_or_create(
            inscripcion=inscripcion,
            defaults={
                'tipo_entrada': tipo,
                'codigo_publico': codigo,
                'hash_token_qr': hash_token(token),
                'estado': Entrada.Estado.ACTIVA,
                'utilizada_en': None,
                'cancelada_en': None,
            }
        )

        Notificacion.objects.create(
            usuario=request.user,
            evento=evento,
            titulo='Inscripción confirmada',
            contenido=(
                f'Tu inscripción a {evento.nombre} '
                f'fue confirmada.'
            ),
            tipo='INSCRIPCION'
        )

        return Response(
            EntradaSerializer(entrada).data,
            status=status.HTTP_201_CREATED
        )
    @action(
        detail=True,
        methods=['get'],
        permission_classes=[permissions.IsAuthenticated]
        )
    def asistentes(self, request, pk=None):
            evento = self.get_object()

            if not es_staff_evento(request.user, evento):
                return Response(
                    {
                        'detail':
                        'No tienes acceso a los asistentes de este evento.'
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

            qs = Inscripcion.objects.filter(
                evento=evento
            ).select_related(
                'usuario'
            )

            return Response(
                InscripcionSerializer(
                    qs,
                    many=True
                ).data
            )

class TipoEntradaViewSet(viewsets.ModelViewSet):
    queryset = TipoEntrada.objects.select_related('evento').order_by('id')
    serializer_class = TipoEntradaSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        evento_id = self.request.query_params.get('evento')
        if evento_id:
            qs = qs.filter(evento_id=evento_id)
        return qs

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        evento = serializer.validated_data['evento']
        if not es_organizador_evento(self.request.user, evento):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('No puedes gestionar entradas de este evento.')
        serializer.save()

    def perform_update(self, serializer):
        actual = self.get_object()
        destino = serializer.validated_data.get('evento', actual.evento)
        if not es_organizador_evento(self.request.user, actual.evento) or not es_organizador_evento(self.request.user, destino):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('No puedes gestionar entradas de este evento.')
        serializer.save()

    def perform_destroy(self, instance):
        if not es_organizador_evento(self.request.user, instance.evento):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('No puedes eliminar tipos de entrada de este evento.')
        instance.delete()


class MiembroEquipoEventoViewSet(viewsets.ModelViewSet):
    queryset = MiembroEquipoEvento.objects.select_related('evento', 'usuario', 'rol').all()
    serializer_class = MiembroEquipoEventoSerializer

    def get_queryset(self):
        qs = super().get_queryset()

        evento_id = self.request.query_params.get('evento')
        # ADMIN puede consultar todo.
        if es_admin(self.request.user):
            if evento_id:
                return qs.filter(evento_id=evento_id)
            return qs

        # Cuando se consulta el equipo completo de un evento.
        if evento_id:
            try:
                evento = Evento.objects.get(
                    id=evento_id
                )
            except Evento.DoesNotExist:
                return qs.none()

            if es_staff_evento(
                self.request.user,
                evento
            ):
                return qs.filter(
                    evento=evento
                )

            return qs.none()

        # Para acciones individuales:
        # retrieve, update, partial_update y destroy.
        pk = self.kwargs.get('pk')

        if pk:
            try:
                miembro = qs.get(pk=pk)
            except MiembroEquipoEvento.DoesNotExist:
                return qs.none()

            # El organizador del evento puede gestionar
            # cualquier miembro de ese evento.
            if es_organizador_evento(
                self.request.user,
                miembro.evento
            ):
                return qs.filter(pk=pk)

            # Un usuario puede consultar su propia membresía.
            if miembro.usuario_id == self.request.user.id:
                return qs.filter(pk=pk)

            return qs.none()

        # Sin evento ni ID, cada usuario ve
        # solamente sus propias asignaciones.
        return qs.filter(
            usuario=self.request.user
        )




        
    def perform_create(self, serializer):
        evento = serializer.validated_data['evento']
        rol = serializer.validated_data['rol']
        if rol.codigo not in ('ORGANIZADOR', 'STAFF'):
            from rest_framework.exceptions import ValidationError
            raise ValidationError('En el equipo de un evento solo se asignan ORGANIZADOR o STAFF.')
        if not es_organizador_evento(self.request.user, evento):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('No puedes administrar el equipo de este evento.')
        UsuarioRol.objects.get_or_create(usuario=serializer.validated_data['usuario'], rol=rol)
        serializer.save(asignado_por=self.request.user)

    def perform_update(self, serializer):
        actual = self.get_object()
        destino = serializer.validated_data.get(
            'evento',
            actual.evento
        )

        rol = serializer.validated_data.get(
            'rol',
            actual.rol
        )

        usuario = serializer.validated_data.get(
            'usuario',
            actual.usuario
        )

        estado = serializer.validated_data.get(
            'estado',
            actual.estado
        )

        if rol.codigo not in (
            'ORGANIZADOR',
            'STAFF'
        ):
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                'En el equipo de un evento solo se asignan '
                'ORGANIZADOR o STAFF.'
            )

        if (
            not es_organizador_evento(
                self.request.user,
                actual.evento
            )
            or not es_organizador_evento(
                self.request.user,
                destino
            )
        ):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied(
                'No puedes modificar este equipo.'
            )

        es_principal = (
            actual.usuario_id == actual.evento.creado_por_id
            and actual.rol.codigo == 'ORGANIZADOR'
        )

        if es_principal:
            cambia_principal = (
                usuario.id != actual.usuario_id
                or destino.id != actual.evento_id
                or rol.codigo != 'ORGANIZADOR'
                or estado != actual.Estado.ACTIVO
            )

            if cambia_principal:
                from rest_framework.exceptions import ValidationError

                raise ValidationError(
                    'El organizador principal del evento '
                    'no puede ser modificado.'
                )

        UsuarioRol.objects.get_or_create(
            usuario=usuario,
            rol=rol
        )

        serializer.save()

    def perform_destroy(self, instance):
        if not es_organizador_evento(
            self.request.user,
            instance.evento
        ):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied(
                'No puedes modificar este equipo.'
            )

        es_principal = (
            instance.usuario_id == instance.evento.creado_por_id
            and instance.rol.codigo == 'ORGANIZADOR'
        )

        if es_principal:
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                'El organizador principal del evento no puede ser eliminado.'
            )

        instance.delete()


class InscripcionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = InscripcionSerializer

    def get_queryset(self):
        return Inscripcion.objects.select_related('evento', 'usuario').filter(usuario=self.request.user)

    @action(detail=False, methods=['get'])
    def mias(self, request):
        return Response(self.get_serializer(self.get_queryset(), many=True).data)

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[permissions.IsAuthenticated]
    )
    @transaction.atomic
    def cancelar(self, request, pk=None):
        inscripcion = self.get_object()
        evento = inscripcion.evento

        if inscripcion.estado == Inscripcion.Estado.CANCELADA:
            return Response(
                {
                    'detail':
                    'La inscripción ya está cancelada.'
                },
                status=status.HTTP_409_CONFLICT
            )

        if timezone.now() >= evento.fecha_hora_inicio:
            return Response(
                {
                    'detail':
                    'No puedes cancelar una inscripción '
                    'cuando el evento ya comenzó.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            entrada = inscripcion.entrada
        except Entrada.DoesNotExist:
            entrada = None

        if (
            entrada
            and entrada.estado == Entrada.Estado.UTILIZADA
        ):
            return Response(
                {
                    'detail':
                    'No puedes cancelar una entrada '
                    'que ya fue utilizada.'
                },
                status=status.HTTP_409_CONFLICT
            )

        ahora = timezone.now()

        inscripcion.estado = Inscripcion.Estado.CANCELADA
        inscripcion.cancelado_en = ahora

        inscripcion.save(
            update_fields=[
                'estado',
                'cancelado_en'
            ]
        )

        if entrada:
            entrada.estado = Entrada.Estado.CANCELADA
            entrada.cancelada_en = ahora

            entrada.save(
                update_fields=[
                    'estado',
                    'cancelada_en'
                ]
            )

        Notificacion.objects.create(
            usuario=request.user,
            evento=evento,
            titulo='Inscripción cancelada',
            contenido=(
                f'Tu inscripción a {evento.nombre} '
                f'fue cancelada.'
            ),
            tipo='CANCELACION'
        )

        return Response({
            'detail': 'Inscripción cancelada correctamente.',
            'inscripcion_id': inscripcion.id,
            'estado': inscripcion.estado
        })

class EntradaViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EntradaSerializer

    def get_queryset(self):
        qs = Entrada.objects.select_related('inscripcion__evento', 'tipo_entrada')
        if es_admin(self.request.user):
            return qs
        return qs.filter(inscripcion__usuario=self.request.user)

    @action(detail=False, methods=['get'])
    def mias(self, request):
        return Response(self.get_serializer(self.get_queryset(), many=True).data)

    @action(detail=True, methods=['get'])
    def qr(self, request, pk=None):
        entrada = self.get_object()
        token = token_qr_para_codigo(entrada.codigo_publico)
        imagen = qrcode.make(token)
        buffer = io.BytesIO()
        imagen.save(buffer, format='PNG')
        return HttpResponse(buffer.getvalue(), content_type='image/png')


class EscanearQRView(APIView):
    @transaction.atomic
    def post(self, request):
        serializer = EscanearQRSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        evento_id = serializer.validated_data['evento_id']
        token = serializer.validated_data['token_qr']
        dispositivo = serializer.validated_data.get('informacion_dispositivo', '')

        try:
            evento = Evento.objects.get(id=evento_id)
        except Evento.DoesNotExist:
            return Response({'resultado': 'INVALIDO', 'detail': 'Evento inexistente.'}, status=404)
        if not es_staff_evento(request.user, evento):
            return Response({'detail': 'No estás asignado para validar entradas de este evento.'}, status=403)

        token_hash = hash_token(token)
        entrada = Entrada.objects.select_for_update().select_related('inscripcion__evento', 'inscripcion__usuario', 'tipo_entrada').filter(hash_token_qr=token_hash).first()
        if not entrada:
            EscaneoEntrada.objects.create(evento=evento, escaneado_por=request.user, hash_token_escaneado=token_hash, resultado=EscaneoEntrada.Resultado.INVALIDO, informacion_dispositivo=dispositivo)
            return Response({'resultado': 'INVALIDO', 'detail': 'Código QR no reconocido.'}, status=400)

        try:
            firmador = signing.Signer(salt='nova.qr.v1')
            codigo = firmador.unsign(token)

            if codigo != entrada.codigo_publico:
                raise signing.BadSignature

        except signing.BadSignature:
            EscaneoEntrada.objects.create(evento=evento, entrada=entrada, escaneado_por=request.user, hash_token_escaneado=token_hash, resultado=EscaneoEntrada.Resultado.INVALIDO, informacion_dispositivo=dispositivo)
            return Response({'resultado': 'INVALIDO'}, status=400)

        ahora = timezone.now()
        detalle = None

        if entrada.inscripcion.evento_id != evento.id:
            resultado = EscaneoEntrada.Resultado.EVENTO_INCORRECTO
            http_status = 400

        elif ahora < evento.fecha_hora_inicio:
            resultado = EscaneoEntrada.Resultado.INVALIDO
            http_status = 400
            detalle = 'La validación de entradas aún no está habilitada para este evento.'

        elif ahora > evento.fecha_hora_fin:
            resultado = EscaneoEntrada.Resultado.EXPIRADO
            http_status = 400
            detalle = 'El evento ya finalizó.'

        elif entrada.estado == Entrada.Estado.UTILIZADA:
            resultado = EscaneoEntrada.Resultado.YA_UTILIZADO
            http_status = 409

        elif entrada.estado == Entrada.Estado.CANCELADA:
            resultado = EscaneoEntrada.Resultado.CANCELADO
            http_status = 400

        elif entrada.estado == Entrada.Estado.EXPIRADA:
            resultado = EscaneoEntrada.Resultado.EXPIRADO
            http_status = 400

        else:
            resultado = EscaneoEntrada.Resultado.VALIDO
            http_status = 200

        escaneo = EscaneoEntrada.objects.create(
            evento=evento, entrada=entrada, escaneado_por=request.user,
            hash_token_escaneado=token_hash, resultado=resultado,
            informacion_dispositivo=dispositivo
        )

        if resultado == EscaneoEntrada.Resultado.VALIDO:
            entrada.estado = Entrada.Estado.UTILIZADA
            entrada.utilizada_en = timezone.now()
            entrada.save(update_fields=['estado', 'utilizada_en'])
            Asistencia.objects.get_or_create(
                entrada=entrada,
                defaults={'escaneo_valido': escaneo, 'registrado_por': request.user}
            )

        respuesta = {
            'resultado': resultado,
            'entrada': EntradaSerializer(entrada).data,
            'participante': entrada.inscripcion.usuario.nombre_completo,
        }

        if detalle:
            respuesta['detail'] = detalle

        return Response(
            respuesta,
            status=http_status
        )


class ReporteEventoView(APIView):
    def get(self, request, evento_id):
        try:
            evento = Evento.objects.get(id=evento_id)
        except Evento.DoesNotExist:
            return Response({'detail': 'Evento inexistente.'}, status=404)
        if not es_organizador_evento(request.user, evento):
            return Response({'detail': 'No tienes permiso para consultar este reporte.'}, status=403)

        inscritos = evento.inscripciones.filter(estado=Inscripcion.Estado.CONFIRMADA).count()
        asistieron = Asistencia.objects.filter(entrada__inscripcion__evento=evento).count()
        por_tipo = list(
            TipoEntrada.objects.filter(evento=evento)
            .annotate(emitidas=Count('entradas'), usadas=Count('entradas', filter=Q(entradas__estado=Entrada.Estado.UTILIZADA)))
            .values('id', 'nombre', 'emitidas', 'usadas')
        )
        return Response({
            'evento': {'id': evento.id, 'nombre': evento.nombre},
            'inscritos': inscritos,
            'asistieron': asistieron,
            'ausentes': max(inscritos - asistieron, 0),
            'porcentaje_asistencia': round((asistieron / inscritos * 100), 2) if inscritos else 0,
            'tipos_entrada': por_tipo,
        })
