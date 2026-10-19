import { useEffect, useRef } from 'react';
import { WORLD_CLOCK_CONFIG } from '../shared/world-clock.js';
import { createSolarProjection, sampleSolarProjection, seededStars } from '../shared/solar-projection.js';
import { createPlanetTexture, paintSolarProjection } from './solarPainter.js';

export default function SolarProjection({ clockClient, viewMode }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current, context = canvas?.getContext('2d');
    if (!context) return undefined;
    const stars = seededStars();
    const textures = new Map(WORLD_CLOCK_CONFIG.solar.planets.map(planet => [planet.id, createPlanetTexture(planet)]));
    const sphereCanvas = document.createElement('canvas');
    const sphereContext = sphereCanvas.getContext('2d');
    let frameId = 0, projection = null, previousFrameAt = -Infinity, visible = !document.hidden;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const resize = () => {
      const width = Math.max(1, canvas.clientWidth), height = Math.max(65, canvas.clientHeight);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      projection = createSolarProjection(width, height, viewMode);
    };
    const render = (frameAt = 0) => {
      if (visible && projection && frameAt - previousFrameAt >= (reducedMotion.matches ? 1000 : 1000 / 30)) {
        const clock = clockClient.sample();
        paintSolarProjection(context, projection, sampleSolarProjection(projection, clock.nowMs), stars, textures, sphereCanvas, sphereContext);
        canvas.dataset.earthAngle = String(clock.earthAngle);
        canvas.dataset.clockSource = clock.source;
        previousFrameAt = frameAt;
      }
      frameId = window.requestAnimationFrame(render);
    };
    const visibilityChanged = () => { visible = !document.hidden; previousFrameAt = -Infinity; };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas); resize(); render();
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => {
      window.cancelAnimationFrame(frameId); observer.disconnect();
      document.removeEventListener('visibilitychange', visibilityChanged);
    };
  }, [clockClient, viewMode]);
  return <canvas ref={canvasRef} role="img"
    aria-label="Projeção didática heliocêntrica: Sol no centro, oito planetas em órbita e Terra identificada como Arapiraca. Mesmo modelo e fase temporal do PREPARATÓRIO."
    style={{ width: '100%', height: '100%', display: 'block' }}>
    Seu navegador não disponibilizou o desenho do sistema solar.
  </canvas>;
}
