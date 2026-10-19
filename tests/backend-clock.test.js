import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { validClockPacket } from '../shared/world-clock.js';

test('Express exposes a real no-store world clock without any chat/LLM request', { timeout: 10000 }, async () => {
  const child = spawn(process.execPath, ['backend/server.js'], {
    env: { ...process.env, PORT: '0' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    const port = await new Promise((resolve, reject) => {
      let output = '';
      child.once('error', reject);
      child.once('exit', code => reject(Error(`Servidor encerrou antes de iniciar: ${code}`)));
      child.stdout.on('data', data => {
        output += data;
        const match = output.match(/porta (\d+)/);
        if (match) resolve(Number(match[1]));
      });
    });
    const response = await fetch(`http://127.0.0.1:${port}/api/world-clock`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store, max-age=0');
    const body = await response.json();
    assert.equal(validClockPacket(body), true);
    assert.ok(Math.abs(body.serverTimeMs - Date.now()) < 1000);
  } finally {
    child.kill();
  }
});
