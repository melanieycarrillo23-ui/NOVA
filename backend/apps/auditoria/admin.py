from django.contrib import admin
from .models import RegistroActividad

@admin.register(RegistroActividad)
class RegistroActividadAdmin(admin.ModelAdmin):
    list_display = ('accion', 'tipo_entidad', 'entidad_id', 'usuario_actor', 'creado_en')
    search_fields = ('accion', 'tipo_entidad')
    readonly_fields = ('creado_en',)
