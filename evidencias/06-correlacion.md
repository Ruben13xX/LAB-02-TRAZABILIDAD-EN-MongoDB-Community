# Evidencia 06 — Correlacionar un cambio de configuración con su autor

**Estudiante:** Jesus Ruben Monzon Garcia | **Materia:** Gestión de Seguridad y Desempeño de Bases de Datos | **Servidor:** MongoDB 7.0.34 Community | **Fecha de ejecución:** 2026-11-23

## Objetivo
Identificar quién cambió la configuración del perfilador usando el contexto de conexión (`ctx`).

## Procedimiento
Busco los eventos `Profiler settings changed`, tomo el `ctx` del último y busco la autenticación de esa misma conexión.

## Resultado
```text
(sesión del DBA) mongosh "mongodb://admin:<REDACTED>@127.0.0.1:27017/comercial?authSource=admin" --quiet --file js/a6.js
> bitacora().filter(e => e.msg === "Profiler settings changed").map(e => ({ t: e.t, ctx: e.ctx, msg: e.msg, attr: e.attr }))
[
  {
    t: { '$date': '2026-11-24T02:22:34.212+00:00' },
    ctx: 'conn24',
    msg: 'Profiler settings changed',
    attr: {
      from: { level: 0, slowms: 100, sampleRate: 1 },
      to: { level: 2, slowms: 100, sampleRate: 1 },
      db: 'comercial'
    }
  },
  {
    t: { '$date': '2026-11-24T02:22:38.520+00:00' },
    ctx: 'conn40',
    msg: 'Profiler settings changed',
    attr: {
      from: { level: 2, slowms: 100, sampleRate: 1 },
      to: { level: 0, slowms: 100, sampleRate: 1 },
      db: 'comercial'
    }
  },
  {
    t: { '$date': '2026-11-24T02:22:38.544+00:00' },
    ctx: 'conn42',
    msg: 'Profiler settings changed',
    attr: {
      from: { level: 0, slowms: 100, sampleRate: 1 },
      to: {
        level: 1,
        slowms: 100,
        sampleRate: 1,
        filter: { op: { '$in': [ 'insert', 'remove', 'update' ] } }
      },
      db: 'comercial'
    }
  }
]
ctx del último cambio de configuración del perfilador: conn42
> bitacora().filter(e => e.ctx === ctxCambio && e.msg === "Successfully authenticated").map(e => ({ t: e.t, ctx: e.ctx, user: e.attr.user, db: e.attr.db, client: e.attr.client }))
[
  {
    t: { '$date': '2026-11-24T02:22:38.523+00:00' },
    ctx: 'conn42',
    user: 'admin',
    db: 'admin',
    client: '127.0.0.1:44632'
  }
]
```

## Respuestas

**1. ¿Qué usuario cambió la configuración? ¿Qué dos eventos lo demuestran?** El usuario **admin** (base `admin`). Lo demuestran: (1) `Profiler settings changed` en `conn42` a las 02:22:38.544 (nivel 0 a 1 con filtro en `comercial`) y (2) `Successfully authenticated` en la misma `conn42`, usuario `admin`, a las 02:22:38.523.

**2. ¿Qué condición debe cumplirse?** Que ambos eventos pertenezcan a la **misma ejecución del servidor**. Los números de conexión (`conn42`) se reinician al arrancar `mongod`, así que después de un reinicio el mismo `ctx` puede ser otra conexión y otro usuario. También hace falta que el evento de autenticación siga disponible (getLog solo guarda los 1024 eventos más recientes) y que la conexión se haya autenticado antes del cambio.

**3. ¿Por qué importa registrar el cambio del propio mecanismo de registro?** Porque apagar o filtrar el perfilador es la forma de dejar de registrar actividad. Aquí la bitácora conservó la secuencia: nivel 0 a 2 (`conn24`), 2 a 0 (`conn40`) y 0 a 1 con filtro (`conn42`). Si no quedara registro, alguien podría desactivar la trazabilidad sin que se note.

## Conclusión
La línea del cambio no incluye el usuario; se atribuye correlacionando el `ctx` con el evento de autenticación, y solo es válido dentro de la misma ejecución del servidor.
