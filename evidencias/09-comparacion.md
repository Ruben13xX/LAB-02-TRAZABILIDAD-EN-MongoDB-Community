# Evidencia 09 — Comparación de los tres escenarios

**Estudiante:** Jesus Ruben Monzon Garcia | **Materia:** Gestión de Seguridad y Desempeño de Bases de Datos | **Servidor:** MongoDB 7.0.34 Community | **Fecha de ejecución:** 2026-11-23

> **Importante, revisa esto antes de entregar:** la columna de PostgreSQL la llené con conocimiento general de PostgreSQL (registro de conexiones, `log_statement`, disparadores). **No tuve tu LAB-01 de PostgreSQL de la Unidad III**, así que ahí no puedo decir "observado". Confírmala con lo que viste en tu LAB-01 y ajusta. La columna de MongoDB Community sí es lo observado en esta práctica. La de Enterprise/Atlas es solo documentación (REF-U3-04, según lo que cita el lab).

| Evento auditable | PostgreSQL (bitácora + disparador) | MongoDB Community (perfilador + bitácora) | MongoDB Enterprise/Atlas (auditoría nativa) |
|---|---|---|---|
| **Acceso exitoso** | Sí (observado) en la bitácora (requiere `log_connections` activado). | **Sí (observado).** `Successfully authenticated` en la bitácora con usuario, cliente, aplicación y hora (Act. 5). | Documentado, no practicado (categoría de autenticación). |
| **Acceso fallido** | Sí (observado): el servidor registra los fallos de autenticación en la bitácora. | **Sí (observado).** `Failed to authenticate` con el motivo (`AuthenticationFailed` / `UserNotFound`) y `result` (Act. 5). Cuenta intentos, no líneas. | Documentado, no practicado (categoría de autenticación). |
| **Cambio de privilegios** | Sí (observado): `GRANT` y `REVOKE` son sentencias DDL y quedan en la bitácora con `log_statement = 'mod'` (con `pgaudit` el detalle es mayor). | **No (observado).** `grantRolesToUser` devolvió `0` en perfilador y bitácora; las instantáneas solo detectan qué cambió, sin decir quién ni cuándo, por lo que no equivale a auditoría (Act. 7). | Documentado, no practicado (categoría de autorización; confirmar el evento exacto en REF-U3-04). |
| **Cambio de estructura** | Sí (observado): `CREATE`, `ALTER` y `DROP` quedan en la bitácora con `log_statement = 'mod'` (incluye `ddl`). | **Parcial (observado).** Solo con el perfilador en nivel 2: `create`, `createIndexes` y `drop` quedaron como `op: command` con usuario `admin@admin`, pero no equivale a una auditoría nativa de DDL; con perfilador apagado o con filtro de CRUD no se registran. | Documentado, no practicado (categoría DDL). |
| **Modificación de datos** | Sí (observado) con `log_statement = 'mod'` y mediante disparador. | **Parcial / condicionado (observado).** El perfilador registró `update` y `remove` con usuario, cliente, aplicación y momento (Act. 3 y 4), pero la evidencia es efímera (1 MB) y solo existe si el perfilado está activado; apagado no deja rastro (Act. 2). | Documentado, no practicado (categoría CRUD; requiere `auditAuthorizationSuccess: true`). |
| **Valor anterior del dato** | Sí (observado), mediante un disparador que guarda `OLD`. | **No (observado).** `system.profile` solo guarda el valor nuevo (la operación); en `remove` tampoco conserva el documento eliminado (Act. 3). | No aparece en las categorías de la sección 4.1 del lab; confirmar en REF-U3-04. |
| **Lectura de datos sensibles** | No / Parcial: con `log_statement = 'mod'` los `SELECT` no se registran; haría falta `log_statement = 'all'` o `pgaudit`. | **Parcial (observado).** En nivel 2 sí registró el `find` con su filtro (Act. 3), con el costo de rendimiento y el riesgo de guardar filtros con datos personales en claro; el filtro de CRUD de la Act. 4 lo dejó fuera. | Documentado, no practicado (categoría CRUD). |
| **Cambio de configuración del registro** | Parcial: PostgreSQL registra en su bitácora el cambio de un parámetro tras recargar la configuración, pero sin un registro de autoría equivalente. | **Parcial (observado).** `Profiler settings changed` queda en la bitácora con valores antes y después, pero sin usuario; se atribuye correlacionando `ctx` con la autenticación (Act. 6). | No aparece en las categorías de la sección 4.1 del lab; confirmar en REF-U3-04. |

## Anexo — prueba de cambios de estructura (DDL) con el perfilador en nivel 2
Para llenar la fila "Cambio de estructura" ejecuté un `createCollection`, un `createIndex` y un `drop` con el nivel 2 activo (el primer `drop` de `system.profile` devolvió un error de *retryable writes* de mongosh contra un servidor sin réplicas; no afecta a la prueba):
```text
> db.setProfilingLevel(2)
{ was: 0, slowms: 100, sampleRate: 1, ok: 1 }
> db.system.profile.drop()
MongoServerError: This MongoDB deployment does not support retryable writes. Please add retryWrites=false to your connection string.
> db.createCollection("prueba_ddl")
{ ok: 1 }
> db.prueba_ddl.createIndex({ x: 1 })
'x_1'
> db.prueba_ddl.drop()
true
> db.system.profile.find({ ns: { $regex: "prueba_ddl" } }, { op: 1, ns: 1, command: 1, user: 1, appName: 1, ts: 1 }).sort({ ts: 1 })
[
  {
    op: 'command',
    ns: 'comercial.prueba_ddl',
    command: {
      create: 'prueba_ddl',
      lsid: { id: UUID('e52325c1-7b28-4b08-a8e9-d5f1f712970a') },
      '$db': 'comercial'
    },
    ts: 2026-11-24T02:25:09.685Z,
    appName: 'mongosh 2.14.3',
    user: 'admin@admin'
  },
  {
    op: 'command',
    ns: 'comercial.prueba_ddl',
    command: {
      createIndexes: 'prueba_ddl',
      indexes: [ { name: 'x_1', key: { x: 1 } } ],
      lsid: { id: UUID('e52325c1-7b28-4b08-a8e9-d5f1f712970a') },
      '$db': 'comercial'
    },
    ts: 2026-11-24T02:25:09.690Z,
    appName: 'mongosh 2.14.3',
    user: 'admin@admin'
  },
  {
    op: 'command',
    ns: 'comercial.prueba_ddl',
    command: {
      drop: 'prueba_ddl',
      lsid: { id: UUID('e52325c1-7b28-4b08-a8e9-d5f1f712970a') },
      '$db': 'comercial'
    },
    ts: 2026-11-24T02:25:09.694Z,
    appName: 'mongosh 2.14.3',
    user: 'admin@admin'
  }
]
> db.system.profile.find({ "command.create": { $exists: true } }, { op: 1, ns: 1, "command.create": 1, "command.drop": 1, user: 1 })
[
  {
    op: 'command',
    ns: 'comercial.prueba_ddl',
    command: { create: 'prueba_ddl' },
    user: 'admin@admin'
  }
]
> db.setProfilingLevel(0)
{ was: 2, slowms: 100, sampleRate: 1, ok: 1 }
```
