# Evidencia 03 — Perfilador (nivel 2)

**Estudiante:** Jesus Ruben Monzon Garcia | **Materia:** Gestión de Seguridad y Desempeño de Bases de Datos | **Servidor:** MongoDB 7.0.34 Community | **Fecha de ejecución:** 2026-11-23

## Objetivo
Activar el perfilador al nivel 2 en la base `comercial`, registrar una consulta, una actualización y una eliminación de la aplicación e interpretarlas.

## Procedimiento
`db.setProfilingLevel(2)` en la base activa (`comercial`); la aplicación ejecuta `find`, `updateOne` y `deleteOne`; consulto `system.profile`. Como en la Actividad 4 se borra `system.profile`, exporté estos documentos como evidencia adicional en `system-profile-actividad3.json`.

## Resultado
```text
(sesión del DBA) mongosh "mongodb://admin:<REDACTED>@127.0.0.1:27017/comercial?authSource=admin" --quiet --file js/a3on.js
> db.setProfilingLevel(2)
{ was: 0, slowms: 100, sampleRate: 1, ok: 1 }
> db.getProfilingStatus()
{ was: 2, slowms: 100, sampleRate: 1, ok: 1 }
$ mongosh "mongodb://app_ventas:<REDACTED>@127.0.0.1:27017/comercial?appName=app-ventas-web" --quiet --eval 'db.clientes.find({ ciudad: "Culiacán" }, { nombre: 1, ciudad: 1 }).toArray(); db.clientes.updateOne({ _id: 3 }, { $set: { rfc: "GAMA780912XYZ" } }); db.clientes.deleteOne({ _id: 2 });'
{ acknowledged: true, deletedCount: 1 }
(sesión del DBA) mongosh "mongodb://admin:<REDACTED>@127.0.0.1:27017/comercial?authSource=admin" --quiet --file js/a3q.js
> db.system.profile.find({ ns: "comercial.clientes" }, { op: 1, ns: 1, command: 1, user: 1, client: 1, appName: 1, ts: 1, millis: 1, nreturned: 1, docsExamined: 1, nModified: 1, ndeleted: 1 }).sort({ ts: 1 })
[
  {
    op: 'query',
    ns: 'comercial.clientes',
    command: {
      find: 'clientes',
      filter: { ciudad: 'Culiacán' },
      projection: { nombre: 1, ciudad: 1 },
      lsid: { id: UUID('055d4d97-c1ea-4239-9e14-fa424a00a996') },
      '$db': 'comercial'
    },
    docsExamined: 5,
    nreturned: 3,
    millis: 1,
    ts: 2026-11-24T02:22:35.282Z,
    client: '127.0.0.1',
    appName: 'app-ventas-web',
    user: 'app_ventas@comercial'
  },
  {
    op: 'update',
    ns: 'comercial.clientes',
    command: { q: { _id: 3 }, u: { '$set': { rfc: 'GAMA780912XYZ' } }, multi: false, upsert: false },
    docsExamined: 1,
    nModified: 1,
    millis: 0,
    ts: 2026-11-24T02:22:35.286Z,
    client: '127.0.0.1',
    appName: 'app-ventas-web',
    user: 'app_ventas@comercial'
  },
  {
    op: 'remove',
    ns: 'comercial.clientes',
    command: { q: { _id: 2 }, limit: 1 },
    docsExamined: 1,
    ndeleted: 1,
    millis: 0,
    ts: 2026-11-24T02:22:35.290Z,
    client: '127.0.0.1',
    appName: 'app-ventas-web',
    user: 'app_ventas@comercial'
  }
]
```

### 9.1 Interpretación

| # | op | Usuario | Cliente | Aplicación | Momento (UTC) | Qué hizo | Documentos afectados |
|---|---|---|---|---|---|---|---|
| 1 | query | `app_ventas@comercial` | 127.0.0.1 | app-ventas-web | 2026-11-24 02:22:35.282 | `find` con filtro `ciudad: "Culiacán"` y proyección de nombre y ciudad | 5 examinados, 3 devueltos |
| 2 | update | `app_ventas@comercial` | 127.0.0.1 | app-ventas-web | 2026-11-24 02:22:35.286 | `$set` de `rfc: "GAMA780912XYZ"` en `_id: 3` | 1 examinado, 1 modificado |
| 3 | remove | `app_ventas@comercial` | 127.0.0.1 | app-ventas-web | 2026-11-24 02:22:35.290 | Eliminó el documento con `_id: 2` | 1 examinado, 1 eliminado |

## Respuestas

**1. ¿Puedes saber el RFC antes del cambio con `system.profile`?** No. El documento de la actualización guarda el comando con el valor **nuevo** (`GAMA780912XYZ`), no el anterior.

**2. ¿Puedes saber qué datos tenía el documento eliminado?** No. Solo queda el filtro `{ _id: 2 }` y `ndeleted: 1`; el contenido eliminado (el cliente Carlos Pérez) no aparece.

**3. Ventaja y riesgo de que el nivel 2 registre también la consulta (a diferencia de `log_statement = 'mod'` en PostgreSQL).**
- Ventaja: se tiene trazabilidad de lecturas (quién consultó qué y cuándo), incluidas las de datos sensibles.
- Riesgo: `system.profile` guarda los comandos completos, o sea filtros y valores, como el RFC nuevo `GAMA780912XYZ` y la ciudad buscada. Los datos personales quedan duplicados en otra colección. Además el nivel 2 puede degradar el rendimiento (REF-U3-05) y ocupa espacio.

**4. ¿Por qué `user` incluye `@comercial`?** Porque en MongoDB un usuario se define dentro de una base de datos (la de autenticación). `app_ventas@comercial` significa el usuario `app_ventas` definido en `comercial`; otro `app_ventas` definido en otra base sería un usuario distinto.

## Conclusión
El perfilador en nivel 2 da usuario, cliente, aplicación y momento de cada operación. No da el valor anterior ni lo eliminado.