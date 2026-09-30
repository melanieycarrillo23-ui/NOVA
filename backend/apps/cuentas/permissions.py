from rest_framework.permissions import BasePermission


def usuario_tiene_rol(usuario, *codigos):
    """
    Comprueba si un usuario posee al menos uno de los roles indicados.
    """

    if not usuario or not usuario.is_authenticated:
        return False

    if getattr(usuario, 'es_superusuario', False):
        return True

    return usuario.asignaciones_roles.filter(
        rol__codigo__in=codigos
    ).exists()


def usuario_tiene_permiso(usuario, codigo_permiso):
    """
    Comprueba si alguno de los roles del usuario tiene asignado
    el permiso indicado.
    """

    if not usuario or not usuario.is_authenticated:
        return False

    if getattr(usuario, 'es_superusuario', False):
        return True

    return usuario.asignaciones_roles.filter(
        rol__asignaciones_permisos__permiso__codigo=codigo_permiso
    ).exists()


class EsAdministrador(BasePermission):
    """
    Permite acceso únicamente a usuarios con rol ADMIN.
    """

    def has_permission(self, request, view):
        return usuario_tiene_rol(
            request.user,
            'ADMIN'
        )


class PuedeGestionarUsuarios(BasePermission):
    """
    Requiere el permiso usuarios.gestionar.
    """

    def has_permission(self, request, view):
        return usuario_tiene_permiso(
            request.user,
            'usuarios.gestionar'
        )