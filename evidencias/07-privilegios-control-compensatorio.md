# Evidencia 07 — Cambios de privilegios y control compensatorio

**Estudiante:** Jesus Ruben Monzon Garcia | **Materia:** Gestión de Seguridad y Desempeño de Bases de Datos | **Servidor:** MongoDB 7.0.34 Community | **Fecha de ejecución:** 2026-11-23

## Objetivo
Comprobar qué evidencia existe de un cambio de privilegios y aplicar instantáneas periódicas como control compensatorio, explicando su límite.

## Procedimiento
Instantánea 1, nivel 2 de perfilado, `grantRolesToUser` (`dbAdmin` a `app_ventas`), búsqueda de evidencia, instantánea 2, comparación, y reversión (revoke y restablecer el filtro).

## Resultado
```text
(sesión del DBA) mongosh "mongodb://admin:<REDACTED>@127.0.0.1:27017/comercial?authSource=admin" --quiet --file js/snap.js
> db.getSiblingDB("auditoria").instantaneas_privilegios.insertOne({ momento: new Date(), tomada_por: db.runCommand({ connectionStatus: 1 }).authInfo.authenticatedUsers, usuarios: db.getUsers().users.map(u => ({ user: u.user, db: u.db, roles: u.roles })) }).acknowledged
true
(sesión del DBA) mongosh "mongodb://admin:<REDACTED>@127.0.0.1:27017/comercial?authSource=admin" --quiet --file js/a7grant.js
> db.setProfilingLevel(2)
{
  was: 1,
  slowms: 100,
  sampleRate: 1,
  filter: { op: { '$in': [ 'insert', 'remove', 'update' ] } },
  note: 'When a filter expression is set, slowms and sampleRate are not used for profiling and slow-query log lines.',
  ok: 1
}
> db.grantRolesToUser("app_ventas", [{ role: "dbAdmin", db: "comercial" }])
{ ok: 1 }
> db.system.profile.countDocuments({ "command.grantRolesToUser": { $exists: true } })
0
> bitacora().filter(e => JSON.stringify(e).includes("grantRoles")).length
0
(segunda instantánea)
> db.getSiblingDB("auditoria").instantaneas_privilegios.insertOne({ momento: new Date(), tomada_por: db.runCommand({ connectionStatus: 1 }).authInfo.authenticatedUsers, usuarios: db.getUsers().users.map(u => ({ user: u.user, db: u.db, roles: u.roles })) }).acknowledged
true
(sesión del DBA) mongosh "mongodb://admin:<REDACTED>@127.0.0.1:27017/comercial?authSource=admin" --quiet --file js/a7cmp.js
> db.getSiblingDB("auditoria").instantaneas_privilegios.find({}, { _id: 0 }).sort({ momento: 1 })
[
  {
    momento: 2026-11-24T02:22:45.742Z,
    tomada_por: [ { user: 'admin', db: 'admin' } ],
    usuarios: [
      { user: 'app_ventas', db: 'comercial', roles: [ { role: 'readWrite', db: 'comercial' } ] }
    ]
  },
  {
    momento: 2026-11-24T02:22:50.141Z,
    tomada_por: [ { user: 'admin', db: 'admin' } ],
    usuarios: [
      {
        user: 'app_ventas',
        db: 'comercial',
        roles: [ { role: 'readWrite', db: 'comercial' }, { role: 'dbAdmin', db: 'comercial' } ]
      }
    ]
  }
]
(sesión del DBA) mongosh "mongodb://admin:<REDACTED>@127.0.0.1:27017/comercial?authSource=admin" --quiet --file js/a7revoke.js
> db.revokeRolesFromUser("app_ventas", [{ role: "dbAdmin", db: "comercial" }])
{ ok: 1 }
> db.setProfilingLevel(1, { filter: { op: { $in: ["insert", "update", "remove"] } } })
{
  was: 2,
  slowms: 100,
  sampleRate: 1,
  filter: { op: { '$in': [ 'insert', 'remove', 'update' ] } },
  note: 'When a filter expression is set, slowms and sampleRate are not used for profiling and slow-query log lines.',
  ok: 1
}
> db.getUsers().users.map(u => ({ user: u.user, roles: u.roles }))
[
  { user: 'app_ventas', roles: [ { role: 'readWrite', db: 'comercial' } ] }
]
> db.system.profile.countDocuments()
2
> bitacora().length
503
```

| Pregunta | ¿La instantánea responde? | Evidencia |
|---|---|---|
| ¿Cambiaron los privilegios de `app_ventas`? | **Sí** | La 2.ª instantánea tiene un rol más |
| ¿Qué rol se agregó? | **Sí** | `dbAdmin` sobre `comercial` |
| ¿Quién lo agregó? | **No** | `tomada_por` dice quién tomó la instantánea (admin), no quién hizo el cambio |
| ¿Cuándo exactamente? | **No** | Solo sé que ocurrió entre las 02:22:45.742Z y las 02:22:50.141Z |

La búsqueda en `system.profile` (nivel 2) y en la bitácora dio **0** y **0**: no hay evidencia del `grantRolesToUser` en ninguna de las dos fuentes.

## Respuestas

**1. ¿Por qué es de los eventos auditables más importantes?** Porque los privilegios determinan lo que cada usuario puede hacer. Un cambio no autorizado (por ejemplo, darse un rol más amplio) permite escalar privilegios y sostener un acceso indebido.

**2. ¿Con qué frecuencia tomaría instantáneas? ¿Qué factores influyen?** Depende de la criticidad de los datos, del tiempo máximo que acepto entre un cambio y su detección, de cuántos cambios legítimos hay, de los requisitos de cumplimiento y del costo (una instantánea es pequeña). Es un criterio mío: para algo crítico, cada pocos minutos, y siempre antes y después de cambios planeados; para algo menos crítico, a diario.

**3. ¿Quién debería poder escribir en `auditoria.instantaneas_privilegios`?** Una cuenta de servicio dedicada, con solo permiso de insertar en esa colección, sin actualizar ni borrar, y distinta del DBA cuyos cambios se vigilan y de `app_ventas`. Lectura para auditoría o seguridad. Aun así un `root` podría alterarla, por eso conviene enviar copias a un almacenamiento externo (suposición mía, no la probé).

**4. Tres líneas para Dirección:**
> Detectamos que los privilegios de `app_ventas` cambiaron (se agregó `dbAdmin`), comparando dos revisiones periódicas.
> No podemos saber quién lo hizo ni a qué hora exacta, porque MongoDB Community no tiene auditoría nativa.
> Las revisiones son un control compensatorio, no una auditoría; para tener autor y hora hace falta auditoría nativa (Enterprise o Atlas) u otros controles.

## Conclusión
Las instantáneas permiten **detectar** un cambio de privilegios, pero no **atribuirlo**. No equivalen a la auditoría nativa.
