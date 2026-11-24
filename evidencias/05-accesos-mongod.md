# Evidencia 05 — Accesos en la bitácora de mongod

**Estudiante:** Jesus Ruben Monzon Garcia | **Materia:** Gestión de Seguridad y Desempeño de Bases de Datos | **Servidor:** MongoDB 7.0.34 Community | **Fecha de ejecución:** 2026-11-23

## Objetivo
Generar accesos fallidos y buscar en la bitácora los fallidos y el último exitoso de la aplicación.

## Procedimiento
Dos conexiones fallidas (contraseña incorrecta y usuario inexistente) y consultas al log con `bitacora()` (la función de la sección 6.4). Agregué `speculative` y el operador `?.` a la consulta del lab para no fallar si falta algún campo.

## Resultado
```text
$ mongosh "mongodb://app_ventas:<REDACTED>@127.0.0.1:27017/comercial" --quiet --eval "db.clientes.countDocuments()"
MongoServerError: Authentication failed.
$ mongosh "mongodb://usuario_inexistente:x@127.0.0.1:27017/comercial" --quiet --eval "db.clientes.countDocuments()"
MongoServerError: Authentication failed.
(sesión del DBA) mongosh "mongodb://admin:<REDACTED>@127.0.0.1:27017/comercial?authSource=admin" --quiet --file js/a5.js
> bitacora().filter(e => e.c === "ACCESS" && e.msg === "Failed to authenticate").map(e => ({ t: e.t, id: e.id, ctx: e.ctx, user: e.attr.user, client: e.attr.client, error: e.attr.error, result: e.attr.result, speculative: e.attr.isSpeculative, app: e.attr.doc?.application?.name }))
[
  {
    t: { '$date': '2026-11-24T02:22:41.528+00:00' },
    id: 5286307,
    ctx: 'conn52',
    user: 'app_ventas',
    client: '127.0.0.1:44726',
    error: 'AuthenticationFailed: SCRAM authentication failed, storedKey mismatch',
    result: 18,
    speculative: true,
    app: 'mongosh 2.14.3'
  },
  {
    t: { '$date': '2026-11-24T02:22:42.332+00:00' },
    id: 5286307,
    ctx: 'conn54',
    user: 'usuario_inexistente',
    client: '127.0.0.1:39016',
    error: 'UserNotFound: Could not find user "usuario_inexistente" for db "comercial"',
    result: 11,
    speculative: true,
    app: 'mongosh 2.14.3'
  },
  {
    t: { '$date': '2026-11-24T02:22:42.333+00:00' },
    id: 5286307,
    ctx: 'conn54',
    user: 'usuario_inexistente',
    client: '127.0.0.1:39016',
    error: 'UserNotFound: Could not find user "usuario_inexistente" for db "comercial"',
    result: 11,
    speculative: false,
    app: 'mongosh 2.14.3'
  }
]
> bitacora().filter(e => e.msg === "Successfully authenticated" && e.attr.user === "app_ventas").slice(-1).map(e => ({ t: e.t, id: e.id, ctx: e.ctx, client: e.attr.client, result: e.attr.result, app: e.attr.doc?.application?.name }))
[
  {
    t: { '$date': '2026-11-24T02:22:39.544+00:00' },
    id: 5286306,
    ctx: 'conn46',
    client: '127.0.0.1:44678',
    result: 0,
    app: 'app-ventas-web'
  }
]
```

## Respuestas

**1. ¿Qué campo distingue un acceso fallido de uno exitoso?** El mensaje (`msg`: `Failed to authenticate` frente a `Successfully authenticated`) y el `id` del evento (`5286307` fallido, `5286306` exitoso). También `result`: `0` es éxito; `18` y `11` son errores.

**2. ¿Diferencia entre contraseña incorrecta y usuario inexistente? ¿Por qué el cliente recibe el mismo mensaje?**
- Contraseña incorrecta: `AuthenticationFailed: SCRAM authentication failed, storedKey mismatch` (`result: 18`).
- Usuario inexistente: `UserNotFound: Could not find user "usuario_inexistente" for db "comercial"` (`result: 11`).
- El cliente recibe en ambos casos solo `Authentication failed.` para no revelar si un usuario existe (así se evita enumerar nombres de usuario). El detalle queda únicamente en la bitácora del servidor.

**3. ¿Por qué el nombre de aplicación del intento fallido es `mongosh 2.14.3` y no `app-ventas-web`?** Porque esas cadenas de conexión no incluían `appName`; entonces el cliente se identifica con su nombre por defecto (mongosh y su versión). El intento exitoso sí usó `appName=app-ventas-web`.

**Nota:** para el usuario inexistente aparecen dos líneas (`speculative: true` y `false`) pero fue **un** intento; en total hice 2 intentos fallidos (`conn52` y `conn54`).
