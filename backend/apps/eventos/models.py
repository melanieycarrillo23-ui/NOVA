from django.conf import settings
from django.db import models
from django.utils import timezone
from apps.cuentas.models import Rol


class CategoriaEvento(models.Model):
    nombre = models.CharField(max_length=80, unique=True)
    descripcion = models.CharField(max_length=255, blank=True)
    esta_activa = models.BooleanField(default=True)
    creado_en = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = '"eventos"."categorias_evento"'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Lugar(models.Model):
    nombre = models.CharField(max_length=150)
    direccion = models.CharField(max_length=255, blank=True)
    ciudad = models.CharField(max_length=100, blank=True, db_index=True)
    region = models.CharField(max_length=100, blank=True)
    codigo_pais = models.CharField(max_length=3, blank=True, db_index=True)
    latitud = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitud = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    creado_en = models.DateTimeField(default=timezone.now)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"eventos"."lugares"'
        ordering = ['ciudad', 'nombre']

    def __str__(self):
        return f'{self.nombre} - {self.ciudad}' if self.ciudad else self.nombre


class Evento(models.Model):
    class Modalidad(models.TextChoices):
        PRESENCIAL = 'PRESENCIAL', 'Presencial'
        VIRTUAL = 'VIRTUAL', 'Virtual'
        HIBRIDO = 'HIBRIDO', 'Híbrido'

    class Visibilidad(models.TextChoices):
        PUBLICO = 'PUBLICO', 'Público'
        PRIVADO = 'PRIVADO', 'Privado'

    class Estado(models.TextChoices):
        BORRADOR = 'BORRADOR', 'Borrador'
        PUBLICADO = 'PUBLICADO', 'Publicado'
        CANCELADO = 'CANCELADO', 'Cancelado'
        FINALIZADO = 'FINALIZADO', 'Finalizado'

    creado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='eventos_creados')
    categoria = models.ForeignKey(CategoriaEvento, on_delete=models.SET_NULL, null=True, blank=True, related_name='eventos')
    lugar = models.ForeignKey(Lugar, on_delete=models.SET_NULL, null=True, blank=True, related_name='eventos')
    nombre = models.CharField(max_length=180)
    identificador_url = models.SlugField(max_length=220, unique=True)
    descripcion_corta = models.CharField(max_length=300, blank=True)
    descripcion = models.TextField(blank=True)
    modalidad = models.CharField(max_length=20, choices=Modalidad.choices, default=Modalidad.PRESENCIAL)
    visibilidad = models.CharField(max_length=20, choices=Visibilidad.choices, default=Visibilidad.PUBLICO)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.BORRADOR, db_index=True)
    capacidad = models.PositiveIntegerField(null=True, blank=True)
    fecha_hora_inicio = models.DateTimeField(db_index=True)
    fecha_hora_fin = models.DateTimeField()
    inicio_inscripciones = models.DateTimeField(null=True, blank=True)
    cierre_inscripciones = models.DateTimeField(null=True, blank=True)
    url_virtual = models.URLField(max_length=500, blank=True)
    url_imagen_portada = models.URLField(max_length=500, blank=True)
    creado_en = models.DateTimeField(default=timezone.now)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"eventos"."eventos"'
        ordering = ['-fecha_hora_inicio']
        indexes = [models.Index(fields=['estado', 'fecha_hora_inicio'], name='ix_evento_estado_fecha')]

    def __str__(self):
        return self.nombre


class MiembroEquipoEvento(models.Model):
    class Estado(models.TextChoices):
        ACTIVO = 'ACTIVO', 'Activo'
        INACTIVO = 'INACTIVO', 'Inactivo'

    evento = models.ForeignKey(Evento, on_delete=models.CASCADE, related_name='equipo')
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='equipos_eventos')
    rol = models.ForeignKey(Rol, on_delete=models.PROTECT, related_name='miembros_eventos')
    asignado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='asignaciones_equipo_realizadas')
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ACTIVO)
    asignado_en = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = '"eventos"."miembros_equipo_evento"'
        constraints = [models.UniqueConstraint(fields=['evento', 'usuario', 'rol'], name='uq_equipo_evento_usuario_rol')]


class TipoEntrada(models.Model):
    class Estado(models.TextChoices):
        ACTIVO = 'ACTIVO', 'Activo'
        INACTIVO = 'INACTIVO', 'Inactivo'

    evento = models.ForeignKey(Evento, on_delete=models.CASCADE, related_name='tipos_entrada')
    nombre = models.CharField(max_length=100)
    descripcion = models.CharField(max_length=255, blank=True)
    precio = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cupo = models.PositiveIntegerField(null=True, blank=True)
    inicio_disponibilidad = models.DateTimeField(null=True, blank=True)
    fin_disponibilidad = models.DateTimeField(null=True, blank=True)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ACTIVO)
    creado_en = models.DateTimeField(default=timezone.now)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"eventos"."tipos_entrada"'
        constraints = [models.UniqueConstraint(fields=['evento', 'nombre'], name='uq_tipo_entrada_evento_nombre')]

    def __str__(self):
        return f'{self.evento.nombre} - {self.nombre}'


class Inscripcion(models.Model):
    class Estado(models.TextChoices):
        CONFIRMADA = 'CONFIRMADA', 'Confirmada'
        PENDIENTE = 'PENDIENTE', 'Pendiente'
        CANCELADA = 'CANCELADA', 'Cancelada'

    evento = models.ForeignKey(Evento, on_delete=models.CASCADE, related_name='inscripciones')
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='inscripciones')
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.CONFIRMADA, db_index=True)
    inscrito_en = models.DateTimeField(default=timezone.now)
    cancelado_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = '"eventos"."inscripciones"'
        constraints = [models.UniqueConstraint(fields=['evento', 'usuario'], name='uq_inscripcion_evento_usuario')]
        indexes = [models.Index(fields=['evento', 'estado'], name='ix_insc_evento_estado')]


class Entrada(models.Model):
    class Estado(models.TextChoices):
        ACTIVA = 'ACTIVA', 'Activa'
        UTILIZADA = 'UTILIZADA', 'Utilizada'
        CANCELADA = 'CANCELADA', 'Cancelada'
        EXPIRADA = 'EXPIRADA', 'Expirada'

    inscripcion = models.OneToOneField(Inscripcion, on_delete=models.CASCADE, related_name='entrada')
    tipo_entrada = models.ForeignKey(TipoEntrada, on_delete=models.PROTECT, related_name='entradas')
    codigo_publico = models.CharField(max_length=80, unique=True)
    hash_token_qr = models.CharField(max_length=255, unique=True)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ACTIVA, db_index=True)
    emitida_en = models.DateTimeField(default=timezone.now)
    utilizada_en = models.DateTimeField(null=True, blank=True)
    cancelada_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = '"eventos"."entradas"'

    def __str__(self):
        return self.codigo_publico


class EscaneoEntrada(models.Model):
    class Resultado(models.TextChoices):
        VALIDO = 'VALIDO', 'Válido'
        YA_UTILIZADO = 'YA_UTILIZADO', 'Ya utilizado'
        INVALIDO = 'INVALIDO', 'Inválido'
        CANCELADO = 'CANCELADO', 'Cancelado'
        EVENTO_INCORRECTO = 'EVENTO_INCORRECTO', 'Evento incorrecto'
        EXPIRADO = 'EXPIRADO', 'Expirado'

    evento = models.ForeignKey(Evento, on_delete=models.CASCADE, related_name='escaneos')
    entrada = models.ForeignKey(Entrada, on_delete=models.SET_NULL, null=True, blank=True, related_name='escaneos')
    escaneado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='escaneos_realizados')
    hash_token_escaneado = models.CharField(max_length=255, blank=True, db_index=True)
    resultado = models.CharField(max_length=30, choices=Resultado.choices)
    escaneado_en = models.DateTimeField(default=timezone.now)
    informacion_dispositivo = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = '"eventos"."escaneos_entrada"'
        indexes = [models.Index(fields=['evento', 'escaneado_en'], name='ix_escaneo_evento_fecha')]


class Asistencia(models.Model):
    entrada = models.OneToOneField(Entrada, on_delete=models.CASCADE, related_name='asistencia')
    escaneo_valido = models.OneToOneField(EscaneoEntrada, on_delete=models.SET_NULL, null=True, blank=True, related_name='asistencia_generada')
    registrado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='asistencias_registradas')
    fecha_hora_ingreso = models.DateTimeField(default=timezone.now, db_index=True)
    metodo = models.CharField(max_length=20, default='QR')

    class Meta:
        db_table = '"eventos"."asistencias"'


class Notificacion(models.Model):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notificaciones')
    evento = models.ForeignKey(Evento, on_delete=models.CASCADE, null=True, blank=True, related_name='notificaciones')
    titulo = models.CharField(max_length=150)
    contenido = models.TextField()
    tipo = models.CharField(max_length=30, blank=True)
    esta_leida = models.BooleanField(default=False)
    creado_en = models.DateTimeField(default=timezone.now)
    leida_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = '"eventos"."notificaciones"'
        indexes = [models.Index(fields=['usuario', 'esta_leida'], name='ix_notif_usuario_leida')]
