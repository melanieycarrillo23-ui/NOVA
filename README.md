# NOVA — Sistema de eventos con entradas QR

NOVA es una plataforma web para la gestión de eventos, inscripciones, entradas QR, validación de entradas, control de asistencia y generación de reportes.

El sistema incorpora autenticación, roles, permisos, auditoría, filtros, paginación, importación y exportación de asistentes.

## Stack tecnológico

- Frontend: Angular 18
- Backend: Django REST Framework
- Base de datos: PostgreSQL 17
- Autenticación: JWT + Refresh Token
- Generación y validación de QR
- Documentación de API: Swagger / OpenAPI
- Servidor frontend: Nginx
- Contenedores: Docker Compose

## Roles

NOVA utiliza cuatro roles globales:

- ADMIN: administra la plataforma y sus usuarios.
- ORGANIZADOR: crea y administra eventos.
- STAFF: participa en la operación de eventos asignados.
- USUARIO: explora eventos, realiza inscripciones y consulta sus entradas.

Una misma cuenta puede tener varios roles.

Además, cada evento puede tener miembros de equipo con funciones específicas de ORGANIZADOR o STAFF.

## Funcionalidades principales

### Autenticación

- Registro de usuarios.
- Inicio de sesión.
- JWT Access Token.
- Refresh Token.
- Rotación de refresh tokens.
- Blacklist de tokens.
- Cierre de sesión.
- Gestión del perfil.

### Gestión de usuarios

- Consulta de usuarios.
- Búsqueda por nombre o correo.
- Filtro por estado.
- Consulta de roles.
- Cambio de estado de cuentas.
- Protección para impedir que un administrador cambie el estado de su propia cuenta.

### Gestión de eventos

- Creación de eventos.
- Consulta de eventos.
- Edición de eventos.
- Eliminación de eventos.
- Publicación de eventos.
- Categorías.
- Lugares.
- Modalidades.
- Tipos de entrada.
- Gestión del equipo del evento.

### Exploración de eventos

Los usuarios pueden consultar los eventos disponibles mediante:

- Búsqueda por texto.
- Filtro por modalidad.
- Paginación.
- Ordenamiento por fecha.

### Inscripciones

- Inscripción a eventos.
- Consulta de inscripciones propias.
- Cancelación de inscripciones.
- Reactivación cuando corresponde.
- Control de cupos.

### Entradas y QR

- Generación de entradas.
- Código público de entrada.
- Generación de código QR.
- Consulta de entradas propias.
- Validación de entradas.

### Validación y asistencia

La validación de una entrada comprueba:

- Que la entrada exista.
- Que pertenezca al evento correspondiente.
- Que se encuentre activa.
- Que el evento esté dentro de su periodo válido.
- Que la entrada no haya sido utilizada previamente.

Cuando la validación es correcta se registra la asistencia.

### Gestión de asistentes

- Consulta de asistentes.
- Búsqueda de asistentes.
- Filtros.
- Paginación.
- Importación mediante CSV.
- Exportación mediante CSV.

### Reportes

NOVA permite consultar información del evento relacionada con:

- Inscripciones.
- Entradas.
- Asistencia.
- Estados.
- Tipos de entrada.
- Información general del evento.

### Auditoría

El sistema registra acciones relevantes realizadas por los usuarios, incluyendo acciones relacionadas con:

- Usuarios.
- Eventos.
- Inscripciones.
- Entradas.
- Validaciones.
- Equipo de eventos.
- Reportes.

## Roles y permisos

Los permisos se manejan mediante roles globales y permisos específicos.

Algunos permisos utilizados por el sistema son:

```text
usuarios.gestionar
eventos.ver
eventos.crear
eventos.editar_propios
equipo.gestionar
inscripciones.crear
inscripciones.ver_evento
entradas.ver_propias
entradas.validar
reportes.ver_evento
reportes.ver_global