# Evidencia 10 — Respuesta a Dirección

**Estudiante:** Jesus Ruben Monzon Garcia | **Materia:** Gestión de Seguridad y Desempeño de Bases de Datos | **Servidor:** MongoDB 7.0.34 Community | **Fecha de ejecución:** 2026-11-23

Respuestas solo con la evidencia de este laboratorio.

**1. ¿Quién cambió el RFC de María García en la Actividad 2? ¿Y en la Actividad 3?**
- **Actividad 2: no hay evidencia con esta edición.** El perfilador estaba apagado (`was: 0`), `system.profile` tenía 0 documentos y la bitácora no registra operaciones. Solo consta que una aplicación con `appName` `app-ventas-web` se conectó y se autenticó a las 02:22:31 UTC; eso no demuestra que esa conexión hizo el cambio ni descarta otras.
- **Actividad 3:** `app_ventas@comercial`, según `system.profile` (operación `update`).

**2. ¿Cuándo y desde qué aplicación?**
- **Actividad 2: no hay evidencia con esta edición** de la hora del cambio, solo de las conexiones (02:22:31 UTC).
- **Actividad 3:** 2026-11-24 02:22:35.286 UTC, aplicación `app-ventas-web`, cliente `127.0.0.1`.

**3. ¿Qué valor tenía antes?**
**No hay evidencia con esta edición**, en ninguna de las dos actividades. `system.profile` guarda el comando con el valor nuevo (`GAMA780912XYZ`), y la bitácora no guarda valores. (El valor original `GAMA780912GHI` lo conozco solo porque lo insertamos en el script de la sección 6.3; no sale de ninguna traza de auditoría.)

**4. ¿Cambió alguien los privilegios de `app_ventas`?**
**Sí se detectó el cambio, pero no se puede atribuir.** Las instantáneas de privilegios muestran que se agregó el rol `dbAdmin` sobre `comercial` entre las 02:22:45.742Z y las 02:22:50.141Z. **Quién lo hizo y a qué hora exacta: no hay evidencia con esta edición**: ni `system.profile` (nivel 2) ni la bitácora registraron el `grantRolesToUser`, y la instantánea solo dice quién la tomó.

**Resumen para Dirección:** con MongoDB Community podemos saber *qué* pasó en algunos casos (y *quién*, si el perfilador estaba activo), pero no el valor anterior ni quién cambió privilegios. Para cerrar esa brecha habría que usar auditoría nativa (Enterprise o Atlas) o aceptar el riesgo con controles compensatorios.