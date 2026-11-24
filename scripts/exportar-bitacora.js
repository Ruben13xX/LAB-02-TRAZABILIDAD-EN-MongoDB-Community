// Exporta los eventos que guarda getLog (los 1024 más recientes).
console.log(db.adminCommand({ getLog: "global" }).log.join("\n"));
