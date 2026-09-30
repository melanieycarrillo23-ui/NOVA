from .models import RegistroActividad


def obtener_ip(request):
    """
    Obtiene la dirección IP desde la solicitud HTTP.
    """

    if request is None:
        return None

    forwarded_for = request.META.get(
        'HTTP_X_FORWARDED_FOR'
    )

    if forwarded_for:
        return forwarded_for.split(',')[0].strip()

    return request.META.get(
        'REMOTE_ADDR'
    )


def registrar_actividad(
    *,
    usuario=None,
    accion,
    tipo_entidad='',
    entidad_id=None,
    metadatos=None,
    request=None
):
    """
    Registra una acción importante realizada en NOVA.
    """

    return RegistroActividad.objects.create(
        usuario_actor=usuario,
        accion=accion,
        tipo_entidad=tipo_entidad,
        entidad_id=entidad_id,
        metadatos=metadatos,
        direccion_ip=obtener_ip(request)
    )