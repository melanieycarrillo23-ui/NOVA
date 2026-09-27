from django.contrib import admin
from .models import CategoriaEvento, Lugar, Evento, MiembroEquipoEvento, TipoEntrada, Inscripcion, Entrada, EscaneoEntrada, Asistencia, Notificacion

admin.site.register(CategoriaEvento)
admin.site.register(Lugar)
admin.site.register(Evento)
admin.site.register(MiembroEquipoEvento)
admin.site.register(TipoEntrada)
admin.site.register(Inscripcion)
admin.site.register(Entrada)
admin.site.register(EscaneoEntrada)
admin.site.register(Asistencia)
admin.site.register(Notificacion)
