const fs = require('node:fs');
const assert = require('node:assert/strict');
const html = fs.readFileSync('dist/index.html', 'utf8');
assert(!html.includes('/src/main.jsx'), 'Build contém entrada JSX sem compilação.');
const match = html.match(/src="(\.\/assets\/[^"\s]+\.js)"/);
assert(match, 'Entrada JavaScript relativa não encontrada; base do Pages precisa ser ./');
assert(fs.existsSync(`dist/${match[1].slice(2)}`), 'Bundle referenciado não existe.');
assert(fs.statSync(`dist/${match[1].slice(2)}`).size > 1000);
console.log('Build de produção validado com assets relativos e bundle JavaScript existente.');
