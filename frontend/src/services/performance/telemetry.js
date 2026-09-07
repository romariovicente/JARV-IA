export function getBrowserTelemetry() {

  return {
    userAgent: navigator.userAgent,
    memory: performance.memory
      ? performance.memory.usedJSHeapSize
      : null,
    online: navigator.onLine,
    hardwareConcurrency:
      navigator.hardwareConcurrency || null
  };
}
