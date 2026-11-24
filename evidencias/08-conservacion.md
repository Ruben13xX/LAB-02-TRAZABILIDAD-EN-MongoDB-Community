# Evidencia 08 — Conservación: exportar antes de perder

**Estudiante:** Jesus Ruben Monzon Garcia | **Materia:** Gestión de Seguridad y Desempeño de Bases de Datos | **Servidor:** MongoDB 7.0.34 Community | **Fecha de ejecución:** 2026-11-23

## Objetivo
Exportar `system.profile` y la bitácora con su hash antes de reiniciar, y observar qué se pierde al reiniciar.

## Procedimiento
1. **Exporté antes de reiniciar:** `system-profile.json`, `bitacora-mongod.log` (con `getLog`) y, como el servidor escribe en salida estándar y yo la redirigí a un archivo, también `bitacora-mongod-stdout-completa.log` (historia completa del proceso).
2. Calculé SHA-256 (`hashes.sha256`) y verifiqué.
3. Reinicié el servidor (sin configuración persistente) y consulté el estado.

## Resultado

Verificación de hashes (`sha256sum -c hashes.sha256`):
```text
system-profile.json: OK
bitacora-mongod.log: OK
bitacora-mongod-stdout-completa.log: OK
```

Contenido de `hashes.sha256`:
```text
34c42ee2bf41fdf186577c192a6ddd2dc8c8f63af7261bee8b9a787d185fb8d5  system-profile.json
c32e22442b82ac30bf8db726014bd87a2a3b0af761f9f8e36c64665628d28776  bitacora-mongod.log
46afd387f1d51d4c0d79e30e3ab555e80d19bc03729e1fd1a696044813dee8c0  bitacora-mongod-stdout-completa.log
```

Después del reinicio sin configuración persistente:
```text
(sesión del DBA) mongosh "mongodb://admin:<REDACTED>@127.0.0.1:27017/comercial?authSource=admin" --quiet --file js/a8post.js
> db.getProfilingStatus()
{ was: 0, slowms: 100, sampleRate: 1, ok: 1 }
> db.system.profile.countDocuments()
2
> bitacora().length
60
```

Extra, con configuración persistente (`systemLog.destination: file`, `logAppend: true`, `operationProfiling.mode: all`):
```text
(sesión del DBA) mongosh "mongodb://admin:<REDACTED>@127.0.0.1:27017/comercial?authSource=admin" --quiet --file js/a8persist.js
> db.getProfilingStatus()
{ was: 2, slowms: 100, sampleRate: 1, ok: 1 }
> db.serverCmdLineOpts().parsed
{
  config: '/tmp/lab/mongod-persistente.conf',
  net: { bindIp: '127.0.0.1', port: 27017 },
  operationProfiling: { mode: 'all' },
  security: { authorization: 'enabled' },
  storage: { dbPath: '/tmp/lab/db' },
  systemLog: { destination: 'file', logAppend: true, path: '/tmp/lab/mongod-persistente.log' }
}
--- archivo de bitácora persistente ---
-rw------- 1 root root 21632 Nov 24 02:23 /tmp/lab/mongod-persistente.log
{"t":{"$date":"2026-11-24T02:23:02.738+00:00"},"s":"I",  "c":"NETWORK",  "id":4915701, "ctx":"main","msg":"Initialized wire specification","attr":{"spec":{"incomingExternalClient":{"minWireVersion":0,"maxWireVersion":21},"incomingInternalClient":{"minWireVersion":0,"maxWireVersion":21},"outgoing":{"minWireVersion":6,"maxWireVersion":21},"isInternalClient":true}}}
{"t":{"$date":"2026-11-24T02:23:02.738+00:00"},"s":"I",  "c":"CONTROL",  "id":23285,   "ctx":"main","msg":"Automatically disabling TLS 1.0, to force-enable TLS 1.0 specify --sslDisabledProtocols 'none'"}
{"t":{"$date":"2026-11-24T02:2
```

Archivo de configuración persistente que se utilizo
```yaml
security:
  authorization: enabled
systemLog:
  destination: file
  path: /tmp/lab/mongod-persistente.log
  logAppend: true
operationProfiling:
  mode: all
```

## Respuestas

**1. Tres formas de perder evidencia sin que nadie la borre deliberadamente.**
- `system.profile` es una colección limitada (1 MB): al llenarse se sobrescriben los documentos más antiguos.
- Reinicio del servidor: el nivel del perfilador activado con `setProfilingLevel` vuelve a 0 y la memoria de `getLog` se vacía (lo medí: 503 a 60 eventos).
- Que la bitácora esté solo en la salida estándar de un contenedor o proceso: si se elimina el contenedor o rota o se llena el disco, se pierde. (También el límite de 1024 eventos de `getLog`.)

**2. ¿Por qué 1 MB es un problema de conservación y no solo de espacio?** Porque es una ventana de tiempo que no controlo: en un sistema ocupado (más con nivel 2) 1 MB puede cubrir solo minutos, y la evidencia de un incidente anterior se sobrescribe sin aviso. No puedo garantizar un periodo de retención.

**3. ¿Por qué `getLog` sirve para interpretar pero no para conservar?** Devuelve solo los 1024 eventos más recientes que el servidor mantiene en memoria; se vacía al reiniciar y no tiene la historia completa ni protección de integridad. Sirve para consultar, pero para conservar hay que exportar y guardar el archivo de bitácora con su hash.

## Conclusión
La evidencia del perfilador y de `getLog` es volátil; hay que exportarla y calcularle hash a tiempo, y configurar el archivo de bitácora para que sobreviva a los reinicios.
