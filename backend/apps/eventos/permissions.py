from apps.cuentas.permissions import usuario_tiene_rol
from django.db.models import Q
from .models import Evento, MiembroEquipoEvento


def es_admin(usuario):
    return usuario_tiene_rol(usuario, 'ADMIN')


def es_organizador_evento(usuario, evento):
    if es_admin(usuario):
        return True
    return MiembroEquipoEvento.objects.filter(
        evento=evento,
        usuario=usuario,
        rol__codigo='ORGANIZADOR',
        estado=MiembroEquipoEvento.Estado.ACTIVO,
    ).exists()


def es_staff_evento(usuario, evento):
    if es_admin(usuario) or es_organizador_evento(usuario, evento):
        return True
    return MiembroEquipoEvento.objects.filter(
        evento=evento,
        usuario=usuario,
        rol__codigo='STAFF',
        estado=MiembroEquipoEvento.Estado.ACTIVO,
    ).exists()


def filtrar_eventos_visibles(queryset, usuario):
    if usuario.is_authenticated and es_admin(usuario):
        return queryset

    visibles = Q(estado=Evento.Estado.PUBLICADO, visibilidad=Evento.Visibilidad.PUBLICO)
    if usuario.is_authenticated:
        visibles |= Q(creado_por=usuario)
        visibles |= Q(equipo__usuario=usuario, equipo__estado=MiembroEquipoEvento.Estado.ACTIVO)
        visibles |= Q(inscripciones__usuario=usuario, inscripciones__estado='CONFIRMADA')
    return queryset.filter(visibles).distinct()


def organiza_evento(usuario, evento):
    """Identifica al creador o al organizador activo, sin excepción global de ADMIN."""
    if not usuario or not usuario.is_authenticated:
        return False
    return evento.creado_por_id == usuario.pk or MiembroEquipoEvento.objects.filter(
        evento=evento,
        usuario=usuario,
        rol__codigo='ORGANIZADOR',
        estado=MiembroEquipoEvento.Estado.ACTIVO,
    ).exists()

