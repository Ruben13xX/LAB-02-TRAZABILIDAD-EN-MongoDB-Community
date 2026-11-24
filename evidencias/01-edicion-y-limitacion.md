# Evidencia 01 — Edición de MongoDB y limitación de la auditoría

**Estudiante:** Jesus Ruben Monzon Garcia | **Materia:** Gestión de Seguridad y Desempeño de Bases de Datos | **Servidor:** MongoDB 7.0.34 Community | **Fecha de ejecución:** 2026-11-23

## Objetivo
Comprobar qué edición de MongoDB estoy usando, con qué configuración arrancó y demostrar que la auditoría nativa no existe en Community.

## Procedimiento
Sesión del DBA con `db.version()`, `buildInfo.modules` y `serverCmdLineOpts().parsed`. Después intenté arrancar un `mongod` con la opción de auditoría de Enterprise (`--auditDestination`).

## Resultado
```text
comercial> db.version()
7.0.34
comercial> db.adminCommand({ buildInfo: 1 }).modules
[]
comercial> db.serverCmdLineOpts().parsed
{ net: { bindIp: '*' }, security: { authorization: 'enabled' } }
comercial>
```

```text
{"t":{"$date":"2026-11-24T02:53:57.617+00:00"},"s":"I",  "c":"WTCHKPT",  "id":22430,   "ctx":"Checkpointer","msg":"WiredTiger message","attr":{"message":{"ts_sec":1795488837,"ts_usec":617497,"thread":"1:0x7f92b8bd5640","session_name":"WT_SESSION.checkpoint","category":"WT_VERB_CHECKPOINT_PROGRESS","category_id":6,"verbose_level":"DEBUG_1","verbose_level_id":1,"msg":"saving checkpoint snapshot min: 66, snapshot max: 66 snapshot count: 0, oldest timestamp: (0, 0) , meta checkpoint timestamp: (0, 0) base write gen: 1"}}}
{"t":{"$date":"2026-11-24T02:54:57.627+00:00"},"s":"I",  "c":"WTCHKPT",  "id":22430,   "ctx":"Checkpointer","msg":"WiredTiger message","attr":{"message":{"ts_sec":1795488897,"ts_usec":627869,"thread":"1:0x7f92b8bd5640","session_name":"WT_SESSION.checkpoint","category":"WT_VERB_CHECKPOINT_PROGRESS","category_id":6,"verbose_level":"DEBUG_1","verbose_level_id":1,"msg":"saving checkpoint snapshot min: 68, snapshot max: 68 snapshot count: 0, oldest timestamp: (0, 0) , meta checkpoint timestamp: (0, 0) base write gen: 1"}}}
{"t":{"$date":"2026-11-24T02:55:57.633+00:00"},"s":"I",  "c":"WTCHKPT",  "id":22430,   "ctx":"Checkpointer","msg":"WiredTiger message","attr":{"message":{"ts_sec":1795488957,"ts_usec":633823,"thread":"1:0x7f92b8bd5640","session_name":"WT_SESSION.checkpoint","category":"WT_VERB_CHECKPOINT_PROGRESS","category_id":6,"verbose_level":"DEBUG_1","verbose_level_id":1,"msg":"saving checkpoint snapshot min: 69, snapshot max: 69 snapshot count: 0, oldest timestamp: (0, 0) , meta checkpoint timestamp: (0, 0) base write gen: 1"}}}
```

## Respuestas

**1. ¿Qué edición uso y qué lo demuestra?** MongoDB **Community** 7.0.34. Lo demuestran: `modules` sale vacío (`[]`; en Enterprise incluiría `"enterprise"`) y `mongod` rechaza la opción de auditoría con `unrecognised option '--auditDestination'`, es decir, la opción no existe en este binario.

**2. ¿A dónde escribe mi servidor su bitácora?** A la **salida estándar** del proceso.`serverCmdLineOpts().parsed` solo trae `config`, `net`, `security` y `storage`: no hay sección `systemLog`, así que no se configuró archivo.

**3. Categorías de eventos de la auditoría nativa (REF-U3-04):** cambios de esquema (DDL); eventos de conjuntos de réplicas y clústeres fragmentados; autenticación y autorización; y operaciones CRUD (estas requieren `auditAuthorizationSuccess: true`).

**4. ¿Qué evaluaría una organización antes de licenciar Enterprise o migrar a Atlas solo por la auditoría?**
- Si el requisito justifica el costo de la licencia o de un clúster Atlas M10 o superior frente a controles compensatorios.
- Qué eventos necesita realmente auditar y si la auditoría nativa los cubre.
- Costo de desempeño y almacenamiento de auditar (sobre todo CRUD), y dónde se guardarán los registros y por cuánto tiempo (consola, syslog, JSON o BSON).
- Esfuerzo de migración, operación y capacitación, y si hay otras razones para pasar a esa edición.