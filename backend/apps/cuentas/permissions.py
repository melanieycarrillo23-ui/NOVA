from rest_framework.permissions import BasePermission


def usuario_tiene_rol(usuario, *codigos):
    if not usuario or not usuario.is_authenticated:
        return False
    if getattr(usuario, 'es_superusuario', False):
        return True
    return usuario.asignaciones_roles.filter(rol__codigo__in=codigos).exists()


class EsAdministrador(BasePermission):
    def has_permission(self, request, view):
        return usuario_tiene_rol(request.user, 'ADMIN')
