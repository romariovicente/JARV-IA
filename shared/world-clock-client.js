import { WORLD_CLOCK_CONFIG, createClockAnchor, readClockAnchor, sampleWorldClock, validClockPacket } from './world-clock.js';

export function resolveClockURL(baseHref, configuredURL) {
  // Pages is static hosting. Without an explicitly deployed endpoint, use the
  // device clock and never label a failed static /api path as a server clock.
  if (typeof configuredURL !== 'string' || !configuredURL.trim()) return null;
  try {
    const base = new URL(baseHref), url = new URL(configuredURL, base);
    if (!['http:', 'https:'].includes(url.protocol) || (base.protocol === 'https:' && url.protocol !== 'https:') || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

export function createWorldClockClient({
  endpoint = null, fetchImpl = globalThis.fetch?.bind(globalThis),
  wallNow = Date.now, monotonicNow = () => performance.now(), timeoutMs = 6000,
} = {}) {
  let anchor = { wallMs: wallNow(), monotonicMs: monotonicNow() };
  let status = endpoint ? 'connecting' : 'device', source = 'device-clock';
  let synchronized = false, active = false, controller = null, interval = null, generation = 0;
  const listeners = new Set();
  const notify = () => listeners.forEach(listener => listener());
  function sample() {
    const nowMs = readClockAnchor(anchor, monotonicNow());
    return { ...sampleWorldClock(nowMs), status, source, configVersion: WORLD_CLOCK_CONFIG.configVersion };
  }
  async function synchronize() {
    if (!active || !endpoint || !fetchImpl || controller) return;
    const request = new AbortController(), requestGeneration = generation; controller = request;
    const startedAt = monotonicNow();
    const timeout = setTimeout(() => request.abort(), timeoutMs);
    try {
      const response = await fetchImpl(endpoint, { cache: 'no-store', signal: request.signal });
      if (!response.ok) throw new Error('Relógio remoto indisponível.');
      const packet = await response.json(), receivedAt = monotonicNow();
      if (!validClockPacket(packet)) throw new Error('Contrato do relógio incompatível.');
      const next = createClockAnchor(packet.serverTimeMs, startedAt, receivedAt);
      if (!next) throw new Error('Âncora do relógio inválida.');
      if (active && generation === requestGeneration && !request.signal.aborted) {
        anchor = next; synchronized = true; status = 'synced'; source = packet.source; notify();
      }
    } catch {
      if (active && generation === requestGeneration) { status = synchronized ? 'stale' : 'unavailable'; notify(); }
    } finally {
      clearTimeout(timeout);
      if (controller === request) controller = null;
    }
  }
  return {
    sample, synchronize,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    start() {
      if (active) return;
      active = true; generation += 1;
      if (endpoint) { synchronize(); interval = setInterval(synchronize, 30000); }
    },
    stop() { active = false; generation += 1; clearInterval(interval); interval = null; controller?.abort(); controller = null; },
  };
}

export function clockSourceLabel(sample) {
  if (sample.status === 'synced') return `Relógio sincronizado · ${sample.source}`;
  if (sample.status === 'stale') return `Última sincronização · ${sample.source}`;
  if (sample.status === 'connecting') return 'Conectando relógio · horário deste dispositivo';
  return 'Horário deste dispositivo · Brasília';
}
