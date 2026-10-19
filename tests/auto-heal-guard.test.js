import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

test('Auto-Heal refuses to run without its environment secret and has no embedded fallback key', () => {
  const source = readFileSync('scripts/jarv-heal.js', 'utf8');
  assert.doesNotMatch(source, /\bgsk_[A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(source, /FALLBACK_GROQ_KEY/);
  const result = spawnSync(process.execPath, ['scripts/jarv-heal.js'], {
    env: { ...process.env, GROQ_API_KEY: '' }, encoding: 'utf8', windowsHide: true, timeout: 2000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Nenhuma chave GROQ_API_KEY/);
  assert.doesNotMatch(result.stdout, /Transmitindo|Analisando/);
});
