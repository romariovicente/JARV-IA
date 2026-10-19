import { useEffect, useRef, useState } from 'react';
import { createWorldClockClient, resolveClockURL } from '../shared/world-clock-client.js';

export function useWorldClock() {
  const client = useRef(null);
  if (!client.current) client.current = createWorldClockClient({
    endpoint: resolveClockURL(window.location.href, import.meta.env.VITE_WORLD_CLOCK_URL),
  });
  const [clock, setClock] = useState(() => client.current.sample());
  useEffect(() => {
    const current = client.current;
    const update = () => setClock(current.sample());
    const unsubscribe = current.subscribe(update);
    current.start(); update();
    const interval = window.setInterval(update, 250);
    return () => { window.clearInterval(interval); unsubscribe(); current.stop(); };
  }, []);
  return { clock, clockClient: client.current };
}
