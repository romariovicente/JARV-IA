import { WORLD_CLOCK_CONFIG, orbitOffset, samplePlanet } from './world-clock.js';

const TAU = Math.PI * 2;
export const SOLAR_VIEWS = ['ORBITAL', 'VISTA SUPERIOR', 'VISTA LATERAL'];
const radians = degrees => degrees * Math.PI / 180;

// The model coordinates are shared with PREPARATÓRIO. Only the camera and
// screen scale differ: the Sun stays at the origin of the projected system.
export function projectSolarPoint(point, width, height, view = 'ORBITAL') {
  const [x, y, z] = point;
  const yaw = radians(view === 'VISTA SUPERIOR' ? 0 : -25);
  const pitch = radians(view === 'VISTA SUPERIOR' ? 90 : view === 'VISTA LATERAL' ? 12 : 48);
  const rotatedX = x * Math.cos(yaw) + z * Math.sin(yaw);
  const rotatedZ = -x * Math.sin(yaw) + z * Math.cos(yaw);
  const vertical = y * Math.cos(pitch) - rotatedZ * Math.sin(pitch);
  const depth = y * Math.sin(pitch) + rotatedZ * Math.cos(pitch);
  const extent = WORLD_CLOCK_CONFIG.clock.orbitRadius * 3.25;
  const scale = Math.min(width / 2, (height - 64) / 2) / extent;
  return { x: width / 2 + rotatedX * scale, y: height / 2 + vertical * scale, depth, scale };
}

export function createSolarProjection(width, height, view = 'ORBITAL') {
  if (!(width > 0 && height > 64) || !SOLAR_VIEWS.includes(view)) throw new TypeError('Projeção solar inválida.');
  const { solar } = WORLD_CLOCK_CONFIG;
  const project = point => projectSolarPoint(point, width, height, view);
  return {
    width, height, view, sun: project([0, 0, 0]),
    orbits: solar.planets.map(planet => ({
      id: planet.id, color: planet.orbitColor,
      points: Array.from({ length: 193 }, (_, index) => project(orbitOffset(planet, index / 192 * TAU))),
    })),
  };
}

export function sampleSolarProjection(projection, nowMs) {
  return WORLD_CLOCK_CONFIG.solar.planets.map(planet => {
    const sample = samplePlanet(planet, nowMs);
    const screen = projectSolarPoint(sample.offset, projection.width, projection.height, projection.view);
    return { ...sample, screen, planet, radius: Math.max(2.4, planet.radius * screen.scale * 1.6) };
  }).sort((first, second) => first.screen.depth - second.screen.depth);
}

export function seededStars(count = WORLD_CLOCK_CONFIG.solar.starCount) {
  let seed = WORLD_CLOCK_CONFIG.solar.starSeed >>> 0;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  return Array.from({ length: count }, () => ({ x: random(), y: random(), opacity: .2 + random() * .7, size: random() > .96 ? 1.5 : .6 }));
}
