// Monta a pasta _site com só os arquivos que o app usa em produção.
// Usado antes de cada deploy (npm run deploy) para não publicar testes, docs ou .git.
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const DESTINO = path.join(RAIZ, '_site');
const ARQUIVOS = ['index.html', 'style.css', 'app.js', 'logica.js', 'OVINHO_bg.png'];

fs.rmSync(DESTINO, { recursive: true, force: true });
fs.mkdirSync(DESTINO, { recursive: true });

for (const nome of ARQUIVOS) {
  const origem = path.join(RAIZ, nome);
  if (!fs.existsSync(origem)) {
    console.error(`Arquivo ausente: ${nome}`);
    process.exit(1);
  }
  fs.copyFileSync(origem, path.join(DESTINO, nome));
}

console.log(`Pasta _site pronta com ${ARQUIVOS.length} arquivos.`);
