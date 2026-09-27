import os
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.text import slugify
from apps.cuentas.models import Usuario, Rol, Permiso, UsuarioRol, RolPermiso


ROLES = {
    'ADMIN': 'Administrador',
    'ORGANIZADOR': 'Organizador',
    'STAFF': 'Personal del evento',
    'USUARIO': 'Usuario',
}

PERMISOS = {
    'usuarios.gestionar': 'Gestionar usuarios',
    'eventos.ver': 'Consultar eventos',
    'eventos.crear': 'Crear eventos',
    'eventos.editar_propios': 'Editar eventos propios',
    'equipo.gestionar': 'Gestionar equipo del evento',
    'inscripciones.crear': 'Inscribirse a eventos',
    'inscripciones.ver_evento': 'Ver inscritos del evento',
    'entradas.ver_propias': 'Ver entradas propias',
    'entradas.validar': 'Validar entradas QR',
    'reportes.ver_evento': 'Ver reportes del evento',
    'reportes.ver_global': 'Ver reportes globales',
}

ASIGNACIONES = {
    'ADMIN': list(PERMISOS.keys()),
    'ORGANIZADOR': ['eventos.ver', 'eventos.crear', 'eventos.editar_propios', 'equipo.gestionar', 'inscripciones.ver_evento', 'reportes.ver_evento'],
    'STAFF': ['eventos.ver', 'inscripciones.ver_evento', 'entradas.validar'],
    'USUARIO': ['eventos.ver', 'inscripciones.crear', 'entradas.ver_propias'],
}


class Command(BaseCommand):
    help = 'Crea roles, permisos, administrador y datos de demostración.'

    def handle(self, *args, **options):
        roles = {}
        for codigo, nombre in ROLES.items():
            roles[codigo], _ = Rol.objects.get_or_create(codigo=codigo, defaults={'nombre': nombre})

        permisos = {}
        for codigo, nombre in PERMISOS.items():
            permisos[codigo], _ = Permiso.objects.get_or_create(codigo=codigo, defaults={'nombre': nombre})

        for rol_codigo, codigos_permiso in ASIGNACIONES.items():
            for permiso_codigo in codigos_permiso:
                RolPermiso.objects.get_or_create(rol=roles[rol_codigo], permiso=permisos[permiso_codigo])

        correo = os.getenv('ADMIN_EMAIL', 'admin@nova.local')
        password = os.getenv('ADMIN_PASSWORD', 'NovaAdmin123!')
        admin, creado = Usuario.objects.get_or_create(
            correo=correo,
            defaults={'nombre_completo': 'Administrador NOVA', 'es_staff_django': True, 'es_superusuario': True},
        )
        if creado:
            admin.set_password(password)
            admin.save(update_fields=['password'])
        UsuarioRol.objects.get_or_create(usuario=admin, rol=roles['ADMIN'])
        UsuarioRol.objects.get_or_create(usuario=admin, rol=roles['USUARIO'])

        if os.getenv('CARGAR_DEMO', '1') == '1':
            self._crear_demo(roles)

        self.stdout.write(self.style.SUCCESS('Roles, permisos y datos base preparados.'))

    def _crear_demo(self, roles):
        from apps.eventos.models import CategoriaEvento, Lugar, Evento, MiembroEquipoEvento, TipoEntrada

        organizador, creado = Usuario.objects.get_or_create(
            correo='organizador@nova.local',
            defaults={'nombre_completo': 'Sofía Martínez'}
        )
        if creado:
            organizador.set_password('NovaDemo123!')
            organizador.save(update_fields=['password'])
        UsuarioRol.objects.get_or_create(usuario=organizador, rol=roles['USUARIO'])
        UsuarioRol.objects.get_or_create(usuario=organizador, rol=roles['ORGANIZADOR'])

        staff, creado = Usuario.objects.get_or_create(
            correo='staff@nova.local',
            defaults={'nombre_completo': 'Daniel Rojas'}
        )
        if creado:
            staff.set_password('NovaDemo123!')
            staff.save(update_fields=['password'])
        UsuarioRol.objects.get_or_create(usuario=staff, rol=roles['USUARIO'])
        UsuarioRol.objects.get_or_create(usuario=staff, rol=roles['STAFF'])

        categoria, _ = CategoriaEvento.objects.get_or_create(nombre='Tecnología', defaults={'descripcion': 'Congresos, ferias y encuentros tecnológicos.'})
        Lugar.objects.get_or_create(nombre='Centro de Convenciones NOVA', ciudad='Bogotá', defaults={'direccion': 'Dirección de demostración', 'region': 'Bogotá D.C.', 'codigo_pais': 'COL'})
        lugar = Lugar.objects.filter(nombre='Centro de Convenciones NOVA').first()
        slug = 'nova-tech-2026'
        evento, _ = Evento.objects.get_or_create(
            identificador_url=slug,
            defaults={
                'creado_por': organizador,
                'categoria': categoria,
                'lugar': lugar,
                'nombre': 'NOVA Tech 2026',
                'descripcion_corta': 'Encuentro de tecnología, innovación y experiencias digitales.',
                'descripcion': 'Evento de demostración incluido para probar el flujo principal de la plataforma.',
                'estado': Evento.Estado.PUBLICADO,
                'capacidad': 300,
                'fecha_hora_inicio': timezone.now() + timedelta(days=30),
                'fecha_hora_fin': timezone.now() + timedelta(days=30, hours=8),
                'inicio_inscripciones': timezone.now() - timedelta(days=1),
                'cierre_inscripciones': timezone.now() + timedelta(days=29),
            }
        )
        MiembroEquipoEvento.objects.get_or_create(evento=evento, usuario=organizador, rol=roles['ORGANIZADOR'], defaults={'asignado_por': organizador})
        MiembroEquipoEvento.objects.get_or_create(evento=evento, usuario=staff, rol=roles['STAFF'], defaults={'asignado_por': organizador})
        TipoEntrada.objects.get_or_create(evento=evento, nombre='General', defaults={'precio': 0, 'cupo': 250})
        TipoEntrada.objects.get_or_create(evento=evento, nombre='VIP', defaults={'precio': 50000, 'cupo': 50})
