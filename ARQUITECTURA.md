# Arquitectura de NOVA

```text
Angular
   │ HTTP/JSON
   ▼
Django REST Framework
   ├─ JWT + Refresh Token
   ├─ Roles globales
   ├─ Permisos por evento
   ├─ Generación/validación QR
   └─ Lógica de negocio
   │ ORM
   ▼
PostgreSQL
   ├─ autenticacion
   ├─ eventos
   └─ auditoria
```

## Regla central de permisos
El rol global habilita el módulo, pero `miembros_equipo_evento` determina sobre qué evento puede actuar un ORGANIZADOR o STAFF.

Ejemplo: una cuenta puede ser `USUARIO + ORGANIZADOR + STAFF`, pero ser ORGANIZADOR del Evento A y STAFF del Evento B sin obtener permisos administrativos sobre el Evento C.

## Flujo QR
1. El usuario se inscribe.
2. El backend emite una entrada y crea un token firmado.
3. PostgreSQL almacena únicamente el hash del token QR.
4. El frontend obtiene la imagen QR desde la API autenticada.
5. STAFF envía el token leído a la API de validación.
6. La API verifica firma, evento, estado y uso previo.
7. Un QR válido crea una asistencia única y marca la entrada como utilizada.
8. Todos los intentos quedan en `escaneos_entrada`.
