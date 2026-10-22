import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'node_modules', '@phosphor-icons', 'core', 'assets');
const jsDir = path.join(root, 'assets', 'js');
const sources = ['index.html', ...fs.readdirSync(jsDir).filter((f) => f.endsWith('.js')).map((f) => path.join('assets', 'js', f))];
const patterns = [
  /#i-([a-z0-9-]+)/g,
  /\bic\(\s*'([a-z0-9-]+)'/g,
  /\bic:\s*'([a-z0-9-]+)'/g,
  /\bicon:\s*'([a-z0-9-]+)'/g,
  /\b(?:sectionTitle|metric)\(\s*'([a-z0-9-]+)'/g,
  /data-ic(?:-on)?="([a-z0-9-]+)"/g
];

const names = new Set();
for (const file of sources) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  for (const re of patterns) {
    for (const m of text.matchAll(re)) names.add(m[1]);
  }
}

const missing = [];
const symbols = [...names].sort().map((name) => {
  const weight = name.endsWith('-fill') ? 'fill' : name.endsWith('-bold') ? 'bold' : 'regular';
  const file = path.join(assets, weight, `${name}.svg`);
  if (!fs.existsSync(file)) {
    missing.push(name);
    return '';
  }
  const inner = fs.readFileSync(file, 'utf8').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return `<symbol id="i-${name}" viewBox="0 0 256 256">${inner}</symbol>`;
});

if (missing.length) {
  console.error('Ikon tidak ditemukan: ' + missing.join(', '));
  process.exit(1);
}

const indexPath = path.join(root, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');
const sprite = `<svg id="icon-sprite" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">${symbols.join('')}</svg>`;
const re = /<svg id="icon-sprite"[\s\S]*?<\/svg>/;
if (!re.test(html)) {
  console.error('Penanda <svg id="icon-sprite"> tidak ada di index.html');
  process.exit(1);
}
fs.writeFileSync(indexPath, html.replace(re, sprite));
console.log(`Sprite berisi ${symbols.length} ikon.`);
