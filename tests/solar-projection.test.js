import test from 'node:test';
import assert from 'node:assert/strict';
import { createSolarProjection, sampleSolarProjection, SOLAR_VIEWS, seededStars } from '../shared/solar-projection.js';
import { WORLD_CLOCK_CONFIG as config } from '../shared/world-clock.js';
import { createPlanetTexture, paintSolarProjection } from '../src/solarPainter.js';

test('three cameras change presentation without changing shared planetary world positions', () => {
  const nowMs = config.clock.epochMs + 30000;
  const frames = SOLAR_VIEWS.map(view => sampleSolarProjection(createSolarProjection(640, 330, view), nowMs));
  for (const id of config.solar.planets.map(planet => planet.id)) {
    const first = frames[0].find(body => body.id === id);
    for (const frame of frames) {
      const body = frame.find(item => item.id === id);
      assert.deepEqual(body.position, first.position);
      assert.ok(Number.isFinite(body.screen.x) && Number.isFinite(body.screen.y) && body.radius > 0);
      assert.ok(body.screen.x > 0 && body.screen.x < 640 && body.screen.y > 30 && body.screen.y < 300);
    }
  }
  assert.notDeepEqual(frames[0].find(body => body.id === 'earth').screen, frames[1].find(body => body.id === 'earth').screen);
});

test('planet positions are independent of render count and frame rate', () => {
  const projection = createSolarProjection(640, 330);
  const first = sampleSolarProjection(projection, config.clock.epochMs + 45000);
  for (let frame = 0; frame < 144; frame++) sampleSolarProjection(projection, config.clock.epochMs + frame * 16);
  assert.deepEqual(sampleSolarProjection(projection, config.clock.epochMs + 45000), first);
  const earth = first.find(body => body.id === 'earth');
  assert.ok(Math.abs(earth.angle - Math.PI * .75) < 1e-10);
});

test('orbit paths close, contain eight planets, seeded stars stay fixed and invalid dimensions are refused', () => {
  const projection = createSolarProjection(640, 330);
  assert.equal(projection.orbits.length, 8);
  for (const orbit of projection.orbits) {
    assert.equal(orbit.points.length, 193);
    const first = orbit.points[0], last = orbit.points.at(-1);
    assert.ok(Math.hypot(first.x - last.x, first.y - last.y) < 1e-10);
  }
  assert.deepEqual(seededStars(), seededStars());
  assert.equal(seededStars().length, 1800);
  for (const star of seededStars()) assert.ok(star.x >= 0 && star.x <= 1 && star.y >= 0 && star.y <= 1);
  assert.throws(() => createSolarProjection(0, 330), TypeError);
  assert.throws(() => createSolarProjection(640, 30), TypeError);
});

test('sphere painter produces eight textured spheres and a Sun without requiring network images', () => {
  const drawCalls = [], labels = [], pixels = [];
  const context = {
    clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, arc() {}, ellipse() {}, fill() {},
    createRadialGradient() { return { addColorStop() {} }; },
    drawImage(...args) { drawCalls.push(args); }, fillText(label) { labels.push(label); },
  };
  const surfaceContext = { createImageData(width, height) { return { data: new Uint8ClampedArray(width * height * 4) }; }, putImageData(image) { pixels.push(image.data); } };
  const textures = new Map(config.solar.planets.map(planet => [planet.id, createPlanetTexture(planet)]));
  const projection = createSolarProjection(640, 330);
  paintSolarProjection(context, projection, sampleSolarProjection(projection, config.clock.epochMs + 30000), seededStars(), textures, {}, surfaceContext);
  assert.equal(drawCalls.length, 8); assert.equal(pixels.length, 8);
  assert.ok(pixels.every(data => data.some(value => value > 0)));
  assert.ok(labels.includes('SOL')); assert.ok(labels.includes('Terra · Arapiraca'));
  assert.equal(labels.length, 9);
});
