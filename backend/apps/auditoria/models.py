from django.conf import settings
from django.db import models
from django.utils import timezone

class RegistroActividad(models.Model):
    usuario_actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='registros_auditoria')
    accion = models.CharField(max_length=100)
    tipo_entidad = models.CharField(max_length=80, blank=True)
    entidad_id = models.BigIntegerField(null=True, blank=True)
    metadatos = models.JSONField(null=True, blank=True)
    direccion_ip = models.GenericIPAddressField(null=True, blank=True)
    creado_en = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = '"auditoria"."registros_actividad"'
        indexes = [models.Index(fields=['tipo_entidad', 'entidad_id'], name='ix_audit_entidad')]
        ordering = ['-creado_en']
