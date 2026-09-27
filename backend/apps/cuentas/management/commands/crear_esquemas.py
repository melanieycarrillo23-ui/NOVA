from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Crea los esquemas PostgreSQL requeridos por NOVA.'

    def handle(self, *args, **options):
        if connection.vendor != 'postgresql':
            self.stdout.write(self.style.WARNING('La base de datos no es PostgreSQL; no se crean esquemas.'))
            return
        with connection.cursor() as cursor:
            for esquema in ('autenticacion', 'eventos', 'auditoria'):
                cursor.execute(f'CREATE SCHEMA IF NOT EXISTS {esquema};')
        self.stdout.write(self.style.SUCCESS('Esquemas de NOVA preparados.'))
