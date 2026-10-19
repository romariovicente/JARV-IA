import config from '../functions/world-clock-config.json' with { type: 'json' };

export const WORLD_CLOCK_CONFIG = config;
const TAU = Math.PI * 2;
const formatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: config.timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

export function validTimestamp(value) {
  return Number.isFinite(value) && Math.abs(value) <= 8.64e15;
}

export function validClockPacket(packet) {
  if (packet?.ok !== true || packet.schemaVersion !== config.schemaVersion ||
      packet.configVersion !== config.configVersion || packet.timeZone !== config.timeZone ||
      !validTimestamp(packet.serverTimeMs) || typeof packet.source !== 'string' ||
      !packet.source.trim() || packet.source.length > 120) return false;
  // A different sky configuration must be reviewed and deployed together. Do
  // not silently claim parity while accepting a different epoch or orbit rate.
  return ['epochMs', 'orbitPeriodSeconds', 'dayPeriodSeconds', 'orbitRadius'].every(
    key => packet.clock?.[key] === config.clock[key],
  ) && Array.isArray(packet.clock?.sunCenter) && packet.clock.sunCenter.length === 3 &&
    packet.clock.sunCenter.every((value, axis) => value === config.clock.sunCenter[axis]);
}

export function createClockAnchor(serverTimeMs, startedAt, receivedAt) {
  if (!validTimestamp(serverTimeMs) || ![startedAt, receivedAt].every(Number.isFinite) || receivedAt < startedAt) return null;
  return { wallMs: serverTimeMs + (receivedAt - startedAt) / 2, monotonicMs: receivedAt };
}

export function readClockAnchor(anchor, monotonicNow) {
  return anchor.wallMs + Math.max(0, monotonicNow - anchor.monotonicMs);
}

export function sampleWorldClock(nowMs, clock = config.clock) {
  if (!validTimestamp(nowMs)) throw new TypeError('Timestamp inválido.');
  const elapsedSeconds = (nowMs - clock.epochMs) / 1000;
  const earthAngle = ((elapsedSeconds / clock.orbitPeriodSeconds * TAU) % TAU + TAU) % TAU;
  const parts = Object.fromEntries(formatter.formatToParts(nowMs).map(part => [part.type, part.value]));
  const hour = Number(parts.hour), night = hour < 6 || hour >= 18;
  return {
    nowMs, elapsedSeconds, earthAngle, night,
    text: `${parts.hour}:${parts.minute}`, timeText: `${parts.hour}:${parts.minute}:${parts.second}`,
    dateText: `${parts.day}/${parts.month}/${parts.year}`,
    phase: night ? 'Noite' : hour < 12 ? 'Manhã' : 'Tarde',
    earthPosition: [clock.sunCenter[0] + Math.cos(earthAngle) * clock.orbitRadius,
      clock.sunCenter[1], clock.sunCenter[2] + Math.sin(earthAngle) * clock.orbitRadius],
    presentation: config.solar.presentation,
  };
}

export function orbitOffset(planet, angle, radius = config.clock.orbitRadius * planet.orbitRatio) {
  const inclination = planet.inclinationDeg * Math.PI / 180, node = planet.nodeDeg * Math.PI / 180;
  const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
  const y = -z * Math.sin(inclination), inclinedZ = z * Math.cos(inclination);
  return [x * Math.cos(node) + inclinedZ * Math.sin(node), y,
    -x * Math.sin(node) + inclinedZ * Math.cos(node)];
}

export function samplePlanet(planet, nowMs, clock = config.clock) {
  const sample = sampleWorldClock(nowMs, clock);
  const angle = planet.id === 'earth' ? sample.earthAngle :
    sample.elapsedSeconds / clock.orbitPeriodSeconds / planet.periodEarthYears * TAU + planet.phaseDeg * Math.PI / 180;
  const offset = orbitOffset(planet, angle, clock.orbitRadius * planet.orbitRatio);
  return { id: planet.id, angle, offset, position: offset.map((value, axis) => value + clock.sunCenter[axis]),
    spin: sample.elapsedSeconds / clock.dayPeriodSeconds * TAU * planet.spinRatio };
}
