// Apaga photos baixadas onde o yelp_match nao tem overlap de tokens com o nome da loja.
// Roda depois de fetch-shop-photos.js pra remover matches errados (vizinhos sem perfil Yelp).

const fs = require('fs');
const path = require('path');

const PHOTO_DIR = path.join(__dirname, '..', 'photos', 'lojas');
const RESULTS = JSON.parse(fs.readFileSync(path.join(__dirname, 'fetch-results.json'), 'utf8'));

function normalize(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3)
    .filter(t => !['the', 'new', 'york', 'nyc', 'soho', 'nolita', 'midtown', 'madison', 'avenue', 'street', 'flatiron', 'downtown', 'uptown', 'williamsburg', 'brooklyn', 'shop', 'store', 'bookstore', 'books', 'company', 'mansion', 'landmark', 'maison', 'and'].includes(t));
}
function tokenOverlap(yelpName, shopName) {
  const a = new Set(normalize(yelpName));
  const b = normalize(shopName);
  return b.some(t => a.has(t));
}

let deleted = 0, kept = 0;
for (const r of RESULTS) {
  if (r.status !== 'downloaded' && r.status !== 'cached') continue;
  const filePath = path.join(PHOTO_DIR, `${r.slug}.jpg`);
  if (!fs.existsSync(filePath)) continue;

  const match = r.yelp_match || r.name;
  const isMatch = tokenOverlap(match, r.name);
  if (!isMatch) {
    fs.unlinkSync(filePath);
    deleted++;
    console.log(`✗ DELETED ${r.slug}.jpg (Yelp matched "${match}", not "${r.name}")`);
  } else {
    kept++;
  }
}
console.log(`\nKept: ${kept} | Deleted: ${deleted}`);
