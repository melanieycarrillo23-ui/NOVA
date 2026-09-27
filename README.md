# NOVA — Sistema de eventos con entradas QR

Base de proyecto full stack orientada a una plataforma de eventos con inscripciones, entradas QR, validación, asistencia y reportes.

## Stack definitivo
- Frontend: Angular 18
- Backend: Django REST Framework
- Base de datos: PostgreSQL 17
- Autenticación: JWT + Refresh Token
- QR: generado en backend y validado mediante API
- Permisos: roles globales + permisos específicos por evento
- Despliegue local: Docker Compose

## Roles
- ADMIN: supervisa la plataforma completa.
- ORGANIZADOR: crea y administra sus eventos.
- STAFF: valida entradas y controla asistencia únicamente en eventos asignados.
- USUARIO: explora eventos, se inscribe y consulta sus entradas.

Una misma cuenta puede tener varios roles. Además, `miembros_equipo_evento` define en qué evento concreto una persona actúa como ORGANIZADOR o STAFF.

## Esquemas PostgreSQL
- `autenticacion`: usuarios, roles, permisos y sesiones.
- `eventos`: eventos, inscripciones, entradas, QR y asistencia.
- `auditoria`: trazabilidad de acciones.

## Ejecutar con Docker
1. Instala Docker Desktop.
2. Opcional: copia `.env.example` a `.env` y cambia los valores de desarrollo.
3. Desde la carpeta raíz ejecuta:

```bash
docker compose up --build
```

Servicios:
- Frontend: http://localhost:4200
- API: http://localhost:8000/api/
- Admin Django: http://localhost:8000/admin/
- PostgreSQL: localhost:5433

### Cuenta de desarrollo
Si no cambias las variables de entorno:
- correo: `admin@nova.local`
- contraseña: `NovaAdmin123!`

Estas credenciales son únicamente para desarrollo local. Cámbialas antes de cualquier despliegue real.

## API principal
- `POST /api/auth/registro/`
- `POST /api/auth/token/`
- `POST /api/auth/token/refresh/`
- `GET /api/auth/me/`
- `GET/POST /api/eventos/`
- `GET/PATCH/DELETE /api/eventos/{id}/`
- `POST /api/eventos/{id}/inscribirse/`
- `GET /api/inscripciones/mias/`
- `GET /api/entradas/mias/`
- `GET /api/entradas/{id}/qr/`
- `POST /api/validaciones/escanear/`
- `GET /api/reportes/evento/{id}/`

## Estructura
```text
NOVA/
├── frontend/          Angular
├── backend/           Django REST Framework
├── database/
│   ├── init/          creación de esquemas PostgreSQL
│   └── mer/           MER en DBML
├── docker-compose.yml
└── README.md
```

## Importante
El MER es la referencia conceptual. En ejecución, Django controla la estructura mediante modelos y migraciones. No se deben crear manualmente las tablas de negocio por fuera de las migraciones.

## Migraciones durante el desarrollo
El `docker-compose.yml` monta `./backend` dentro del contenedor y en el arranque ejecuta `makemigrations` antes de `migrate`. En el primer inicio se generarán los archivos de migración dentro de `backend/apps/*/migrations/`; consérvalos y súbelos a tu repositorio. Cuando el modelo quede estable para producción, elimina `makemigrations` del comando de arranque y despliega únicamente con migraciones ya versionadas.
