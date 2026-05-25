// Segunda tentativa pras 26 lojas que falharam no fetch-shop-photos.js
// Usa radius maior + Yelp categories filter + sort by best_match

const fs = require('fs');
const https = require('https');
const path = require('path');

const API_KEY = process.env.YELP_API_KEY;
if (!API_KEY) { console.error('Set YELP_API_KEY'); process.exit(1); }

// 26 lojas que ficaram sem foto (deletadas ou no_image)
const MISSING = [
  { name: "Tiffany & Co Landmark", coords: [40.7625, -73.9740], categories: "jewelry" },
  { name: "Bloomingdale's 59th", coords: [40.7617, -73.9670], categories: "departmentstores" },
  { name: "Macy's Herald Square", coords: [40.7506, -73.9888], categories: "departmentstores" },
  { name: "Louis Vuitton Maison NY", coords: [40.7619, -73.9719], categories: "leather,fashion" },
  { name: "Loro Piana", coords: [40.7714, -73.9637], categories: "fashion" },
  { name: "Bonpoint Madison", coords: [40.7790, -73.9601], categories: "childcloth" },
  { name: "Dover Street Market NY", coords: [40.7445, -73.9810], categories: "fashion" },
  { name: "Kith SoHo", coords: [40.7244, -73.9952], categories: "fashion,shoes" },
  { name: "Supreme NY", coords: [40.7222, -73.9930], categories: "fashion" },
  { name: "Glossier SoHo", coords: [40.7257, -73.9988], categories: "cosmetics" },
  { name: "Aesop Howard", coords: [40.7195, -74.0007], categories: "cosmetics" },
  { name: "Aesop Williamsburg", coords: [40.7185, -73.9572], categories: "cosmetics" },
  { name: "Diptyque West Village", coords: [40.7355, -74.0050], categories: "cosmetics,perfume" },
  { name: "Reformation SoHo", coords: [40.7203, -74.0019], categories: "fashion" },
  { name: "The Apartment by The Line", coords: [40.7224, -74.0029], categories: "fashion,homeandgarden" },
  { name: "McNally Jackson Williamsburg", coords: [40.7141, -73.9627], categories: "bookstores" },
  { name: "Books are Magic", coords: [40.6845, -73.9974], categories: "bookstores" },
  { name: "Idlewild Books", coords: [40.7387, -73.9985], categories: "bookstores" },
  { name: "John Derian Company", coords: [40.7250, -73.9912], categories: "homedecor,furniture" },
  { name: "John Robshaw Textiles", coords: [40.7493, -73.9942], categories: "homedecor" },
  { name: "Atelier Courbet", coords: [40.7224, -73.9947], categories: "homedecor" },
  { name: "Lego Store Fifth Avenue", coords: [40.7588, -73.9779], categories: "toys" },
  { name: "Mast Brothers Chocolate", coords: [40.7173, -73.9583], categories: "chocolate" },
  { name: "M&M's World", coords: [40.7589, -73.9851], categories: "candy" },
  { name: "Rough Trade NY", coords: [40.7589, -73.9787], categories: "musicvideo" },
  { name: "The Met Store", coords: [40.7794, -73.9633], categories: "artsupplies,artmuseums" }
];

const PHOTO_DIR = path.join(__dirname, '..', 'photos', 'lojas');

function slugify(name) {
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function fetchJSON(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = ''; res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0,200)}`));
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}
function download(url, outPath, depth = 0) {
  if (depth > 5) return Promise.reject(new Error('Too many redirects'));
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
        return download(res.headers.location, outPath, depth+1).then(resolve, reject);
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const file = fs.createWriteStream(outPath);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    }).on('error', reject);
  });
}
function normalize(s) {
  return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(t=>t.length>=3);
}
function nameMatches(yelpName, shopName) {
  const yelpTokens = new Set(normalize(yelpName));
  const shopTokens = normalize(shopName);
  const significantShopTokens = shopTokens.filter(t => !['the','new','york','nyc','soho','nolita','midtown','madison','avenue','street','flatiron','downtown','williamsburg','brooklyn','shop','store','company','mansion','landmark','maison'].includes(t));
  // Pelo menos 1 token significativo do shop deve aparecer no yelp
  return significantShopTokens.some(t => yelpTokens.has(t));
}

async function fetchOne(shop) {
  const slug = slugify(shop.name);
  const outPath = path.join(PHOTO_DIR, `${slug}.jpg`);
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
    return { name: shop.name, slug, status: 'already_have' };
  }

  // Strategy: search by name + category, radius 500m, sort by best_match (default)
  const params = new URLSearchParams({
    term: shop.name.replace(/&/g, 'and'),
    latitude: String(shop.coords[0]),
    longitude: String(shop.coords[1]),
    radius: '500',
    limit: '5',
    sort_by: 'best_match'
  });
  if (shop.categories) params.set('categories', shop.categories);

  const url = `https://api.yelp.com/v3/businesses/search?${params}`;
  let result;
  try {
    result = await fetchJSON(url, { Authorization: `Bearer ${API_KEY}` });
  } catch (e) {
    return { name: shop.name, slug, status: 'api_error', error: e.message };
  }

  if (!result.businesses || !result.businesses.length) {
    return { name: shop.name, slug, status: 'not_found' };
  }

  // Encontra o primeiro com image_url e nome que faz match
  const matched = result.businesses.find(b => b.image_url && nameMatches(b.name, shop.name));
  if (!matched) {
    return { name: shop.name, slug, status: 'no_good_match', candidates: result.businesses.map(b => b.name) };
  }

  try {
    const hires = matched.image_url.replace(/\/o\.jpg/, '/l.jpg');
    await download(hires, outPath);
    return { name: shop.name, slug, status: 'downloaded', yelp_match: matched.name };
  } catch (e) {
    return { name: shop.name, slug, status: 'download_error', error: e.message };
  }
}

(async () => {
  console.log(`\n📸 Tentando ${MISSING.length} lojas faltantes com Yelp categories + best_match...\n`);
  const results = [];
  for (let i = 0; i < MISSING.length; i++) {
    const r = await fetchOne(MISSING[i]);
    results.push(r);
    const icon = r.status === 'downloaded' ? '✓' : r.status === 'already_have' ? '·' : '✗';
    const match = r.yelp_match && r.yelp_match !== MISSING[i].name ? ` (matched: ${r.yelp_match})` : '';
    console.log(`${icon} [${i+1}/${MISSING.length}] ${MISSING[i].name} → ${r.status}${match}`);
    await new Promise(r => setTimeout(r, 150));
  }
  const ok = results.filter(r => r.status === 'downloaded').length;
  const had = results.filter(r => r.status === 'already_have').length;
  console.log(`\n✅ ${ok} novas baixadas (${had} já tinha)`);
  fs.writeFileSync(path.join(__dirname, 'fetch-missing-results.json'), JSON.stringify(results, null, 2));
})();
