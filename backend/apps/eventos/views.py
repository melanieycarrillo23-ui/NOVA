import csv
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
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.auditoria.services import registrar_actividad
from apps.cuentas.models import Rol, Usuario, UsuarioRol
from apps.cuentas.permissions import (
    EsAdministrador,
    usuario_tiene_permiso,
    usuario_tiene_rol,
)

from .models import (
    Asistencia,
    CategoriaEvento,
    Entrada,
    EscaneoEntrada,
    Evento,
    Inscripcion,
    Lugar,
    MiembroEquipoEvento,
    Notificacion,
    TipoEntrada,
)

from .permissions import (
    es_admin,
    es_organizador_evento,
    es_staff_evento,
)

from .serializers import (
    AsignarMiembroEquipoSerializer,
    CategoriaEventoSerializer,
    EntradaSerializer,
    EscanearQRSerializer,
    EventoSerializer,
    InscripcionSerializer,
    InscribirseSerializer,
    LugarSerializer,
    MiembroEquipoEventoSerializer,
    TipoEntradaSerializer,
)


def crear_identificador_evento(nombre):
    base = slugify(nombre)[:180] or 'evento'
    candidato = base

    while Evento.objects.filter(
        identificador_url=candidato
    ).exists():
        candidato = (
            f'{base}-{secrets.token_hex(3)}'
        )

    return candidato


def token_qr_para_codigo(codigo_publico):
    firmador = signing.Signer(
        salt='nova.qr.v1'
    )

    return firmador.sign(
        codigo_publico
    )


def hash_token(token):
    return hashlib.sha256(
        token.encode('utf-8')
    ).hexdigest()


def generar_codigo_publico():
    while True:
        codigo = (
            f'NOVA-{timezone.now():%Y}-'
            f'{secrets.token_hex(4).upper()}'
        )

        if not Entrada.objects.filter(
            codigo_publico=codigo
        ).exists():
            return codigo


class CategoriaEventoViewSet(
    viewsets.ModelViewSet
):
    queryset = CategoriaEvento.objects.all()

    serializer_class = (
        CategoriaEventoSerializer
    )

    def get_permissions(self):
        if self.action in (
            'list',
            'retrieve',
        ):
            return [
                permissions.AllowAny()
            ]

        return [
            EsAdministrador()
        ]

    def perform_create(
        self,
        serializer
    ):
        categoria = serializer.save()

        registrar_actividad(
            usuario=self.request.user,
            accion='CATEGORIA_CREADA',
            tipo_entidad='CategoriaEvento',
            entidad_id=categoria.id,
            metadatos={
                'nombre':
                    categoria.nombre,
            },
            request=self.request,
        )

    def perform_update(
        self,
        serializer
    ):
        categoria = serializer.save()

        registrar_actividad(
            usuario=self.request.user,
            accion='CATEGORIA_ACTUALIZADA',
            tipo_entidad='CategoriaEvento',
            entidad_id=categoria.id,
            metadatos={
                'nombre':
                    categoria.nombre,
            },
            request=self.request,
        )

    def perform_destroy(
        self,
        instance
    ):
        registrar_actividad(
            usuario=self.request.user,
            accion='CATEGORIA_ELIMINADA',
            tipo_entidad='CategoriaEvento',
            entidad_id=instance.id,
            metadatos={
                'nombre':
                    instance.nombre,
            },
            request=self.request,
        )

        instance.delete()


class LugarViewSet(
    viewsets.ModelViewSet
):
    queryset = Lugar.objects.all()

    serializer_class = LugarSerializer

    def get_permissions(self):
        if self.action in (
            'list',
            'retrieve',
        ):
            return [
                permissions.AllowAny()
            ]

        return [
            permissions.IsAuthenticated()
        ]

    def perform_create(
        self,
        serializer
    ):
        if not usuario_tiene_rol(
            self.request.user,
            'ORGANIZADOR',
            'ADMIN',
        ):
            from rest_framework.exceptions import (
                PermissionDenied,
            )

            raise PermissionDenied(
                'Solo organizadores o '
                'administradores pueden '
                'crear lugares.'
            )

        lugar = serializer.save()

        registrar_actividad(
            usuario=self.request.user,
            accion='LUGAR_CREADO',
            tipo_entidad='Lugar',
            entidad_id=lugar.id,
            metadatos={
                'nombre':
                    lugar.nombre,
                'ciudad':
                    lugar.ciudad,
            },
            request=self.request,
        )

    def perform_update(
        self,
        serializer
    ):
        if not es_admin(
            self.request.user
        ):
            from rest_framework.exceptions import (
                PermissionDenied,
            )

            raise PermissionDenied(
                'Solo un administrador '
                'puede modificar lugares '
                'compartidos.'
            )

        lugar = serializer.save()

        registrar_actividad(
            usuario=self.request.user,
            accion='LUGAR_ACTUALIZADO',
            tipo_entidad='Lugar',
            entidad_id=lugar.id,
            metadatos={
                'nombre':
                    lugar.nombre,
                'ciudad':
                    lugar.ciudad,
            },
            request=self.request,
        )

    def perform_destroy(
        self,
        instance
    ):
        if not es_admin(
            self.request.user
        ):
            from rest_framework.exceptions import (
                PermissionDenied,
            )

            raise PermissionDenied(
                'Solo un administrador '
                'puede eliminar lugares '
                'compartidos.'
            )

        registrar_actividad(
            usuario=self.request.user,
            accion='LUGAR_ELIMINADO',
            tipo_entidad='Lugar',
            entidad_id=instance.id,
            metadatos={
                'nombre':
                    instance.nombre,
                'ciudad':
                    instance.ciudad,
            },
            request=self.request,
        )

        instance.delete()


class EventoViewSet(
    viewsets.ModelViewSet
):
    serializer_class = EventoSerializer

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
            return qs

        if self.action in (
            'list',
            'retrieve',
        ):
            publico = Q(
                estado=
                    Evento.Estado.PUBLICADO,
                visibilidad=
                    Evento.Visibilidad.PUBLICO,
            )

            if usuario.is_authenticated:
                return qs.filter(
                    publico
                    | Q(
                        creado_por=usuario
                    )
                    | Q(
                        equipo__usuario=usuario
                    )
                ).distinct()

            return qs.filter(
                publico
            )

        return qs

    def get_permissions(self):
        if self.action in (
            'list',
            'retrieve',
        ):
            return [
                permissions.AllowAny()
            ]

        return [
            permissions.IsAuthenticated()
        ]

    def perform_create(
        self,
        serializer
    ):
        if not usuario_tiene_permiso(
            self.request.user,
            'eventos.crear',
        ):
            from rest_framework.exceptions import (
                PermissionDenied,
            )

            raise PermissionDenied(
                'No tienes permiso '
                'para crear eventos.'
            )

        identificador = (
            serializer.validated_data.get(
                'identificador_url'
            )
            or crear_identificador_evento(
                serializer.validated_data[
                    'nombre'
                ]
            )
        )

        evento = serializer.save(
            creado_por=self.request.user,
            identificador_url=identificador,
        )

        rol_organizador, _ = (
            Rol.objects.get_or_create(
                codigo='ORGANIZADOR',
                defaults={
                    'nombre':
                        'Organizador',
                },
            )
        )

        (
            MiembroEquipoEvento.objects
            .get_or_create(
                evento=evento,
                usuario=self.request.user,
                rol=rol_organizador,
                defaults={
                    'asignado_por':
                        self.request.user,
                },
            )
        )

        registrar_actividad(
            usuario=self.request.user,
            accion='EVENTO_CREADO',
            tipo_entidad='Evento',
            entidad_id=evento.id,
            metadatos={
                'nombre':
                    evento.nombre,
                'estado':
                    evento.estado,
            },
            request=self.request,
        )

    def perform_update(
        self,
        serializer
    ):
        evento = self.get_object()

        if not usuario_tiene_permiso(
            self.request.user,
            'eventos.editar_propios',
        ):
            from rest_framework.exceptions import (
                PermissionDenied,
            )

            raise PermissionDenied(
                'No tienes permiso '
                'para editar eventos.'
            )

        if not es_organizador_evento(
            self.request.user,
            evento,
        ):
            from rest_framework.exceptions import (
                PermissionDenied,
            )

            raise PermissionDenied(
                'No puedes modificar '
                'este evento.'
            )

        evento_actualizado = (
            serializer.save()
        )

        registrar_actividad(
            usuario=self.request.user,
            accion='EVENTO_ACTUALIZADO',
            tipo_entidad='Evento',
            entidad_id=evento_actualizado.id,
            metadatos={
                'nombre':
                    evento_actualizado.nombre,
                'estado':
                    evento_actualizado.estado,
            },
            request=self.request,
        )

    def perform_destroy(
        self,
        instance
    ):
        if not usuario_tiene_permiso(
            self.request.user,
            'eventos.editar_propios',
        ):
            from rest_framework.exceptions import (
                PermissionDenied,
            )

            raise PermissionDenied(
                'No tienes permiso '
                'para eliminar eventos.'
            )

        if not es_organizador_evento(
            self.request.user,
            instance,
        ):
            from rest_framework.exceptions import (
                PermissionDenied,
            )

            raise PermissionDenied(
                'No puedes eliminar '
                'este evento.'
            )

        registrar_actividad(
            usuario=self.request.user,
            accion='EVENTO_ELIMINADO',
            tipo_entidad='Evento',
            entidad_id=instance.id,
            metadatos={
                'nombre':
                    instance.nombre,
                'estado':
                    instance.estado,
            },
            request=self.request,
        )

        instance.delete()

    @action(
        detail=False,
        methods=['get'],
        permission_classes=[
            permissions.IsAuthenticated
        ],
    )
    def mios(
        self,
        request
    ):
        qs = (
            Evento.objects
            .select_related(
                'categoria',
                'lugar',
                'creado_por',
            )
            .filter(
                Q(
                    creado_por=request.user
                )
                | Q(
                    equipo__usuario=request.user,
                    equipo__rol__codigo=
                        'ORGANIZADOR',
                    equipo__estado=
                        MiembroEquipoEvento
                        .Estado.ACTIVO,
                )
            )
            .distinct()
        )

        return Response(
            self.get_serializer(
                qs,
                many=True
            ).data
        )

    @action(
        detail=False,
        methods=['get'],
        permission_classes=[
            permissions.IsAuthenticated
        ],
    )
    def asignados(
        self,
        request
    ):
        qs = (
            Evento.objects
            .select_related(
                'categoria',
                'lugar',
                'creado_por',
            )
            .filter(
                equipo__usuario=request.user,
                equipo__rol__codigo='STAFF',
                equipo__estado=
                    MiembroEquipoEvento
                    .Estado.ACTIVO,
            )
            .distinct()
        )

        return Response(
            self.get_serializer(
                qs,
                many=True
            ).data
        )

    @action(
        detail=True,
        methods=['get'],
        url_path='buscar-usuario-equipo',
        permission_classes=[
            permissions.IsAuthenticated
        ],
    )
    def buscar_usuario_equipo(
        self,
        request,
        pk=None
    ):
        evento = self.get_object()

        if not usuario_tiene_permiso(
            request.user,
            'equipo.gestionar',
        ):
            return Response(
                {
                    'detail':
                        'No tienes permiso '
                        'para gestionar '
                        'el equipo.'
                },
                status=
                    status.HTTP_403_FORBIDDEN,
            )

        if not es_organizador_evento(
            request.user,
            evento
        ):
            return Response(
                {
                    'detail':
                        'No puedes administrar '
                        'el equipo de este '
                        'evento.'
                },
                status=
                    status.HTTP_403_FORBIDDEN,
            )

        correo = (
            request.query_params
            .get(
                'correo',
                ''
            )
            .strip()
        )

        if not correo:
            return Response(
                {
                    'detail':
                        'Debes indicar '
                        'un correo.',
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )

        usuario = (
            Usuario.objects
            .filter(
                correo__iexact=correo,
                estado=Usuario.Estado.ACTIVO,
            )
            .first()
        )

        if not usuario:
            return Response(
                {
                    'detail':
                        'No existe un usuario '
                        'activo con ese correo.'
                },
                status=
                    status.HTTP_404_NOT_FOUND,
            )

        roles_evento = list(
            MiembroEquipoEvento.objects
            .filter(
                evento=evento,
                usuario=usuario,
                estado=
                    MiembroEquipoEvento
                    .Estado.ACTIVO,
            )
            .values_list(
                'rol__codigo',
                flat=True,
            )
        )

        return Response({
            'id':
                usuario.id,

            'nombre_completo':
                usuario.nombre_completo,

            'correo':
                usuario.correo,

            'roles_evento':
                roles_evento,
        })

    @action(
        detail=True,
        methods=['post'],
        url_path='asignar-equipo',
        permission_classes=[
            permissions.IsAuthenticated
        ],
    )
    @transaction.atomic
    def asignar_equipo(
        self,
        request,
        pk=None
    ):
        evento = self.get_object()

        if not usuario_tiene_permiso(
            request.user,
            'equipo.gestionar',
        ):
            return Response(
                {
                    'detail':
                        'No tienes permiso '
                        'para gestionar '
                        'el equipo.'
                },
                status=
                    status.HTTP_403_FORBIDDEN,
            )

        if not es_organizador_evento(
            request.user,
            evento
        ):
            return Response(
                {
                    'detail':
                        'No puedes administrar '
                        'el equipo de este '
                        'evento.'
                },
                status=
                    status.HTTP_403_FORBIDDEN,
            )

        serializer = (
            AsignarMiembroEquipoSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        correo = (
            serializer.validated_data[
                'correo'
            ]
        )

        codigo_rol = (
            serializer.validated_data[
                'rol'
            ]
        )

        usuario = (
            Usuario.objects
            .filter(
                correo__iexact=correo,
                estado=Usuario.Estado.ACTIVO,
            )
            .first()
        )

        if not usuario:
            return Response(
                {
                    'detail':
                        'No existe un usuario '
                        'activo con ese correo.'
                },
                status=
                    status.HTTP_404_NOT_FOUND,
            )

        rol = Rol.objects.get(
            codigo=codigo_rol
        )

        (
            UsuarioRol.objects
            .get_or_create(
                usuario=usuario,
                rol=rol,
            )
        )

        miembro, creado = (
            MiembroEquipoEvento.objects
            .get_or_create(
                evento=evento,
                usuario=usuario,
                rol=rol,
                defaults={
                    'asignado_por':
                        request.user,
                    'estado':
                        MiembroEquipoEvento
                        .Estado.ACTIVO,
                },
            )
        )

        reactivado = False

        if (
            not creado
            and miembro.estado
            != MiembroEquipoEvento
            .Estado.ACTIVO
        ):
            miembro.estado = (
                MiembroEquipoEvento
                .Estado.ACTIVO
            )

            miembro.asignado_por = (
                request.user
            )

            miembro.save(
                update_fields=[
                    'estado',
                    'asignado_por',
                ]
            )

            reactivado = True

        registrar_actividad(
            usuario=request.user,
            accion='EQUIPO_MIEMBRO_ASIGNADO',
            tipo_entidad='MiembroEquipoEvento',
            entidad_id=miembro.id,
            metadatos={
                'evento_id':
                    evento.id,

                'evento':
                    evento.nombre,

                'usuario_id':
                    usuario.id,

                'correo':
                    usuario.correo,

                'rol':
                    rol.codigo,

                'creado':
                    creado,

                'reactivado':
                    reactivado,
            },
            request=request,
        )

        return Response(
            MiembroEquipoEventoSerializer(
                miembro
            ).data,
            status=(
                status.HTTP_201_CREATED
                if creado
                else status.HTTP_200_OK
            ),
        )

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[
            permissions.IsAuthenticated
        ],
    )
    @transaction.atomic
    def inscribirse(
        self,
        request,
        pk=None
    ):
        evento = self.get_object()

        if not usuario_tiene_permiso(
            request.user,
            'inscripciones.crear',
        ):
            return Response(
                {
                    'detail':
                        'No tienes permiso '
                        'para inscribirte '
                        'a eventos.'
                },
                status=
                    status.HTTP_403_FORBIDDEN,
            )

        serializer = (
            InscribirseSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        if (
            evento.estado
            != Evento.Estado.PUBLICADO
        ):
            return Response(
                {
                    'detail':
                        'El evento no está '
                        'disponible para '
                        'inscripciones.'
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )

        ahora = timezone.now()

        if (
            evento.inicio_inscripciones
            and ahora
            < evento.inicio_inscripciones
        ):
            return Response(
                {
                    'detail':
                        'Las inscripciones '
                        'aún no han iniciado.'
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )

        if (
            evento.cierre_inscripciones
            and ahora
            > evento.cierre_inscripciones
        ):
            return Response(
                {
                    'detail':
                        'Las inscripciones '
                        'ya finalizaron.'
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )

        inscritos = (
            evento.inscripciones
            .filter(
                estado=
                    Inscripcion
                    .Estado.CONFIRMADA
            )
            .count()
        )

        if (
            evento.capacidad
            and inscritos
            >= evento.capacidad
        ):
            return Response(
                {
                    'detail':
                        'El evento alcanzó '
                        'su capacidad.'
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )

        try:
            tipo = (
                TipoEntrada.objects
                .get(
                    id=
                        serializer
                        .validated_data[
                            'tipo_entrada_id'
                        ],
                    evento=evento,
                    estado=
                        TipoEntrada
                        .Estado.ACTIVO,
                )
            )

        except TipoEntrada.DoesNotExist:
            return Response(
                {
                    'detail':
                        'Tipo de entrada '
                        'inválido.'
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )

        entradas_tipo = (
            tipo.entradas
            .exclude(
                estado=
                    Entrada
                    .Estado.CANCELADA
            )
            .count()
        )

        if (
            tipo.cupo
            and entradas_tipo
            >= tipo.cupo
        ):
            return Response(
                {
                    'detail':
                        'No quedan cupos '
                        'para este tipo '
                        'de entrada.'
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )

        inscripcion, creada = (
            Inscripcion.objects
            .get_or_create(
                evento=evento,
                usuario=request.user,
                defaults={
                    'estado':
                        Inscripcion
                        .Estado.CONFIRMADA,
                },
            )
        )

        if (
            not creada
            and inscripcion.estado
            != Inscripcion
            .Estado.CANCELADA
        ):
            return Response(
                {
                    'detail':
                        'Ya estás inscrito '
                        'en este evento.'
                },
                status=
                    status.HTTP_409_CONFLICT,
            )

        reactivada = False

        if not creada:
            inscripcion.estado = (
                Inscripcion
                .Estado.CONFIRMADA
            )

            inscripcion.cancelado_en = None

            inscripcion.save(
                update_fields=[
                    'estado',
                    'cancelado_en',
                ]
            )

            reactivada = True

        codigo = generar_codigo_publico()

        token = token_qr_para_codigo(
            codigo
        )

        entrada, _ = (
            Entrada.objects
            .update_or_create(
                inscripcion=inscripcion,
                defaults={
                    'tipo_entrada':
                        tipo,

                    'codigo_publico':
                        codigo,

                    'hash_token_qr':
                        hash_token(
                            token
                        ),

                    'estado':
                        Entrada
                        .Estado.ACTIVA,

                    'utilizada_en':
                        None,

                    'cancelada_en':
                        None,
                },
            )
        )

        Notificacion.objects.create(
            usuario=request.user,
            evento=evento,
            titulo='Inscripción confirmada',
            contenido=(
                f'Tu inscripción a '
                f'{evento.nombre} '
                f'fue confirmada.'
            ),
            tipo='INSCRIPCION',
        )

        registrar_actividad(
            usuario=request.user,
            accion='INSCRIPCION_CONFIRMADA',
            tipo_entidad='Inscripcion',
            entidad_id=inscripcion.id,
            metadatos={
                'evento_id':
                    evento.id,

                'evento':
                    evento.nombre,

                'tipo_entrada_id':
                    tipo.id,

                'tipo_entrada':
                    tipo.nombre,

                'entrada_id':
                    entrada.id,

                'reactivada':
                    reactivada,
            },
            request=request,
        )

        return Response(
            EntradaSerializer(
                entrada
            ).data,
            status=
                status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=['get'],
        permission_classes=[
            permissions.IsAuthenticated
        ]
    )
    def asistentes(
        self,
        request,
        pk=None
    ):
        evento = self.get_object()

        if not es_staff_evento(
            request.user,
            evento
        ):
            return Response(
                {
                    'detail':
                        'No tienes acceso a los '
                        'asistentes de este evento.'
                },
                status=
                    status.HTTP_403_FORBIDDEN
            )

        qs = (
            Inscripcion.objects
            .filter(
                evento=evento
            )
            .select_related(
                'usuario'
            )
            .order_by(
                '-inscrito_en',
                '-id'
            )
        )

        busqueda = (
            request.query_params
            .get(
                'search',
                ''
            )
            .strip()
        )

        estado = (
            request.query_params
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
                    usuario__nombre_completo__icontains=
                        busqueda
                )
                |
                Q(
                    usuario__correo__icontains=
                        busqueda
                )
            )

        estados_validos = {
            Inscripcion.Estado.CONFIRMADA,
            Inscripcion.Estado.PENDIENTE,
            Inscripcion.Estado.CANCELADA,
        }

        if estado in estados_validos:
            qs = qs.filter(
                estado=estado
            )

        pagina = self.paginate_queryset(
            qs
        )

        if pagina is not None:
            serializer = (
                InscripcionSerializer(
                    pagina,
                    many=True
                )
            )

            return self.get_paginated_response(
                serializer.data
            )

        return Response(
            InscripcionSerializer(
                qs,
                many=True
            ).data
    )
    
    def exportar_asistentes(
        self,
        request,
        pk=None
    ):
        evento = self.get_object()

        if not usuario_tiene_permiso(
            request.user,
            'inscripciones.ver_evento',
        ):
            return Response(
                {
                    'detail':
                        'No tienes permiso '
                        'para consultar '
                        'asistentes.'
                },
                status=
                    status.HTTP_403_FORBIDDEN,
            )

        if not es_staff_evento(
            request.user,
            evento,
        ):
            return Response(
                {
                    'detail':
                        'No tienes acceso '
                        'a los asistentes '
                        'de este evento.'
                },
                status=
                    status.HTTP_403_FORBIDDEN,
            )

        inscripciones = (
            Inscripcion.objects
            .filter(
                evento=evento
            )
            .select_related(
                'usuario',
                'entrada__tipo_entrada',
            )
            .order_by(
                'usuario__nombre_completo'
            )
        )

        response = HttpResponse(
            content_type=
                'text/csv; charset=utf-8'
        )

        nombre_archivo = (
            f'asistentes_evento_'
            f'{evento.id}.csv'
        )

        response[
            'Content-Disposition'
        ] = (
            f'attachment; '
            f'filename="{nombre_archivo}"'
        )

        response.write('\ufeff')

        writer = csv.writer(
            response,
            delimiter=';'
        )

        writer.writerow([
            'Nombre',
            'Correo',
            'Estado inscripción',
            'Tipo de entrada',
            'Código de entrada',
            'Estado entrada',
            'Asistencia',
        ])

        for inscripcion in inscripciones:

            try:
                entrada = (
                    inscripcion.entrada
                )

            except Entrada.DoesNotExist:
                entrada = None

            if entrada:
                tipo_entrada = (
                    entrada
                    .tipo_entrada
                    .nombre
                )

                codigo_entrada = (
                    entrada.codigo_publico
                )

                estado_entrada = (
                    entrada.estado
                )

                tiene_asistencia = (
                    Asistencia.objects
                    .filter(
                        entrada=entrada
                    )
                    .exists()
                )

            else:
                tipo_entrada = ''
                codigo_entrada = ''
                estado_entrada = ''
                tiene_asistencia = False

            writer.writerow([
                inscripcion
                .usuario
                .nombre_completo,

                inscripcion
                .usuario
                .correo,

                inscripcion.estado,

                tipo_entrada,

                codigo_entrada,

                estado_entrada,

                (
                    'Sí'
                    if tiene_asistencia
                    else 'No'
                ),
            ])

        registrar_actividad(
            usuario=request.user,
            accion='ASISTENTES_EXPORTADOS',
            tipo_entidad='Evento',
            entidad_id=evento.id,
            metadatos={
                'evento':
                    evento.nombre,

                'evento_id':
                    evento.id,

                'cantidad':
                    inscripciones.count(),
            },
            request=request,
        )

        return response

    @action(
        detail=True,
        methods=['post'],
        url_path='importar-asistentes',
        permission_classes=[
            permissions.IsAuthenticated
        ],
        parser_classes=[
            MultiPartParser,
            FormParser,
        ],
    )
    @transaction.atomic
    def importar_asistentes(
        self,
        request,
        pk=None
    ):
        evento = self.get_object()

        if not es_organizador_evento(
            request.user,
            evento,
        ):
            return Response(
                {
                    'detail':
                        'Solo el organizador '
                        'del evento puede '
                        'importar asistentes.'
                },
                status=
                    status.HTTP_403_FORBIDDEN,
            )

        archivo = request.FILES.get(
            'archivo'
        )

        if not archivo:
            return Response(
                {
                    'detail':
                        'Debes seleccionar '
                        'un archivo CSV.'
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )

        if not archivo.name.lower().endswith(
            '.csv'
        ):
            return Response(
                {
                    'detail':
                        'El archivo debe tener '
                        'extensión CSV.'
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )

        if (
            archivo.size
            > 2 * 1024 * 1024
        ):
            return Response(
                {
                    'detail':
                        'El archivo CSV no '
                        'puede superar 2 MB.'
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )

        try:
            contenido = (
                archivo
                .read()
                .decode('utf-8-sig')
            )

        except UnicodeDecodeError:
            return Response(
                {
                    'detail':
                        'El archivo debe '
                        'estar codificado '
                        'en UTF-8.'
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )

        if not contenido.strip():
            return Response(
                {
                    'detail':
                        'El archivo CSV '
                        'está vacío.'
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )

        muestra = contenido[:2048]

        try:
            dialecto = (
                csv.Sniffer().sniff(
                    muestra,
                    delimiters=',;'
                )
            )

            delimitador = (
                dialecto.delimiter
            )

        except csv.Error:
            delimitador = ';'

        lector = csv.DictReader(
            io.StringIO(
                contenido
            ),
            delimiter=delimitador,
        )

        if not lector.fieldnames:
            return Response(
                {
                    'detail':
                        'El archivo CSV no '
                        'contiene encabezados.'
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )

        encabezados = {
            campo.strip().lower():
                campo
            for campo
            in lector.fieldnames
            if campo
        }

        if (
            'correo' not in encabezados
            or
            'tipo_entrada'
            not in encabezados
        ):
            return Response(
                {
                    'detail':
                        'El CSV debe contener '
                        'las columnas "correo" '
                        'y "tipo_entrada".'
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )

        columna_correo = (
            encabezados[
                'correo'
            ]
        )

        columna_tipo = (
            encabezados[
                'tipo_entrada'
            ]
        )

        importados = 0
        omitidos = 0
        errores = []

        numero_fila = 1

        for fila in lector:
            numero_fila += 1

            correo = (
                fila.get(
                    columna_correo,
                    ''
                )
                .strip()
            )

            tipo_nombre = (
                fila.get(
                    columna_tipo,
                    ''
                )
                .strip()
            )

            if (
                not correo
                and not tipo_nombre
            ):
                continue

            if not correo:
                errores.append({
                    'fila':
                        numero_fila,

                    'detalle':
                        'Falta el correo.',
                })

                continue

            if not tipo_nombre:
                errores.append({
                    'fila':
                        numero_fila,

                    'correo':
                        correo,

                    'detalle':
                        'Falta el tipo '
                        'de entrada.',
                })

                continue

            usuario = (
                Usuario.objects
                .filter(
                    correo__iexact=correo,
                    estado=
                        Usuario
                        .Estado.ACTIVO,
                )
                .first()
            )

            if not usuario:
                errores.append({
                    'fila':
                        numero_fila,

                    'correo':
                        correo,

                    'detalle':
                        'No existe un '
                        'usuario activo '
                        'con ese correo.',
                })

                continue

            tipo = (
                TipoEntrada.objects
                .filter(
                    evento=evento,
                    nombre__iexact=
                        tipo_nombre,
                    estado=
                        TipoEntrada
                        .Estado.ACTIVO,
                )
                .first()
            )

            if not tipo:
                errores.append({
                    'fila':
                        numero_fila,

                    'correo':
                        correo,

                    'detalle':
                        (
                            'No existe el tipo '
                            f'de entrada '
                            f'"{tipo_nombre}" '
                            'en este evento.'
                        ),
                })

                continue

            inscripcion = (
                Inscripcion.objects
                .filter(
                    evento=evento,
                    usuario=usuario,
                )
                .first()
            )

            if (
                inscripcion
                and
                inscripcion.estado
                != Inscripcion
                .Estado.CANCELADA
            ):
                omitidos += 1

                errores.append({
                    'fila':
                        numero_fila,

                    'correo':
                        correo,

                    'detalle':
                        'El usuario ya '
                        'está inscrito.',
                })

                continue

            inscritos_actuales = (
                evento.inscripciones
                .filter(
                    estado=
                        Inscripcion
                        .Estado.CONFIRMADA
                )
                .count()
            )

            if (
                evento.capacidad
                and inscritos_actuales
                >= evento.capacidad
            ):
                errores.append({
                    'fila':
                        numero_fila,

                    'correo':
                        correo,

                    'detalle':
                        'El evento alcanzó '
                        'su capacidad.',
                })

                continue

            entradas_tipo = (
                tipo.entradas
                .exclude(
                    estado=
                        Entrada
                        .Estado.CANCELADA
                )
                .count()
            )

            if (
                tipo.cupo
                and entradas_tipo
                >= tipo.cupo
            ):
                errores.append({
                    'fila':
                        numero_fila,

                    'correo':
                        correo,

                    'detalle':
                        (
                            'No quedan cupos '
                            f'para "{tipo.nombre}".'
                        ),
                })

                continue

            if not inscripcion:
                inscripcion = (
                    Inscripcion.objects
                    .create(
                        evento=evento,
                        usuario=usuario,
                        estado=
                            Inscripcion
                            .Estado.CONFIRMADA,
                    )
                )

            else:
                inscripcion.estado = (
                    Inscripcion
                    .Estado.CONFIRMADA
                )

                inscripcion.cancelado_en = None

                inscripcion.save(
                    update_fields=[
                        'estado',
                        'cancelado_en',
                    ]
                )

            codigo = (
                generar_codigo_publico()
            )

            token = (
                token_qr_para_codigo(
                    codigo
                )
            )

            entrada, _ = (
                Entrada.objects
                .update_or_create(
                    inscripcion=
                        inscripcion,
                    defaults={
                        'tipo_entrada':
                            tipo,

                        'codigo_publico':
                            codigo,

                        'hash_token_qr':
                            hash_token(
                                token
                            ),

                        'estado':
                            Entrada
                            .Estado.ACTIVA,

                        'utilizada_en':
                            None,

                        'cancelada_en':
                            None,
                    },
                )
            )

            Notificacion.objects.create(
                usuario=usuario,
                evento=evento,
                titulo=
                    'Inscripción confirmada',
                contenido=(
                    f'Tu inscripción a '
                    f'{evento.nombre} '
                    f'fue confirmada.'
                ),
                tipo='INSCRIPCION',
            )

            registrar_actividad(
                usuario=request.user,
                accion=
                    'INSCRIPCION_IMPORTADA',
                tipo_entidad='Inscripcion',
                entidad_id=inscripcion.id,
                metadatos={
                    'evento_id':
                        evento.id,

                    'evento':
                        evento.nombre,

                    'usuario_id':
                        usuario.id,

                    'correo':
                        usuario.correo,

                    'tipo_entrada':
                        tipo.nombre,

                    'entrada_id':
                        entrada.id,
                },
                request=request,
            )

            importados += 1

        registrar_actividad(
            usuario=request.user,
            accion='ASISTENTES_IMPORTADOS',
            tipo_entidad='Evento',
            entidad_id=evento.id,
            metadatos={
                'evento':
                    evento.nombre,

                'evento_id':
                    evento.id,

                'archivo':
                    archivo.name,

                'importados':
                    importados,

                'omitidos':
                    omitidos,

                'errores':
                    len(errores),
            },
            request=request,
        )

        return Response({
            'detail':
                'Importación finalizada.',

            'importados':
                importados,

            'omitidos':
                omitidos,

            'errores':
                errores,
        })


class TipoEntradaViewSet(
    viewsets.ModelViewSet
):
    queryset = (
        TipoEntrada.objects
        .select_related(
            'evento'
        )
        .order_by(
            'id'
        )
    )

    serializer_class = (
        TipoEntradaSerializer
    )

    def get_queryset(self):
        qs = super().get_queryset()

        evento_id = (
            self.request
            .query_params
            .get('evento')
        )

        if evento_id:
            qs = qs.filter(
                evento_id=evento_id
            )

        return qs

    def get_permissions(self):
        if self.action in (
            'list',
            'retrieve',
        ):
            return [
                permissions.AllowAny()
            ]

        return [
            permissions.IsAuthenticated()
        ]

    def perform_create(
        self,
        serializer
    ):
        evento = (
            serializer.validated_data[
                'evento'
            ]
        )

        if not es_organizador_evento(
            self.request.user,
            evento,
        ):
            from rest_framework.exceptions import (
                PermissionDenied,
            )

            raise PermissionDenied(
                'No puedes gestionar '
                'entradas de este evento.'
            )

        tipo = serializer.save()

        registrar_actividad(
            usuario=self.request.user,
            accion='TIPO_ENTRADA_CREADO',
            tipo_entidad='TipoEntrada',
            entidad_id=tipo.id,
            metadatos={
                'evento_id':
                    evento.id,

                'evento':
                    evento.nombre,

                'nombre':
                    tipo.nombre,
            },
            request=self.request,
        )

    def perform_update(
        self,
        serializer
    ):
        actual = self.get_object()

        destino = (
            serializer.validated_data
            .get(
                'evento',
                actual.evento,
            )
        )

        if (
            not es_organizador_evento(
                self.request.user,
                actual.evento,
            )
            or
            not es_organizador_evento(
                self.request.user,
                destino,
            )
        ):
            from rest_framework.exceptions import (
                PermissionDenied,
            )

            raise PermissionDenied(
                'No puedes gestionar '
                'entradas de este evento.'
            )

        tipo = serializer.save()

        registrar_actividad(
            usuario=self.request.user,
            accion='TIPO_ENTRADA_ACTUALIZADO',
            tipo_entidad='TipoEntrada',
            entidad_id=tipo.id,
            metadatos={
                'evento_id':
                    tipo.evento_id,

                'evento':
                    tipo.evento.nombre,

                'nombre':
                    tipo.nombre,
            },
            request=self.request,
        )

    def perform_destroy(
        self,
        instance
    ):
        if not es_organizador_evento(
            self.request.user,
            instance.evento,
        ):
            from rest_framework.exceptions import (
                PermissionDenied,
            )

            raise PermissionDenied(
                'No puedes eliminar '
                'tipos de entrada '
                'de este evento.'
            )

        registrar_actividad(
            usuario=self.request.user,
            accion='TIPO_ENTRADA_ELIMINADO',
            tipo_entidad='TipoEntrada',
            entidad_id=instance.id,
            metadatos={
                'evento_id':
                    instance.evento_id,

                'evento':
                    instance.evento.nombre,

                'nombre':
                    instance.nombre,
            },
            request=self.request,
        )

        instance.delete()


class MiembroEquipoEventoViewSet(
    viewsets.ModelViewSet
):
    queryset = (
        MiembroEquipoEvento.objects
        .select_related(
            'evento',
            'usuario',
            'rol',
        )
        .all()
    )

    serializer_class = (
        MiembroEquipoEventoSerializer
    )

    permission_classes = [
        permissions.IsAuthenticated
    ]

    def get_queryset(self):
        qs = super().get_queryset()

        evento_id = (
            self.request
            .query_params
            .get('evento')
        )

        if es_admin(
            self.request.user
        ):
            if evento_id:
                return qs.filter(
                    evento_id=evento_id
                )

            return qs

        if evento_id:
            try:
                evento = (
                    Evento.objects.get(
                        id=evento_id
                    )
                )

            except Evento.DoesNotExist:
                return qs.none()

            if es_staff_evento(
                self.request.user,
                evento,
            ):
                return qs.filter(
                    evento=evento
                )

            return qs.none()

        pk = self.kwargs.get(
            'pk'
        )

        if pk:
            try:
                miembro = qs.get(
                    pk=pk
                )

            except (
                MiembroEquipoEvento
                .DoesNotExist
            ):
                return qs.none()

            if es_organizador_evento(
                self.request.user,
                miembro.evento,
            ):
                return qs.filter(
                    pk=pk
                )

            if (
                miembro.usuario_id
                == self.request.user.id
            ):
                return qs.filter(
                    pk=pk
                )

            return qs.none()

        return qs.filter(
            usuario=self.request.user
        )

    def perform_create(
        self,
        serializer
    ):
        evento = (
            serializer.validated_data[
                'evento'
            ]
        )

        rol = (
            serializer.validated_data[
                'rol'
            ]
        )

        if not usuario_tiene_permiso(
            self.request.user,
            'equipo.gestionar',
        ):
            from rest_framework.exceptions import (
                PermissionDenied,
            )

            raise PermissionDenied(
                'No tienes permiso '
                'para gestionar equipos.'
            )

        if rol.codigo not in (
            'ORGANIZADOR',
            'STAFF',
        ):
            from rest_framework.exceptions import (
                ValidationError,
            )

            raise ValidationError(
                'En el equipo de un '
                'evento solo se asignan '
                'ORGANIZADOR o STAFF.'
            )

        if not es_organizador_evento(
            self.request.user,
            evento,
        ):
            from rest_framework.exceptions import (
                PermissionDenied,
            )

            raise PermissionDenied(
                'No puedes administrar '
                'el equipo de este evento.'
            )

        UsuarioRol.objects.get_or_create(
            usuario=
                serializer
                .validated_data[
                    'usuario'
                ],
            rol=rol,
        )

        miembro = serializer.save(
            asignado_por=
                self.request.user
        )

        registrar_actividad(
            usuario=self.request.user,
            accion='EQUIPO_MIEMBRO_CREADO',
            tipo_entidad='MiembroEquipoEvento',
            entidad_id=miembro.id,
            metadatos={
                'evento_id':
                    evento.id,

                'evento':
                    evento.nombre,

                'usuario_id':
                    miembro.usuario_id,

                'correo':
                    miembro.usuario.correo,

                'rol':
                    miembro.rol.codigo,
            },
            request=self.request,
        )

    def perform_update(
        self,
        serializer
    ):
        actual = self.get_object()

        if not usuario_tiene_permiso(
            self.request.user,
            'equipo.gestionar',
        ):
            from rest_framework.exceptions import (
                PermissionDenied,
            )

            raise PermissionDenied(
                'No tienes permiso '
                'para gestionar equipos.'
            )

        destino = (
            serializer
            .validated_data
            .get(
                'evento',
                actual.evento,
            )
        )

        rol = (
            serializer
            .validated_data
            .get(
                'rol',
                actual.rol,
            )
        )

        usuario = (
            serializer
            .validated_data
            .get(
                'usuario',
                actual.usuario,
            )
        )

        estado = (
            serializer
            .validated_data
            .get(
                'estado',
                actual.estado,
            )
        )

        if rol.codigo not in (
            'ORGANIZADOR',
            'STAFF',
        ):
            from rest_framework.exceptions import (
                ValidationError,
            )

            raise ValidationError(
                'En el equipo de un '
                'evento solo se asignan '
                'ORGANIZADOR o STAFF.'
            )

        if (
            not es_organizador_evento(
                self.request.user,
                actual.evento,
            )
            or
            not es_organizador_evento(
                self.request.user,
                destino,
            )
        ):
            from rest_framework.exceptions import (
                PermissionDenied,
            )

            raise PermissionDenied(
                'No puedes modificar '
                'este equipo.'
            )

        es_principal = (
            actual.usuario_id
            == actual.evento.creado_por_id
            and actual.rol.codigo
            == 'ORGANIZADOR'
        )

        if es_principal:
            cambia_principal = (
                usuario.id
                != actual.usuario_id
                or destino.id
                != actual.evento_id
                or rol.codigo
                != 'ORGANIZADOR'
                or estado
                != actual.Estado.ACTIVO
            )

            if cambia_principal:
                from rest_framework.exceptions import (
                    ValidationError,
                )

                raise ValidationError(
                    'El organizador '
                    'principal del evento '
                    'no puede ser '
                    'modificado.'
                )

        UsuarioRol.objects.get_or_create(
            usuario=usuario,
            rol=rol,
        )

        miembro = serializer.save()

        registrar_actividad(
            usuario=self.request.user,
            accion='EQUIPO_MIEMBRO_ACTUALIZADO',
            tipo_entidad='MiembroEquipoEvento',
            entidad_id=miembro.id,
            metadatos={
                'evento_id':
                    miembro.evento_id,

                'evento':
                    miembro.evento.nombre,

                'usuario_id':
                    miembro.usuario_id,

                'correo':
                    miembro.usuario.correo,

                'rol':
                    miembro.rol.codigo,

                'estado':
                    miembro.estado,
            },
            request=self.request,
        )

    def perform_destroy(
        self,
        instance
    ):
        if not usuario_tiene_permiso(
            self.request.user,
            'equipo.gestionar',
        ):
            from rest_framework.exceptions import (
                PermissionDenied,
            )

            raise PermissionDenied(
                'No tienes permiso '
                'para gestionar equipos.'
            )

        if not es_organizador_evento(
            self.request.user,
            instance.evento,
        ):
            from rest_framework.exceptions import (
                PermissionDenied,
            )

            raise PermissionDenied(
                'No puedes modificar '
                'este equipo.'
            )

        es_principal = (
            instance.usuario_id
            == instance.evento.creado_por_id
            and instance.rol.codigo
            == 'ORGANIZADOR'
        )

        if es_principal:
            from rest_framework.exceptions import (
                ValidationError,
            )

            raise ValidationError(
                'El organizador principal '
                'del evento no puede '
                'ser eliminado.'
            )

        registrar_actividad(
            usuario=self.request.user,
            accion='EQUIPO_MIEMBRO_ELIMINADO',
            tipo_entidad='MiembroEquipoEvento',
            entidad_id=instance.id,
            metadatos={
                'evento_id':
                    instance.evento_id,

                'evento':
                    instance.evento.nombre,

                'usuario_id':
                    instance.usuario_id,

                'correo':
                    instance.usuario.correo,

                'rol':
                    instance.rol.codigo,
            },
            request=self.request,
        )

        instance.delete()


class InscripcionViewSet(
    viewsets.ReadOnlyModelViewSet
):
    serializer_class = (
        InscripcionSerializer
    )

    permission_classes = [
        permissions.IsAuthenticated
    ]

    def get_queryset(self):
        return (
            Inscripcion.objects
            .select_related(
                'evento',
                'usuario',
            )
            .filter(
                usuario=
                    self.request.user
            )
        )

    @action(
        detail=False,
        methods=['get']
    )
    def mias(
        self,
        request
    ):
        return Response(
            self.get_serializer(
                self.get_queryset(),
                many=True,
            ).data
        )

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[
            permissions.IsAuthenticated
        ],
    )
    @transaction.atomic
    def cancelar(
        self,
        request,
        pk=None
    ):
        inscripcion = self.get_object()

        evento = (
            inscripcion.evento
        )

        if (
            inscripcion.estado
            == Inscripcion
            .Estado.CANCELADA
        ):
            return Response(
                {
                    'detail':
                        'La inscripción ya '
                        'está cancelada.'
                },
                status=
                    status.HTTP_409_CONFLICT,
            )

        if (
            timezone.now()
            >= evento.fecha_hora_inicio
        ):
            return Response(
                {
                    'detail':
                        'No puedes cancelar '
                        'una inscripción '
                        'cuando el evento '
                        'ya comenzó.'
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )

        try:
            entrada = (
                inscripcion.entrada
            )

        except Entrada.DoesNotExist:
            entrada = None

        if (
            entrada
            and entrada.estado
            == Entrada.Estado.UTILIZADA
        ):
            return Response(
                {
                    'detail':
                        'No puedes cancelar '
                        'una entrada que ya '
                        'fue utilizada.'
                },
                status=
                    status.HTTP_409_CONFLICT,
            )

        ahora = timezone.now()

        inscripcion.estado = (
            Inscripcion
            .Estado.CANCELADA
        )

        inscripcion.cancelado_en = (
            ahora
        )

        inscripcion.save(
            update_fields=[
                'estado',
                'cancelado_en',
            ]
        )

        if entrada:
            entrada.estado = (
                Entrada
                .Estado.CANCELADA
            )

            entrada.cancelada_en = (
                ahora
            )

            entrada.save(
                update_fields=[
                    'estado',
                    'cancelada_en',
                ]
            )

        Notificacion.objects.create(
            usuario=request.user,
            evento=evento,
            titulo='Inscripción cancelada',
            contenido=(
                f'Tu inscripción a '
                f'{evento.nombre} '
                f'fue cancelada.'
            ),
            tipo='CANCELACION',
        )

        registrar_actividad(
            usuario=request.user,
            accion='INSCRIPCION_CANCELADA',
            tipo_entidad='Inscripcion',
            entidad_id=inscripcion.id,
            metadatos={
                'evento_id':
                    evento.id,

                'evento':
                    evento.nombre,

                'entrada_id': (
                    entrada.id
                    if entrada
                    else None
                ),
            },
            request=request,
        )

        return Response({
            'detail':
                'Inscripción cancelada '
                'correctamente.',

            'inscripcion_id':
                inscripcion.id,

            'estado':
                inscripcion.estado,
        })


class EntradaViewSet(
    viewsets.ReadOnlyModelViewSet
):
    serializer_class = EntradaSerializer

    permission_classes = [
        permissions.IsAuthenticated
    ]

    def get_queryset(self):
        qs = (
            Entrada.objects
            .select_related(
                'inscripcion__evento',
                'tipo_entrada',
            )
        )

        if es_admin(
            self.request.user
        ):
            return qs

        if not usuario_tiene_permiso(
            self.request.user,
            'entradas.ver_propias',
        ):
            return qs.none()

        return qs.filter(
            inscripcion__usuario=
                self.request.user
        )

    @action(
        detail=False,
        methods=['get']
    )
    def mias(
        self,
        request
    ):
        return Response(
            self.get_serializer(
                self.get_queryset(),
                many=True,
            ).data
        )

    @action(
        detail=True,
        methods=['get']
    )
    def qr(
        self,
        request,
        pk=None
    ):
        entrada = self.get_object()

        token = (
            token_qr_para_codigo(
                entrada.codigo_publico
            )
        )

        imagen = qrcode.make(
            token
        )

        buffer = io.BytesIO()

        imagen.save(
            buffer,
            format='PNG'
        )

        return HttpResponse(
            buffer.getvalue(),
            content_type='image/png',
        )

    @action(
        detail=True,
        methods=['get'],
        url_path='codigo-validacion',
    )
    def codigo_validacion(
        self,
        request,
        pk=None
    ):
        entrada = self.get_object()

        if (
            entrada.estado
            != Entrada.Estado.ACTIVA
        ):
            return Response(
                {
                    'detail':
                        'Solo las entradas '
                        'activas tienen un '
                        'código de validación '
                        'disponible.'
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )

        return Response({
            'entrada_id':
                entrada.id,

            'codigo_publico':
                entrada.codigo_publico,

            'estado':
                entrada.estado,
        })


class EscanearQRView(APIView):
    permission_classes = [
        permissions.IsAuthenticated
    ]

    @transaction.atomic
    def post(
        self,
        request
    ):
        serializer = (
            EscanearQRSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        evento_id = (
            serializer.validated_data[
                'evento_id'
            ]
        )

        valor_ingresado = (
            serializer.validated_data[
                'token_qr'
            ].strip()
        )

        dispositivo = (
            serializer.validated_data
            .get(
                'informacion_dispositivo',
                ''
            )
        )

        if not usuario_tiene_permiso(
            request.user,
            'entradas.validar',
        ):
            return Response(
                {
                    'detail':
                        'No tienes permiso '
                        'para validar entradas.'
                },
                status=
                    status.HTTP_403_FORBIDDEN,
            )

        try:
            evento = (
                Evento.objects.get(
                    id=evento_id
                )
            )

        except Evento.DoesNotExist:
            return Response(
                {
                    'resultado':
                        'INVALIDO',

                    'detail':
                        'Evento inexistente.',
                },
                status=
                    status.HTTP_404_NOT_FOUND,
            )

        if not es_staff_evento(
            request.user,
            evento,
        ):
            return Response(
                {
                    'detail':
                        'No estás asignado '
                        'para validar entradas '
                        'de este evento.'
                },
                status=
                    status.HTTP_403_FORBIDDEN,
            )

        hash_ingresado = hash_token(
            valor_ingresado
        )

        entradas_qs = (
            Entrada.objects
            .select_for_update()
            .select_related(
                'inscripcion__evento',
                'inscripcion__usuario',
                'tipo_entrada',
            )
        )

        entrada = (
            entradas_qs
            .filter(
                codigo_publico__iexact=
                    valor_ingresado
            )
            .first()
        )

        es_codigo_publico = (
            entrada is not None
        )

        if not entrada:
            entrada = (
                entradas_qs
                .filter(
                    hash_token_qr=
                        hash_ingresado
                )
                .first()
            )

        if not entrada:
            escaneo = (
                EscaneoEntrada.objects
                .create(
                    evento=evento,
                    escaneado_por=request.user,
                    hash_token_escaneado=
                        hash_ingresado,
                    resultado=
                        EscaneoEntrada
                        .Resultado.INVALIDO,
                    informacion_dispositivo=
                        dispositivo,
                )
            )

            registrar_actividad(
                usuario=request.user,
                accion='QR_VALIDADO',
                tipo_entidad='EscaneoEntrada',
                entidad_id=escaneo.id,
                metadatos={
                    'evento_id':
                        evento.id,

                    'evento':
                        evento.nombre,

                    'resultado':
                        escaneo.resultado,

                    'entrada_id':
                        None,
                },
                request=request,
            )

            return Response(
                {
                    'resultado':
                        'INVALIDO',

                    'detail':
                        'Código de entrada '
                        'no reconocido.',
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )

        if not es_codigo_publico:

            try:
                firmador = signing.Signer(
                    salt='nova.qr.v1'
                )

                codigo = (
                    firmador.unsign(
                        valor_ingresado
                    )
                )

                if (
                    codigo
                    != entrada.codigo_publico
                ):
                    raise signing.BadSignature

            except signing.BadSignature:

                escaneo = (
                    EscaneoEntrada.objects
                    .create(
                        evento=evento,
                        entrada=entrada,
                        escaneado_por=
                            request.user,
                        hash_token_escaneado=
                            hash_ingresado,
                        resultado=
                            EscaneoEntrada
                            .Resultado.INVALIDO,
                        informacion_dispositivo=
                            dispositivo,
                    )
                )

                registrar_actividad(
                    usuario=request.user,
                    accion='QR_VALIDADO',
                    tipo_entidad=
                        'EscaneoEntrada',
                    entidad_id=escaneo.id,
                    metadatos={
                        'evento_id':
                            evento.id,

                        'evento':
                            evento.nombre,

                        'resultado':
                            escaneo.resultado,

                        'entrada_id':
                            entrada.id,
                    },
                    request=request,
                )

                return Response(
                    {
                        'resultado':
                            'INVALIDO',

                        'detail':
                            'Código QR '
                            'no válido.',
                    },
                    status=
                        status.HTTP_400_BAD_REQUEST,
                )

        ahora = timezone.now()

        detalle = None

        if (
            entrada.inscripcion.evento_id
            != evento.id
        ):
            resultado = (
                EscaneoEntrada
                .Resultado
                .EVENTO_INCORRECTO
            )

            http_status = (
                status.HTTP_400_BAD_REQUEST
            )

        elif (
            ahora
            < evento.fecha_hora_inicio
        ):
            resultado = (
                EscaneoEntrada
                .Resultado.INVALIDO
            )

            http_status = (
                status.HTTP_400_BAD_REQUEST
            )

            detalle = (
                'La validación de entradas '
                'aún no está habilitada '
                'para este evento.'
            )

        elif (
            ahora
            > evento.fecha_hora_fin
        ):
            resultado = (
                EscaneoEntrada
                .Resultado.EXPIRADO
            )

            http_status = (
                status.HTTP_400_BAD_REQUEST
            )

            detalle = (
                'El evento ya finalizó.'
            )

        elif (
            entrada.estado
            == Entrada.Estado.UTILIZADA
        ):
            resultado = (
                EscaneoEntrada
                .Resultado.YA_UTILIZADO
            )

            http_status = (
                status.HTTP_409_CONFLICT
            )

        elif (
            entrada.estado
            == Entrada.Estado.CANCELADA
        ):
            resultado = (
                EscaneoEntrada
                .Resultado.CANCELADO
            )

            http_status = (
                status.HTTP_400_BAD_REQUEST
            )

        elif (
            entrada.estado
            == Entrada.Estado.EXPIRADA
        ):
            resultado = (
                EscaneoEntrada
                .Resultado.EXPIRADO
            )

            http_status = (
                status.HTTP_400_BAD_REQUEST
            )

        else:
            resultado = (
                EscaneoEntrada
                .Resultado.VALIDO
            )

            http_status = (
                status.HTTP_200_OK
            )

        escaneo = (
            EscaneoEntrada.objects
            .create(
                evento=evento,
                entrada=entrada,
                escaneado_por=request.user,
                hash_token_escaneado=
                    hash_ingresado,
                resultado=resultado,
                informacion_dispositivo=
                    dispositivo,
            )
        )

        if (
            resultado
            == EscaneoEntrada
            .Resultado.VALIDO
        ):
            entrada.estado = (
                Entrada
                .Estado.UTILIZADA
            )

            entrada.utilizada_en = (
                timezone.now()
            )

            entrada.save(
                update_fields=[
                    'estado',
                    'utilizada_en',
                ]
            )

            (
                Asistencia.objects
                .get_or_create(
                    entrada=entrada,
                    defaults={
                        'escaneo_valido':
                            escaneo,

                        'registrado_por':
                            request.user,
                    },
                )
            )

        registrar_actividad(
            usuario=request.user,
            accion='QR_VALIDADO',
            tipo_entidad='EscaneoEntrada',
            entidad_id=escaneo.id,
            metadatos={
                'evento_id':
                    evento.id,

                'evento':
                    evento.nombre,

                'resultado':
                    resultado,

                'entrada_id':
                    entrada.id,

                'participante_id':
                    entrada
                    .inscripcion
                    .usuario_id,

                'metodo': (
                    'CODIGO_PUBLICO'
                    if es_codigo_publico
                    else 'QR'
                ),
            },
            request=request,
        )

        respuesta = {
            'resultado':
                resultado,

            'entrada':
                EntradaSerializer(
                    entrada
                ).data,

            'participante':
                entrada
                .inscripcion
                .usuario
                .nombre_completo,
        }

        if detalle:
            respuesta[
                'detail'
            ] = detalle

        return Response(
            respuesta,
            status=http_status,
        )


class ReporteEventoView(APIView):
    permission_classes = [
        permissions.IsAuthenticated
    ]

    def get(
        self,
        request,
        evento_id
    ):
        if not usuario_tiene_permiso(
            request.user,
            'reportes.ver_evento',
        ):
            return Response(
                {
                    'detail':
                        'No tienes permiso '
                        'para consultar '
                        'reportes.'
                },
                status=
                    status.HTTP_403_FORBIDDEN,
            )

        try:
            evento = (
                Evento.objects.get(
                    id=evento_id
                )
            )

        except Evento.DoesNotExist:
            return Response(
                {
                    'detail':
                        'Evento inexistente.',
                },
                status=
                    status.HTTP_404_NOT_FOUND,
            )

        if not es_organizador_evento(
            request.user,
            evento,
        ):
            return Response(
                {
                    'detail':
                        'No tienes permiso '
                        'para consultar '
                        'este reporte.'
                },
                status=
                    status.HTTP_403_FORBIDDEN,
            )

        inscritos = (
            evento.inscripciones
            .filter(
                estado=
                    Inscripcion
                    .Estado.CONFIRMADA
            )
            .count()
        )

        asistieron = (
            Asistencia.objects
            .filter(
                entrada__inscripcion__evento=
                    evento
            )
            .count()
        )

        por_tipo = list(
            TipoEntrada.objects
            .filter(
                evento=evento
            )
            .annotate(
                emitidas=Count(
                    'entradas'
                ),
                usadas=Count(
                    'entradas',
                    filter=Q(
                        entradas__estado=
                            Entrada
                            .Estado.UTILIZADA
                    ),
                ),
            )
            .values(
                'id',
                'nombre',
                'emitidas',
                'usadas',
            )
        )

        registrar_actividad(
            usuario=request.user,
            accion=
                'REPORTE_EVENTO_CONSULTADO',
            tipo_entidad='Evento',
            entidad_id=evento.id,
            metadatos={
                'evento':
                    evento.nombre,
            },
            request=request,
        )

        return Response({
            'evento': {
                'id':
                    evento.id,

                'nombre':
                    evento.nombre,
            },

            'inscritos':
                inscritos,

            'asistieron':
                asistieron,

            'ausentes':
                max(
                    inscritos - asistieron,
                    0
                ),

            'porcentaje_asistencia': (
                round(
                    (
                        asistieron
                        / inscritos
                        * 100
                    ),
                    2
                )
                if inscritos
                else 0
            ),

            'tipos_entrada':
                por_tipo,
        })