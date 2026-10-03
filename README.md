# NOVA — Sistema de eventos con entradas QR

NOVA es una plataforma web para crear y administrar eventos, gestionar inscripciones, generar entradas QR y registrar la asistencia de los participantes.

Incluye autenticación, control de acceso mediante roles y permisos, gestión de equipos por evento, reportes y auditoría de acciones.

## Stack tecnológico

- Frontend: Angular 18.
- Backend: Django REST Framework.
- Base de datos: PostgreSQL 17.
- Autenticación: JWT con access token y refresh token.
- Documentación de API: Swagger / OpenAPI.
- Servidor frontend: Nginx.
- Contenedores: Docker Compose.

## Roles

El sistema utiliza cuatro roles globales:

| Rol | Función |
| --- | --- |
| ADMIN | Administra la plataforma y sus usuarios. |
| ORGANIZADOR | Crea y administra eventos. |
| STAFF | Participa en la operación de los eventos asignados. |
| USUARIO | Explora eventos, realiza inscripciones y consulta sus entradas. |

Una cuenta puede tener varios roles. Además, cada evento puede contar con un equipo cuyos integrantes tengan funciones de ORGANIZADOR o STAFF.

El acceso a las acciones depende de los permisos del usuario y de su relación con el evento.

## Funcionalidades

### Autenticación y perfil

- Registro e inicio de sesión.
- Autenticación mediante JWT.
- Renovación del access token.
- Rotación y bloqueo de refresh tokens.
- Cierre de sesión.
- Consulta y gestión del perfil.

### Gestión de usuarios

- Consulta de usuarios.
- Búsqueda por nombre o correo.
- Filtro por estado.
- Consulta de roles.
- Cambio de estado de las cuentas.
- Protección para impedir que un administrador cambie el estado de su propia cuenta.

### Gestión de eventos

- Creación, consulta y edición de eventos.
- Publicación y cancelación.
- Configuración de categorías, lugares y modalidades.
- Gestión de tipos de entrada y cupos.
- Configuración del periodo de inscripción.
- Asignación de organizadores y personal de apoyo.
- Consulta de eventos propios con filtros por estado.

### Catálogo de eventos

Explorar eventos muestra los eventos publicados cuya fecha de finalización todavía no ha pasado, respetando las reglas de visibilidad y acceso.

El catálogo permite:

- Buscar por texto.
- Filtrar por modalidad.
- Consultar los resultados mediante paginación.
- Ver los eventos ordenados por fecha.

Los borradores, cancelados y finalizados no aparecen en el catálogo.

Inicio presenta un resumen de hasta cuatro eventos. La opción «Ver todos» abre el catálogo completo con paginación.

### Historial y eliminación

Los eventos que terminan se conservan junto con sus inscripciones, entradas y registros de asistencia.

En Mis eventos se pueden consultar mediante los filtros:

- Todos.
- Publicados vigentes.
- Borradores.
- Finalizados.
- Cancelados.

Los eventos publicados cuya fecha de finalización ya pasó se muestran como finalizados en este listado. Esta clasificación visual no modifica automáticamente el estado almacenado en la base de datos.

La eliminación se permite únicamente para eventos en estado BORRADOR que no tengan inscripciones, escaneos ni notificaciones asociadas.

Si un evento no se realizará, se puede cambiar su estado a CANCELADO para conservar sus registros.

### Inscripciones

- Inscripción a eventos.
- Consulta de inscripciones propias.
- Cancelación de inscripciones.
- Reactivación cuando corresponde.
- Validación del periodo de inscripción.
- Control de capacidad del evento y cupos por tipo de entrada.

### Entradas y códigos QR

- Generación de entradas asociadas a las inscripciones.
- Identificador público de cada entrada.
- Generación de códigos QR.
- Consulta de entradas propias.
- Validación de entradas por personal autorizado.

### Validación y asistencia

Durante la validación se comprueba:

- Que la entrada exista.
- Que corresponda al evento seleccionado.
- Que la entrada esté activa y su inscripción esté confirmada.
- Que el estado y el periodo del evento permitan la validación.
- Que la entrada no se haya utilizado previamente.

Cuando la validación es correcta, se registra la asistencia. Los intentos de escaneo permiten consultar el resultado de la validación.

### Gestión de asistentes

- Consulta y búsqueda de asistentes.
- Filtros y paginación.
- Importación mediante CSV.
- Exportación mediante CSV.

### Reportes

Los reportes permiten consultar información del evento relacionada con inscripciones, entradas, asistencia, estados y tipos de entrada.

### Auditoría

El sistema registra acciones relevantes relacionadas con usuarios, eventos, inscripciones, entradas, validaciones, equipos y reportes.

## Estructura del proyecto

- `backend/`: API, autenticación, permisos y lógica de negocio.
- `frontend/`: interfaz web desarrollada con Angular.
- `database/`: scripts de base de datos.
- `docker-compose.yml`: configuración de los servicios.
- `.env.example`: plantilla de variables de entorno.
- `ARQUITECTURA.md`: documentación de la arquitectura.

## Ejecución local con Docker

### Requisitos

- Git.
- Docker Desktop instalado y en ejecución.

### Instalación

Clona el repositorio:

```powershell
git clone https://github.com/melanieycarrillo23-ui/NOVA.git
cd NOVA
```

Crea el archivo de variables de entorno a partir de la plantilla:

```powershell
Copy-Item .env.example .env
```

Revisa el archivo `.env` y configura los valores necesarios antes de iniciar los servicios.

Construye e inicia los contenedores:

```powershell
docker compose up -d --build
```

Comprueba su estado:

```powershell
docker compose ps
```

Todos los comandos de Docker Compose deben ejecutarse desde la carpeta que contiene `docker-compose.yml`.

### Actualizar backend y frontend

Después de modificar el código, reconstruye los servicios:

```powershell
docker compose up -d --build backend frontend
```

### Consultar registros

```powershell
docker compose logs --tail=100 backend frontend
```

### Detener los servicios

```powershell
docker compose stop
```

## Configuración y datos

El archivo `.env` contiene la configuración local y no debe incluirse en el repositorio. `.env.example` sirve como plantilla y debe mantenerse sin credenciales reales.

Git conserva el código y los scripts del proyecto, pero no respalda automáticamente los datos almacenados en PostgreSQL. Los respaldos de la base de datos deben realizarse por separado.