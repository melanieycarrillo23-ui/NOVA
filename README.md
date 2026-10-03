# NOVA — Gestión de eventos con entradas QR

NOVA permite crear eventos, administrar equipos, inscribir asistentes, emitir entradas QR, registrar asistencia y consultar reportes. Utiliza Angular 18, Django REST Framework, PostgreSQL 17 y JWT. Docker Compose ejecuta PostgreSQL, el backend y el frontend servido por Nginx.

## Aplicar esta versión a tu proyecto actual

Esta entrega contiene el código completo basado en NOVA(1).zip y las correcciones integradas. No necesitas aplicar además NOVA_correcciones.zip.

1. Conserva una copia de tu carpeta actual y el respaldo nova_revision.dump.
2. En la terminal de tu carpeta original NOVA, donde está docker-compose.yml, ejecuta:

```powershell
docker compose stop backend frontend
```

3. Descomprime la entrega en otra ubicación. Abre la carpeta NOVA de la entrega y copia TODO su contenido dentro de tu carpeta original NOVA. Acepta combinar carpetas y reemplazar archivos con el mismo nombre. No borres tu carpeta original: allí permanecen tu .env y tu configuración de trabajo.
4. Sigue usando la misma carpeta original. Ejecuta:

```powershell
docker compose up -d --build backend frontend
docker compose exec backend python manage.py check
```

5. Abre http://localhost:4200, recarga con Ctrl + F5 y vuelve a iniciar sesión.

Este procedimiento conserva la base de datos existente. No hace falta restaurar el dump ni crear migraciones nuevas. La entrega no incluye tu .env, el historial Git, node_modules ni entornos virtuales: conserva los originales y Docker construirá las dependencias que necesita.

Si un servicio no inicia, consulta:

```powershell
docker compose ps
docker compose logs --tail=80 backend frontend
```

## Estructura

- backend/: configuración Django y aplicaciones cuentas, eventos y auditoria.
- frontend/: aplicación Angular, configuración de Nginx y proxy para desarrollo local.
- database/: creación de esquemas y diagrama de la base de datos.
- docker-compose.yml: servicios, conexiones y volumen de PostgreSQL.
- .env.example: ejemplo de configuración; no reemplaza tu .env existente.
- CAMBIOS.md: correcciones aplicadas y comprobaciones realizadas.

La carpeta tienda-ropa-web no está incluida en el ZIP recibido ni pertenece a la configuración de NOVA. En VS Code, usa Archivo > Abrir carpeta y selecciona tu carpeta original NOVA para trabajar únicamente en este proyecto.

## Roles y permisos

Los roles globales son ADMIN, ORGANIZADOR, STAFF y USUARIO. Una cuenta puede tener varios. Los roles habilitan funciones; los miembros del equipo determinan en qué eventos puede operar un organizador o un integrante del personal. El administrador puede gestionar la plataforma.

## Desarrollo local de Angular

Si Django ya está ejecutándose en http://127.0.0.1:8000, puedes iniciar Angular fuera de Docker:

```powershell
cd frontend
npm ci
npm start
```

proxy.conf.json envía las solicitudes /api al backend local. Nginx mantiene su propio proxy cuando ejecutas el frontend en Docker. Usa un solo frontend en el puerto 4200 a la vez.

## Comprobación manual

- Inscríbete en un evento publicado con fechas vigentes y descarga el QR.
- Cancela la inscripción y vuelve a inscribirte antes del inicio.
- Valida la entrada durante el horario del evento: el primer intento registra asistencia y el segundo se rechaza.
- Un evento cancelado o finalizado no admite validación válida ni nuevas inscripciones.
- Un tipo de entrada con entradas emitidas se puede desactivar, pero no eliminar.
