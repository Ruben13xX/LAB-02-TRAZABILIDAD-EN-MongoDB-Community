# Informe — LAB-02: Trazabilidad en MongoDB Community

**Estudiante:** Jesus Ruben Monzon Garcia | **Servidor:** MongoDB 7.0.34 Community | **Fecha:** 2026-11-24

## 1. Despliegue, edición y limitación
Usé un servidor MongoDB Community 7.0.34 con `security.authorization: enabled`. La **auditoría nativa no existe en Community**: está en Enterprise y en Atlas (M10 o superior) (REF-U3-04). Lo verifiqué de dos formas: `buildInfo.modules` devuelve `[]` (en Enterprise incluiría `"enterprise"`) y `mongod` rechaza `--auditDestination` con `unrecognised option`. Lo que sí hay en Community es el **perfilador** y la **bitácora** de `mongod`. (Evidencia 01.)

## 2. Perfilador
- **Configuración:** `db.setProfilingLevel(2)` en `comercial` (todas las operaciones) y luego nivel 1 con filtro `{ op: { $in: ["insert","update","remove"] } }`.
- **Interpretación:** cada documento de `system.profile` da `op`, `ns`, `command`, usuario (`app_ventas@comercial`), cliente (`127.0.0.1`), aplicación (`app-ventas-web`) y momento (`ts`). No guarda el valor anterior ni el contenido eliminado. (Evidencias 03 y 04.)
- **Costo:** el nivel 2 puede degradar el rendimiento y ocupar espacio (REF-U3-05), y guarda filtros y valores con datos personales (como el RFC nuevo). El filtro reduce volumen y riesgo, pero pierde las lecturas. Con perfilador apagado no hay rastro de las operaciones (Evidencia 02).

## 3. Bitácora de mongod
- **Dónde se escribe:** en la salida estándar (no hay `systemLog` en la configuración). Se consulta con `getLog`, que da solo los 1024 eventos más recientes en memoria.
- **Accesos:** `Failed to authenticate` (`id 5286307`, `result` 18 por contraseña incorrecta y 11 por usuario inexistente) y `Successfully authenticated` (`id 5286306`, `result` 0) con usuario, cliente y aplicación. El cliente recibe el mismo mensaje en ambos fallos para no revelar qué usuarios existen. (Evidencia 05.)
- **Cambios de configuración:** `Profiler settings changed` no incluye usuario; se atribuyó al `admin` correlacionando `ctx` (`conn42`) con su evento de autenticación, válido solo dentro de la misma ejecución del servidor. (Evidencia 06.)

## 4. Privilegios
No hay evidencia del `grantRolesToUser` ni en `system.profile` (nivel 2) ni en la bitácora (0 y 0). El **control compensatorio** (instantáneas de privilegios en `auditoria.instantaneas_privilegios`) permitió **detectar** que se agregó `dbAdmin` a `app_ventas` entre dos instantáneas, pero **no** quién lo hizo ni cuándo exactamente. **No equivale a auditoría**: detecta, no atribuye. (Evidencia 07.)

## 5. Conservación
Riesgos observados: `system.profile` es una colección limitada de 1 MB que sobrescribe lo antiguo; al reiniciar, el nivel del perfilador vuelve a 0 y `getLog` pasó de 503 a 60 eventos. Exporté `system.profile` y la bitácora **antes** de reiniciar, y calculé su SHA-256 (verificado). Con la configuración persistente (`systemLog.destination: file`, `operationProfiling.mode: all`) el perfilado y la bitácora sobreviven al reinicio, a costa de rendimiento y espacio. (Evidencia 08.)

## 6. Comparación
Resumen de la Evidencia 09: Community registra accesos (exitosos y fallidos) y, con el perfilador activo, modificaciones y lecturas; solo registra cambios de estructura con nivel 2; no registra cambios de privilegios ni valores anteriores. Enterprise/Atlas lo documenta como categorías de autenticación, autorización, DDL y CRUD (documentado, no practicado). La columna de PostgreSQL debe confirmarse con el LAB-01.

## 7. Recomendación
Para una organización que necesite **auditar cambios de privilegios** en MongoDB, recomendaría **auditoría nativa (MongoDB Enterprise o Atlas M10 o superior)**, porque en Community esos cambios no dejan rastro y no se puede atribuirlos a nadie. Si no es posible, mantener el control compensatorio, pero declarándolo como riesgo aceptado: limitar quién tiene privilegios de administración, tomar instantáneas con frecuencia desde una cuenta separada y enviarlas con la bitácora a un almacenamiento externo, y exigir un registro de cambios aprobado.

| Hechos verificados en esta práctica | Supuestos (no verificados) |
|---|---|
| Community 7.0.34 no tiene `--auditDestination` ni módulo enterprise | Que Enterprise/Atlas registre exactamente el evento de `grantRolesToUser` (está documentado por categorías; no lo practiqué) |
| `grantRolesToUser` no aparece en perfilador (nivel 2) ni en bitácora | Costo de licencia o de Atlas M10 y su viabilidad para la organización |
| Las instantáneas detectan el cambio, no autor ni hora exacta | Que enviar instantáneas y bitácoras a un almacén externo sea suficiente para cumplir un requisito de auditoría |
| La evidencia del perfilador y de `getLog` es volátil | Frecuencia de instantáneas adecuada (depende del riesgo de cada organización) |

---

## Preguntas de reflexión

**1. ¿Por qué el perfilador no debe presentarse como auditoría de seguridad?** Porque se diseñó para analizar desempeño (REF-U3-05), no para seguridad: está apagado por defecto, no registró el cambio de privilegios, no guarda valores anteriores, su colección limitada de 1 MB se sobrescribe sola, el nivel se pierde al reiniciar y quien tiene privilegios puede apagarlo o filtrarlo. Presentarlo como auditoría haría que el laboratorio no se apruebe y daría una falsa sensación de control.

**2. ¿Por qué sí aporta trazabilidad?** Porque con el perfilador activo registra operación, usuario, cliente, aplicación y momento de consultas, actualizaciones y eliminaciones (Actividad 3), lo que permite reconstruir quién hizo qué y cuándo para esas operaciones.

**3. ¿Qué riesgo introduce el nivel 2 al registrar filtros con datos personales?** Que `system.profile` guarda los comandos completos con sus valores (por ejemplo, el RFC `GAMA780912XYZ` o la ciudad buscada), así que los datos personales se duplican en otra colección que además se exporta como evidencia. Eso amplía quién puede ver datos personales, rompe el principio de minimización y complica la retención y eliminación. Para reducirlo: nivel 1 con filtro, acceso restringido a `system.profile`, y revisar los archivos exportados.

**4. ¿Diferencia entre detectar un cambio y atribuirlo?** Detectar es saber que algo cambió (las instantáneas mostraron que se agregó `dbAdmin`). Atribuir es saber quién lo hizo y cuándo, y requiere un evento que registre la identidad autenticada (como el `update` del perfilador con `app_ventas@comercial`, o la correlación de `ctx` con `admin`). Para privilegios en Community solo se logra lo primero.

**5. ¿Por qué reconocer una limitación técnica es parte del trabajo profesional del DBA?** Porque Dirección y auditoría toman decisiones con lo que el DBA les informa. Afirmar que hay trazabilidad donde no la hay da una falsa seguridad; documentar la limitación ("No hay evidencia con esta edición") permite decidir entre pagar auditoría nativa, aplicar controles compensatorios o aceptar el riesgo de forma consciente, y se registrará como riesgo en el LAB-03.
