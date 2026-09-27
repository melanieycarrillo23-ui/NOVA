from django.contrib import admin
from .models import Usuario, Rol, Permiso, UsuarioRol, RolPermiso

@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    list_display = ('id', 'correo', 'nombre_completo', 'estado', 'es_staff_django')
    search_fields = ('correo', 'nombre_completo')
    list_filter = ('estado', 'es_staff_django')

admin.site.register(Rol)
admin.site.register(Permiso)
admin.site.register(UsuarioRol)
admin.site.register(RolPermiso)
