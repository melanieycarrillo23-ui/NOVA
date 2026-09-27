from apps.cuentas.permissions import usuario_tiene_rol
from .models import MiembroEquipoEvento


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
