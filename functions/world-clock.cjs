const config = require('./world-clock-config.json');

function createWorldClockResponse(nowMs = Date.now()) {
  if (!Number.isFinite(nowMs) || Math.abs(nowMs) > 8.64e15) throw new TypeError('Timestamp inválido.');
  return { ok: true, schemaVersion: config.schemaVersion, service: 'JARV-IA',
    source: 'JARV-IA-host-clock', serverTimeMs: nowMs, timeZone: config.timeZone,
    configVersion: config.configVersion, clock: config.clock, solar: config.solar,
    presentation: 'educational-projection-not-astronomical-ephemeris' };
}

function handleWorldClockRequest(req, res) {
  res.set('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET') return res.status(405).set('Allow', 'GET').json({ ok: false, error: 'Método não permitido.' });
  return res.json(createWorldClockResponse());
}

module.exports = { createWorldClockResponse, handleWorldClockRequest };
