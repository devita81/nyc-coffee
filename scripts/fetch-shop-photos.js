// Fetcha foto storefront/interior de cada loja via Yelp Fusion API.
// Setup: YELP_API_KEY=xxx node scripts/fetch-shop-photos.js
// Roda 1x — baixa imagens pra photos/lojas/{slug}.jpg. Depois eu commito no repo.

const fs = require('fs');
const https = require('https');
const path = require('path');

const API_KEY = process.env.YELP_API_KEY;
if (!API_KEY) {
  console.error('\n❌ Falta YELP_API_KEY. Crie em https://www.yelp.com/developers/v3/manage_app');
  console.error('Depois rode: YELP_API_KEY=sua-chave node scripts/fetch-shop-photos.js\n');
  process.exit(1);
}

// Lista de lojas — extraída do curatedPlaces (manter sincronizado)
const SHOPS = [
  { name: "Apple Fifth Avenue", coords: [40.7637, -73.9728] },
  { name: "Apple SoHo", coords: [40.7245, -73.9981] },
  { name: "Tiffany & Co Landmark", coords: [40.7625, -73.9740] },
  { name: "Bergdorf Goodman", coords: [40.7639, -73.9738] },
  { name: "Saks Fifth Avenue", coords: [40.7585, -73.9776] },
  { name: "Bloomingdale's 59th", coords: [40.7617, -73.9670] },
  { name: "Macy's Herald Square", coords: [40.7506, -73.9888] },
  { name: "Cartier Mansion", coords: [40.7591, -73.9743] },
  { name: "Louis Vuitton Maison NY", coords: [40.7619, -73.9719] },
  { name: "Hermès Madison", coords: [40.7676, -73.9698] },
  { name: "Bottega Veneta Madison", coords: [40.7697, -73.9659] },
  { name: "Goyard", coords: [40.7659, -73.9698] },
  { name: "Loro Piana", coords: [40.7714, -73.9637] },
  { name: "Brunello Cucinelli", coords: [40.7672, -73.9709] },
  { name: "Bonpoint Madison", coords: [40.7790, -73.9601] },
  { name: "Dover Street Market NY", coords: [40.7445, -73.9810] },
  { name: "Kith SoHo", coords: [40.7244, -73.9952] },
  { name: "Supreme NY", coords: [40.7222, -73.9930] },
  { name: "Glossier SoHo", coords: [40.7257, -73.9988] },
  { name: "Aesop Howard", coords: [40.7195, -74.0007] },
  { name: "Aesop Madison", coords: [40.7794, -73.9613] },
  { name: "Aesop Williamsburg", coords: [40.7185, -73.9572] },
  { name: "Le Labo Nolita", coords: [40.7233, -73.9942] },
  { name: "Le Labo Williamsburg", coords: [40.7184, -73.9574] },
  { name: "Diptyque West Village", coords: [40.7355, -74.0050] },
  { name: "Byredo SoHo", coords: [40.7227, -74.0024] },
  { name: "Acne Studios SoHo", coords: [40.7196, -74.0017] },
  { name: "Comme des Garçons", coords: [40.7474, -74.0046] },
  { name: "Reformation SoHo", coords: [40.7203, -74.0019] },
  { name: "The Apartment by The Line", coords: [40.7224, -74.0029] },
  { name: "Coming Soon", coords: [40.7167, -73.9905] },
  { name: "Strand Bookstore", coords: [40.7333, -73.9907] },
  { name: "McNally Jackson SoHo", coords: [40.7237, -73.9952] },
  { name: "McNally Jackson Williamsburg", coords: [40.7141, -73.9627] },
  { name: "Rizzoli Bookstore", coords: [40.7446, -73.9897] },
  { name: "Albertine Books", coords: [40.7747, -73.9636] },
  { name: "Books are Magic", coords: [40.6845, -73.9974] },
  { name: "Three Lives & Company", coords: [40.7335, -74.0023] },
  { name: "Idlewild Books", coords: [40.7387, -73.9985] },
  { name: "Goods for the Study", coords: [40.7325, -73.9985] },
  { name: "Printed Matter", coords: [40.7510, -74.0058] },
  { name: "192 Books", coords: [40.7459, -74.0048] },
  { name: "Greenlight Bookstore", coords: [40.6868, -73.9740] },
  { name: "Powerhouse Arena", coords: [40.7030, -73.9893] },
  { name: "ABC Carpet & Home", coords: [40.7375, -73.9905] },
  { name: "John Derian Company", coords: [40.7250, -73.9912] },
  { name: "Roman and Williams Guild", coords: [40.7199, -74.0008] },
  { name: "MoMA Design Store SoHo", coords: [40.7234, -73.9974] },
  { name: "MoMA Design Store 53rd", coords: [40.7615, -73.9776] },
  { name: "Fishs Eddy", coords: [40.7376, -73.9893] },
  { name: "John Robshaw Textiles", coords: [40.7493, -73.9942] },
  { name: "Atelier Courbet", coords: [40.7224, -73.9947] },
  { name: "Catbird", coords: [40.7167, -73.9612] },
  { name: "FAO Schwarz", coords: [40.7585, -73.9787] },
  { name: "Lego Store Fifth Avenue", coords: [40.7588, -73.9779] },
  { name: "Nintendo NY", coords: [40.7588, -73.9787] },
  { name: "Mast Brothers Chocolate", coords: [40.7173, -73.9583] },
  { name: "C.O. Bigelow Apothecary", coords: [40.7344, -73.9991] },
  { name: "Casey Rubber Stamps", coords: [40.7308, -73.9849] },
  { name: "Wing on Wo", coords: [40.7152, -73.9974] },
  { name: "Toy Tokyo", coords: [40.7261, -73.9883] },
  { name: "M&M's World", coords: [40.7589, -73.9851] },
  { name: "Rough Trade NY", coords: [40.7589, -73.9787] },
  { name: "The Met Store", coords: [40.7794, -73.9633] },
  { name: "Eataly Flatiron", coords: [40.7421, -73.9893] },
  { name: "Eataly Downtown", coords: [40.7113, -74.0123] },
  { name: "Murray's Cheese Shop", coords: [40.7314, -74.0034] }
];

const PHOTO_DIR = path.join(__dirname, '..', 'photos', 'lojas');
fs.mkdirSync(PHOTO_DIR, { recursive: true });

function slugify(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function fetchJSON(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function downloadBinary(url, outPath, depth = 0) {
  if (depth > 5) return Promise.reject(new Error('Too many redirects'));
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBinary(res.headers.location, outPath, depth + 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const file = fs.createWriteStream(outPath);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
      file.on('error', reject);
    }).on('error', reject);
  });
}

async function fetchOne(shop) {
  const slug = slugify(shop.name);
  const outPath = path.join(PHOTO_DIR, `${slug}.jpg`);
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
    return { name: shop.name, slug, status: 'cached' };
  }

  // Yelp business search por nome + coords (raio 200m)
  const url = `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(shop.name)}&latitude=${shop.coords[0]}&longitude=${shop.coords[1]}&radius=200&limit=3&sort_by=distance`;
  let result;
  try {
    result = await fetchJSON(url, { Authorization: `Bearer ${API_KEY}` });
  } catch (e) {
    return { name: shop.name, slug, status: 'api_error', error: e.message };
  }

  if (!result.businesses || !result.businesses.length) {
    return { name: shop.name, slug, status: 'not_found' };
  }

  // Pega o primeiro que tenha image_url
  const biz = result.businesses.find(b => b.image_url) || result.businesses[0];
  if (!biz.image_url) {
    return { name: shop.name, slug, status: 'no_image', yelp_match: biz.name };
  }

  try {
    // Yelp serve imagens em /o.jpg (640px). Pra alta res: troca /o.jpg por /xl.jpg ou /1000s.jpg
    const hiresUrl = biz.image_url.replace(/\/o\.jpg/, '/l.jpg');
    await downloadBinary(hiresUrl, outPath);
    return { name: shop.name, slug, status: 'downloaded', yelp_match: biz.name };
  } catch (e) {
    return { name: shop.name, slug, status: 'download_error', error: e.message };
  }
}

(async () => {
  console.log(`\n📸 Fetching photos for ${SHOPS.length} lojas via Yelp Fusion...\n`);
  const results = [];
  for (let i = 0; i < SHOPS.length; i++) {
    const shop = SHOPS[i];
    const r = await fetchOne(shop);
    results.push(r);
    const icon = r.status === 'downloaded' ? '✓' : r.status === 'cached' ? '·' : '✗';
    const match = r.yelp_match && r.yelp_match !== shop.name ? ` (matched: ${r.yelp_match})` : '';
    console.log(`${icon} [${i+1}/${SHOPS.length}] ${shop.name} → ${r.status}${match}`);
    await new Promise(r => setTimeout(r, 150)); // gentle rate limit
  }

  fs.writeFileSync(
    path.join(__dirname, 'fetch-results.json'),
    JSON.stringify(results, null, 2)
  );
  const ok = results.filter(r => r.status === 'downloaded' || r.status === 'cached').length;
  console.log(`\n✅ ${ok}/${SHOPS.length} fotos baixadas em photos/lojas/`);
  console.log('Results: scripts/fetch-results.json\n');
})();
