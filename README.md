# LAB-02 — Trazabilidad en MongoDB Community

**Estudiante:** Jesus Ruben Monzon Garcia | **Servidor:** MongoDB 7.0.34 Community | **Fecha:** 2026-11-24
**Materia:** Gestión de Seguridad y Desempeño de Bases de Datos — Unidad III (temas 3.1 y 3.2)

## Cómo desplegué el servidor (Anexo A)
- **Despliegue:** contenedor Docker ejecutado en Docker Desktop sobre Windows.
- **Configuración:** archivo `mongod.conf` con `security.authorization: enabled`, `net.bindIp: 127.0.0.1`, puerto 27017 y `storage.dbPath` en una carpeta de prueba. Sin sección `systemLog`: la bitácora sale por la **salida estándar** del proceso.
- **Reinicio:** detener el proceso `mongod` y volver a iniciarlo con el mismo archivo.
- **Diferencias con la guía:** la guía se ejecutó con 7.0.43 y mongosh 2.10.0, y con `bindIp: '*'`. Yo usé 7.0.34, mongosh 2.14.3 y `127.0.0.1`. Fechas, números de conexión (`connNN`) y puertos de cliente son distintos.
- **Contraseñas:** son las de práctica del lab y aparecen como `<REDACTED>` en las evidencias.

## Estructura
| Ruta | Contenido |
|---|---|
| `evidencias/01` a `10-*.md` | Evidencia de cada actividad, con salidas y respuestas |
| `evidencias/system-profile.json` | Export de `system.profile` (Actividad 8) |
| `evidencias/bitacora-mongod.log` | Export de `getLog` (Actividad 8) |
| `evidencias/bitacora-mongod-stdout-completa.log` | Salida estándar completa de `mongod` (la historia completa) |
| `evidencias/hashes.sha256` | SHA-256 de los tres archivos anteriores |
| `evidencias/system-profile-actividad3.json` | Extra: `system.profile` de la Actividad 3 antes de borrarlo en la Actividad 4 |
| `scripts/comandos-mongosh.js` | Comandos de mongosh usados, en orden |
| `scripts/exportar-*.js` | Scripts de exportación de la Actividad 8 |
| `informe.md` | Informe final y preguntas de reflexión |