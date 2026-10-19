import { WORLD_CLOCK_CONFIG } from '../shared/world-clock.js';

const TAU = Math.PI * 2;
const color = hex => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
const mix = (first, second, amount) => first.map((value, axis) => Math.round(value + (second[axis] - value) * amount));
function inside(x, y, polygon) {
  let found = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) found = !found;
  }
  return found;
}

export function createPlanetTexture(planet) {
  const width = 128, height = 64, data = new Uint8ClampedArray(width * height * 3);
  const first = color(planet.colors[0]), second = color(planet.colors[1]);
  const { solar } = WORLD_CLOCK_CONFIG;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const longitude = x / (width - 1) * 360 - 180, latitude = y / (height - 1) * 180 - 90;
    const wave = .5 + .5 * Math.sin(longitude * .113 + Math.sin(latitude * .19) * 2.3) * Math.cos(latitude * .177 - longitude * .057);
    let rgb = mix(first, second, planet.surface === 'bands' ? .5 + .45 * Math.sin(latitude * .71) : .15 + wave * .65);
    if (planet.surface === 'earth') {
      if (solar.continents.some(polygon => inside(longitude, latitude, polygon))) rgb = mix(color(solar.earthLandColor), color(solar.earthDesertColor), wave * .45);
      if (Math.abs(latitude) > 76) rgb = mix(rgb, [232, 242, 240], Math.min(1, (Math.abs(latitude) - 76) / 8));
      if (wave > .83) rgb = mix(rgb, [246, 248, 247], .5);
    }
    data.set(rgb, (y * width + x) * 3);
  }
  return { width, height, data };
}

function drawSphere(ctx, body, texture, projection, surface, surfaceContext) {
  const { x, y } = body.screen, radius = body.radius, pixels = Math.max(12, Math.ceil(radius * 4));
  surface.width = pixels; surface.height = pixels;
  const image = surfaceContext.createImageData(pixels, pixels);
  const lightX = projection.sun.x - x, lightY = projection.sun.y - y;
  const lightLength = Math.hypot(lightX, lightY) || 1;
  const spin = ((body.spin % TAU) + TAU) % TAU;
  for (let py = 0; py < pixels; py++) for (let px = 0; px < pixels; px++) {
    const nx = (px + .5) / pixels * 2 - 1, ny = (py + .5) / pixels * 2 - 1;
    const radial = nx * nx + ny * ny;
    if (radial > 1) continue;
    const nz = Math.sqrt(1 - radial);
    const longitude = ((Math.atan2(nx, nz) + spin + Math.PI) / TAU % 1 + 1) % 1;
    const latitude = (Math.asin(-ny) / Math.PI + .5);
    const textureIndex = (Math.min(texture.height - 1, Math.floor(latitude * texture.height)) * texture.width + Math.floor(longitude * texture.width)) * 3;
    const light = .18 + .82 * Math.max(0, nx * lightX / lightLength * .75 + ny * lightY / lightLength * .75 + nz * .65);
    const index = (py * pixels + px) * 4;
    image.data.set([...texture.data.slice(textureIndex, textureIndex + 3)].map(value => Math.min(255, value * light)), index);
    image.data[index + 3] = Math.min(255, (1 - radial) * pixels * 255);
  }
  surfaceContext.putImageData(image, 0, 0);
  ctx.drawImage(surface, x - radius, y - radius, radius * 2, radius * 2);
  if (body.id === 'earth') {
    ctx.strokeStyle = '#8ad7ff'; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.arc(x, y, radius + 1.2, 0, TAU); ctx.stroke();
  }
  if (body.planet.rings) {
    ctx.strokeStyle = '#d6c098aa'; ctx.lineWidth = Math.max(1, radius * .2);
    ctx.beginPath(); ctx.ellipse(x, y, radius * 2, radius * .5, -.35, 0, TAU); ctx.stroke();
  }
  ctx.font = body.id === 'earth' ? 'bold 10px monospace' : '9px monospace';
  ctx.textAlign = 'center'; ctx.fillStyle = body.id === 'earth' ? '#c6edff' : '#d4dce9';
  const label = body.id === 'earth' ? 'Terra · Arapiraca' : body.planet.label;
  ctx.fillText(label, x, y + radius + 14);
}

export function paintSolarProjection(ctx, projection, bodies, stars, textures, surface, surfaceContext) {
  const { width, height, sun, orbits } = projection;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#01040c'; ctx.fillRect(0, 0, width, height);
  for (const star of stars) {
    ctx.fillStyle = `rgba(210,229,255,${star.opacity})`;
    ctx.fillRect(star.x * width, star.y * height, star.size, star.size);
  }
  for (const orbit of orbits) {
    ctx.beginPath(); orbit.points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.strokeStyle = orbit.color; ctx.globalAlpha = orbit.id === 'earth' ? .8 : .4;
    ctx.lineWidth = orbit.id === 'earth' ? 1.1 : .6; ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const drawSun = () => {
    const radius = WORLD_CLOCK_CONFIG.solar.sunRadius * sun.scale;
    const glow = ctx.createRadialGradient(sun.x, sun.y, 1, sun.x, sun.y, radius * 5);
    glow.addColorStop(0, '#fff9dc'); glow.addColorStop(.18, '#ffe7ac');
    glow.addColorStop(.23, '#ffb146bd'); glow.addColorStop(1, '#ffac3b00');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sun.x, sun.y, radius * 5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff2ce'; ctx.beginPath(); ctx.arc(sun.x, sun.y, radius, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffe1a1'; ctx.textAlign = 'center'; ctx.font = 'bold 10px monospace'; ctx.fillText('SOL', sun.x, sun.y + radius + 13);
  };
  // Correct depth ordering lets planets pass in front of or behind the Sun.
  bodies.filter(body => body.screen.depth < 0).forEach(body => drawSphere(ctx, body, textures.get(body.id), projection, surface, surfaceContext));
  drawSun();
  bodies.filter(body => body.screen.depth >= 0).forEach(body => drawSphere(ctx, body, textures.get(body.id), projection, surface, surfaceContext));
}
