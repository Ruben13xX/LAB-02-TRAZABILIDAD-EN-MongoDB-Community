// Exporta system.profile en JSON (Actividad 8). Ejecutar con la sesión del DBA en la base comercial.
console.log(EJSON.stringify(db.system.profile.find({}, { op: 1, ns: 1, user: 1, client: 1, appName: 1, ts: 1, "command.q": 1, "command.u": 1 }).toArray(), null, 2));
