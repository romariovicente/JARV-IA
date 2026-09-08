const fs = require('fs');
const path = require('path');

function logIncident(issueText) {
  const logDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

  const date = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const incidentData = `
🚨 JARV INCIDENT
----------------------------------------
Sistema: JARV I.A.
Problema: ${issueText}
Detectado: ${date}
Status: OPEN
Agentes: MONITOR -> DIAGNOSTIC
----------------------------------------
\n`;

  fs.appendFileSync(path.join(logDir, 'incidents.log'), incidentData);
  console.log("⚠️ Incidente salvo em logs/incidents.log");
}

module.exports = logIncident;
