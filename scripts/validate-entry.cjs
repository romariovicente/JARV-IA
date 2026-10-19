const fs = require('node:fs');
const assert = require('node:assert/strict');
for (const name of ['index.html', 'src/main.jsx', 'src/App.jsx', 'src/SolarProjection.jsx',
  'src/useWorldClock.js', 'shared/world-clock.js', 'functions/world-clock-config.json']) {
  assert(fs.existsSync(name), `Entrada de produção ausente: ${name}`);
}
assert(fs.readFileSync('index.html', 'utf8').includes('/src/main.jsx'));
assert(fs.readFileSync('src/main.jsx', 'utf8').includes('./App.jsx'));
assert(fs.readFileSync('src/App.jsx', 'utf8').includes('SolarProjection'));
assert.equal(JSON.parse(fs.readFileSync('firebase.json', 'utf8')).hosting.public, 'dist');
console.log('Entrada de produção validada: raiz index.html → src/main.jsx → src/App.jsx.');
