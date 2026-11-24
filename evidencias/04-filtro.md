# Evidencia 04 — Reducir el volumen con un filtro

**Estudiante:** Jesus Ruben Monzon Garcia| **Materia:** Gestión de Seguridad y Desempeño de Bases de Datos | **Servidor:** MongoDB 7.0.34 Community | **Fecha de ejecución:** 2026-11-23

## Objetivo
Conservar en `system.profile` solo las operaciones de modificación (insert, update y remove).

## Procedimiento
Se apaga el perfilador, se borra `system.profile` (antes exporté lo de la Actividad 3), y se activa el nivel 1 con filtro. La aplicación ejecuta una consulta y una actualización.

## Resultado
```text
(sesión del DBA) mongosh "mongodb://admin:<REDACTED>@127.0.0.1:27017/comercial?authSource=admin" --quiet --file js/a4.js
> db.setProfilingLevel(0)
{ was: 2, slowms: 100, sampleRate: 1, ok: 1 }
> db.system.profile.drop()
true
> db.setProfilingLevel(1, { filter: { op: { $in: ["insert", "update", "remove"] } } })
{
  was: 0,
  slowms: 100,
  sampleRate: 1,
  note: 'When a filter expression is set, slowms and sampleRate are not used for profiling and slow-query log lines.',
  ok: 1
}
> db.getProfilingStatus()
{
  was: 1,
  slowms: 100,
  sampleRate: 1,
  filter: { op: { '$in': [ 'insert', 'remove', 'update' ] } },
  note: 'When a filter expression is set, slowms and sampleRate are not used for profiling and slow-query log lines.',
  ok: 1
}
$ mongosh "mongodb://app_ventas:<REDACTED>@127.0.0.1:27017/comercial?appName=app-ventas-web" --quiet --eval 'db.clientes.find({ _id: 1 }).toArray(); db.clientes.updateOne({ _id: 1 }, { $set: { telefono: "6670000000" } })'
{
  acknowledged: true,
  insertedId: null,
  matchedCount: 1,
  modifiedCount: 1,
  upsertedCount: 0
}
(sesión del DBA) mongosh "mongodb://admin:<REDACTED>@127.0.0.1:27017/comercial?authSource=admin" --quiet --file js/a4q.js
> db.system.profile.find({}, { op: 1, ns: 1, user: 1, appName: 1, "command.q": 1, "command.u": 1, ts: 1 })
[
  {
    op: 'update',
    ns: 'comercial.clientes',
    command: { q: { _id: 1 }, u: { '$set': { telefono: '6670000000' } } },
    ts: 2026-11-24T02:22:39.536Z,
    appName: 'app-ventas-web',
    user: 'app_ventas@comercial'
  }
]
```

Solo apareció la operación `update`; la consulta (`find`) no quedó registrada.

## Respuestas

**1. ¿Qué perdiste de evidencia al aplicar el filtro? ¿Qué ganaste?**
- Perdí: el registro de las lecturas (los `find`), o sea quién consultó qué. Tampoco quedan los comandos (`op: command`).
- Gané: menos volumen y menos costo de desempeño, y menos datos personales duplicados en `system.profile`. Como la colección es limitada (1 MB), con menos ruido las modificaciones tardan más en sobrescribirse.

**2. ¿Qué filtro usaría para operaciones solo sobre `clientes`?** Un filtro por `ns`. Lo probé:
```javascript
db.setProfilingLevel(1, { filter: { ns: "comercial.clientes", op: { $in: ["insert", "update", "remove"] } } })
```
Con ese filtro, un `insertOne` en otra colección (`comercial.otra`) no se registró y un `updateOne` en `clientes` sí:
```text
> db.system.profile.drop()
true
> db.setProfilingLevel(1, { filter: { ns: "comercial.clientes", op: { $in: ["insert", "update", "remove"] } } })
{
  was: 0,
  slowms: 100,
  sampleRate: 1,
  note: 'When a filter expression is set, slowms and sampleRate are not used for profiling and slow-query log lines.',
  ok: 1
}
> db.otra.insertOne({ x: 1 }).acknowledged
true
> db.clientes.updateOne({ _id: 5 }, { $set: { ciudad: "Culiacán" } }).matchedCount
1
> db.system.profile.find({}, { op: 1, ns: 1, ts: 1 }).sort({ ts: 1 })
[ { op: 'update', ns: 'comercial.clientes', ts: 2026-11-24T02:25:10.883Z } ]
> db.setProfilingLevel(0)
{
  was: 1,
  slowms: 100,
  sampleRate: 1,
  filter: {
    '$and': [
      { ns: { '$eq': 'comercial.clientes' } },
      { op: { '$in': [ 'insert', 'remove', 'update' ] } }
    ]
  },
  note: 'When a filter expression is set, slowms and sampleRate are not used for profiling and slow-query log lines.',
  ok: 1
}
```
