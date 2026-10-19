import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_CLOCK_CONFIG as config, sampleWorldClock, samplePlanet, validClockPacket, createClockAnchor, readClockAnchor } from '../shared/world-clock.js';
import { createWorldClockClient, clockSourceLabel, resolveClockURL } from '../shared/world-clock-client.js';
import worldClock from '../functions/world-clock.cjs';

const { createWorldClockResponse, handleWorldClockRequest } = worldClock;
const flush = () => new Promise(resolve => setImmediate(resolve));
const packet = () => createWorldClockResponse(config.clock.epochMs + 30000);
const response = value => ({ ok: true, json: async () => value });
function initialSync(client) {
  return new Promise(resolve => {
    const unsubscribe = client.subscribe(() => { unsubscribe(); resolve(client.sample()); });
    client.start();
  });
}

test('BRT date/phase is independent of host timezone and orbit is tied to UTC epoch', () => {
  const night = sampleWorldClock(Date.parse('2026-10-19T02:59:59Z'));
  assert.equal(night.dateText, '18/10/2026'); assert.equal(night.timeText, '23:59:59'); assert.equal(night.phase, 'Noite');
  const midnight = sampleWorldClock(Date.parse('2026-10-19T03:00:00Z'));
  assert.equal(midnight.dateText, '19/10/2026'); assert.equal(midnight.timeText, '00:00:00');
  assert.equal(sampleWorldClock(Date.parse('2026-10-19T09:00:00Z')).phase, 'Manhã');
  assert.equal(sampleWorldClock(Date.parse('2026-10-19T15:00:00Z')).phase, 'Tarde');
  assert.equal(sampleWorldClock(Date.parse('2026-10-19T21:00:00Z')).phase, 'Noite');
  for (const invalid of [NaN, Infinity, '2026-10-19', 8.64e15 + 1]) assert.throws(() => sampleWorldClock(invalid), TypeError);
});

test('PREPARATÓRIO epoch, radius, eight planets and Earth phase produce the same world coordinates', () => {
  assert.equal(config.configVersion, 'PREP_SOLAR_SKY_20261005');
  assert.deepEqual(config.clock, { epochMs: 1791201600000, orbitPeriodSeconds: 120, dayPeriodSeconds: 240, orbitRadius: 14, sunCenter: [0, 55, 0], blenderFps: 60, blenderStartFrame: 1 });
  assert.deepEqual(config.solar.planets.map(planet => planet.id), ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']);
  const earth = config.solar.planets.find(planet => planet.id === 'earth');
  const epoch = config.clock.epochMs;
  for (const offset of [-30000, 0, 30000, 60000, 120000, 36500000000]) {
    const clock = sampleWorldClock(epoch + offset), body = samplePlanet(earth, epoch + offset);
    assert.equal(body.angle, clock.earthAngle);
    body.position.forEach((value, axis) => assert.ok(Math.abs(value - clock.earthPosition[axis]) < 1e-10));
  }
  assert.ok(Math.abs(sampleWorldClock(epoch + 30000).earthAngle - Math.PI / 2) < 1e-10);
  assert.ok(Math.abs(sampleWorldClock(epoch + 120000).earthAngle) < 1e-10);
  for (const planet of config.solar.planets) {
    const body = samplePlanet(planet, epoch + 123456);
    assert.ok(Math.abs(Math.hypot(...body.offset) - config.clock.orbitRadius * planet.orbitRatio) < 1e-10);
  }
});

test('remote clock contract refuses incompatible schema, timezone and sky speed', () => {
  assert.equal(validClockPacket(packet()), true);
  for (const property of ['epochMs', 'orbitPeriodSeconds', 'dayPeriodSeconds', 'orbitRadius']) {
    const altered = structuredClone(packet()); altered.clock[property] += 1;
    assert.equal(validClockPacket(altered), false, property);
  }
  for (const altered of [{ ...packet(), ok: false }, { ...packet(), ok: 'yes' }, { ...packet(), schemaVersion: 2 },
    { ...packet(), serverTimeMs: NaN }, { ...packet(), source: '' }, { ...packet(), source: 'x'.repeat(121) },
    { ...packet(), configVersion: 'old' }, { ...packet(), timeZone: 'UTC' },
    { ...packet(), clock: { ...packet().clock, sunCenter: [0, 0, 0] } }]) assert.equal(validClockPacket(altered), false);
});

test('anchor uses midpoint latency and monotonic elapsed time', () => {
  const anchor = createClockAnchor(100000, 100, 140);
  assert.deepEqual(anchor, { wallMs: 100020, monotonicMs: 140 });
  assert.equal(readClockAnchor(anchor, 1140), 101020);
  assert.equal(readClockAnchor(anchor, 0), 100020);
  assert.equal(createClockAnchor(100000, 140, 100), null);
});

test('Pages without a deployed endpoint stays in device mode and never fetches a static /api', () => {
  assert.equal(resolveClockURL('https://romariovicente.github.io/JARV-IA/', ''), null);
  assert.equal(resolveClockURL('https://romariovicente.github.io/JARV-IA/', 'https://clock.example/api'), 'https://clock.example/api');
  for (const url of ['http://clock.example', 'javascript:alert(1)', 'https://user:password@clock.example', 'https://[']) {
    assert.equal(resolveClockURL('https://romariovicente.github.io/JARV-IA/', url), null);
  }
  let monotonic = 0;
  const client = createWorldClockClient({ wallNow: () => config.clock.epochMs, monotonicNow: () => monotonic, fetchImpl: () => assert.fail('No endpoint configured') });
  client.start(); monotonic = 1000;
  assert.equal(client.sample().nowMs, config.clock.epochMs + 1000);
  assert.equal(client.sample().status, 'device');
  assert.match(clockSourceLabel(client.sample()), /dispositivo/); client.stop();
});

test('successful sync advances smoothly, then marks stale on network failure without dropping its anchor', async () => {
  let failing = false, monotonic = 100;
  const client = createWorldClockClient({ endpoint: 'https://clock.example', wallNow: () => config.clock.epochMs,
    monotonicNow: () => monotonic, fetchImpl: async () => { if (failing) throw Error('offline'); monotonic = 140; return response(packet()); } });
  try {
    const first = await initialSync(client);
    assert.equal(first.status, 'synced'); assert.equal(first.nowMs, packet().serverTimeMs + 20);
    assert.match(clockSourceLabel(first), /JARV-IA-host-clock/);
    monotonic += 1000; failing = true; await client.synchronize();
    assert.equal(client.sample().status, 'stale'); assert.equal(client.sample().nowMs, first.nowMs + 1000);
  } finally { client.stop(); }
});

test('incompatible packets never receive a synchronized label', async () => {
  const client = createWorldClockClient({ endpoint: 'https://clock.example', fetchImpl: async () => response({ ...packet(), configVersion: 'legacy' }) });
  try {
    const result = await initialSync(client);
    assert.equal(result.status, 'unavailable'); assert.equal(result.source, 'device-clock');
    assert.match(clockSourceLabel(result), /dispositivo/);
  } finally { client.stop(); }
});

test('cancelled StrictMode request cannot overwrite the restarted client', async () => {
  const queue = [];
  const client = createWorldClockClient({ endpoint: 'https://clock.example', fetchImpl: () => new Promise(resolve => queue.push(resolve)) });
  try {
    client.start(); client.stop(); client.start();
    queue[1](response(packet())); await flush();
    assert.equal(client.sample().status, 'synced');
    queue[0](response({ ...packet(), configVersion: 'old' })); await flush();
    assert.equal(client.sample().status, 'synced');
  } finally { client.stop(); }
});

test('clock HTTP handler returns no-store timestamp/config and refuses mutations', () => {
  let result, status = 200; const headers = {};
  const res = { set(name, value) { headers[name] = value; return this; }, status(value) { status = value; return this; }, json(value) { result = value; return this; } };
  handleWorldClockRequest({ method: 'GET' }, res);
  assert.equal(status, 200); assert.equal(validClockPacket(result), true);
  assert.equal(headers['Cache-Control'], 'no-store, max-age=0');
  handleWorldClockRequest({ method: 'POST' }, res);
  assert.equal(status, 405); assert.equal(result.ok, false); assert.equal(headers.Allow, 'GET');
});
