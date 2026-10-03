from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import Evento, TipoEntrada


def validar_periodo_inscripcion(evento, tipo=None):
    ahora = timezone.now()
    if evento.estado != Evento.Estado.PUBLICADO:
        raise ValidationError({'detail': 'El evento no está disponible para inscripciones.'})
    if ahora >= evento.fecha_hora_fin:
        raise ValidationError({'detail': 'El evento ya finalizó.'})
    if evento.inicio_inscripciones and ahora < evento.inicio_inscripciones:
        raise ValidationError({'detail': 'Las inscripciones aún no han iniciado.'})
    if evento.cierre_inscripciones and ahora >= evento.cierre_inscripciones:
        raise ValidationError({'detail': 'Las inscripciones ya finalizaron.'})
    if tipo is not None:
        if tipo.estado != TipoEntrada.Estado.ACTIVO:
            raise ValidationError({'detail': 'Este tipo de entrada no está disponible.'})
        if tipo.inicio_disponibilidad and ahora < tipo.inicio_disponibilidad:
            raise ValidationError({'detail': 'Este tipo de entrada aún no está disponible.'})
        if tipo.fin_disponibilidad and ahora >= tipo.fin_disponibilidad:
            raise ValidationError({'detail': 'La disponibilidad de este tipo de entrada finalizó.'})
