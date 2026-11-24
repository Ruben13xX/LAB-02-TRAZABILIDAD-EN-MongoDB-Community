# Evidencia 02 — El incidente sin perfilado

**Estudiante:** Jesus Ruben Monzon Garcia | **Materia:** Gestión de Seguridad y Desempeño de Bases de Datos | **Servidor:** MongoDB 7.0.34 Community | **Fecha de ejecución:** 2026-11-23

## Objetivo
Ver qué evidencia existe cuando la aplicación modifica el RFC con el perfilador apagado.

## Procedimiento
1. En el DBA: `db.getProfilingStatus()`.
2. La aplicación (`app_ventas`, `appName=app-ventas-web`) actualiza el RFC de `_id: 3`.
3. En el DBA busco evidencia en `system.profile` y en la bitácora.

## Resultado
```text
 db.getProfilingStatus()
{ was: 0, slowms: 100, sampleRate: 1, ok: 1 }



 db.clientes.updateOne({ _id: 3 }, { $set: { rfc: "GAMA780912XXX" } })
{
  acknowledged: true,
  insertedId: null,
  matchedCount: 1,
  modifiedCount: 1,
  upsertedCount: 0
}

db.system.profile.countDocuments()
0
comercial> bitacora().filter(e => JSON.stringify(e).includes("GAMA780912XXX")).length
0
comercial> bitacora().filter(e => JSON.stringify(e).includes("app-ventas-web")).map(e => ({ t: e.t, c: e.c, ctx: e.ctx, msg: e.msg }))
|
[
  {
    t: { '$date': '2026-11-24T02:51:50.393+00:00' },
    c: 'NETWORK',
    ctx: 'conn17',
    msg: 'client metadata'
  },
  {
    t: { '$date': '2026-11-24T02:51:50.393+00:00' },
    c: 'ACCESS',
    ctx: 'conn17',
    msg: 'Connection not authenticating'
  },
  {
    t: { '$date': '2026-11-24T02:51:50.397+00:00' },
    c: 'NETWORK',
    ctx: 'conn18',
    msg: 'client metadata'
  },
  {
    t: { '$date': '2026-11-24T02:51:50.404+00:00' },
    c: 'ACCESS',
    ctx: 'conn18',
    msg: 'Successfully authenticated'
  },
  {
    t: { '$date': '2026-11-24T02:51:50.416+00:00' },
    c: 'NETWORK',
    ctx: 'conn19',
    msg: 'client metadata'
  },
  {
    t: { '$date': '2026-11-24T02:51:50.417+00:00' },
    c: 'NETWORK',
    ctx: 'conn20',
    msg: 'client metadata'
  },
  {
    t: { '$date': '2026-11-24T02:51:50.420+00:00' },
    c: 'ACCESS',
    ctx: 'conn19',
    msg: 'Successfully authenticated'
  },
  {
    t: { '$date': '2026-11-24T02:51:50.420+00:00' },
    c: 'ACCESS',
    ctx: 'conn20',
    msg: 'Successfully authenticated'
  },
  {
    t: { '$date': '2026-11-24T02:52:00.898+00:00' },
    c: 'NETWORK',
    ctx: 'conn21',
    msg: 'client metadata'
  },
  {
    t: { '$date': '2026-11-24T02:52:00.898+00:00' },
    c: 'ACCESS',
    ctx: 'conn21',
    msg: 'Connection not authenticating'
  }
]
```

## Respuestas

**1. ¿Puedes demostrar qué cambió? ¿Y quién se conectó a esa hora?**
**No hay evidencia con esta edición de qué operación se hizo.** No hay evidencia en los registros de qué operación se ejecutó ni de qué dato cambió. Con el perfilador apagado (was: 0), db.system.profile.countDocuments() devuelve 0 y la búsqueda del nuevo valor "GAMA780912XXX" en bitacora() también da 0 resultados. Aunque en la colección clientes se pueda consultar el documento _id: 3 y ver el RFC actual (GAMA780912XXX), eso solo muestra el estado final sin dejar rastro del valor anterior, el autor ni la hora exacta de modificación.

**2. ¿Por qué mongosh abre varias conexiones para una sola instrucción? ¿Cuál se autentica?**
En la salida de la bitácora aparecen cinco conexiones (conn17 a conn21):

No se autentican (Connection not authenticating): conn17 (02:51:50.393 UTC) y conn21 (02:52:00.898 UTC), que únicamente envían client metadata.

Sí se autentican (Successfully authenticated): conn18 (02:51:50.404 UTC), conn19 (02:51:50.420 UTC) y conn20 (02:51:50.420 UTC).

## Conclusión
Con el perfilador apagado y sin auditoría nativa, MongoDB solo deja rastro de conexiones, no de operaciones.
