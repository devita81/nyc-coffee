// Vercel Serverless Function: busca cafes/bakeries/restaurantes no Yelp Fusion
// Substitui a query OSM/Overpass que estava desatualizada.
// Recebe: { lat, lng, radius, types: ['cafe','bakery','restaurant'] }
// Retorna: { places: [...] } com nome, coords, rating, photo, price, status

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  // Trim + dedup (caso paste tenha pegado quebras de linha ou copia duplicada)
  let apiKey = (process.env.YELP_API_KEY || '').trim().split(/\s+/)[0];
  if (!apiKey) {
    return res.status(500).json({ error: 'YELP_API_KEY nao configurada no Vercel.' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: 'Body invalido' });
  }
  const { lat, lng, radius = 800, types = ['cafe', 'bakery', 'restaurant'] } = body || {};
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'lat/lng obrigatorios' });
  }

  // Map nossos tipos pras Yelp categories
  const CATEGORY_MAP = {
    cafe: 'coffee,coffeeroasteries,cafes',
    bakery: 'bakeries',
    restaurant: 'restaurants'
  };
  const yelpCats = types
    .map(t => CATEGORY_MAP[t])
    .filter(Boolean)
    .join(',');

  if (!yelpCats) return res.status(200).json({ places: [] });

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    radius: String(Math.min(Math.max(parseInt(radius) || 800, 100), 40000)),
    categories: yelpCats,
    limit: '50',
    sort_by: 'best_match'
  });

  try {
    const r = await fetch(`https://api.yelp.com/v3/businesses/search?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (!r.ok) {
      const txt = await r.text();
      return res.status(r.status).json({ error: `Yelp: ${r.status}`, detail: txt.slice(0, 300) });
    }
    const data = await r.json();

    const places = (data.businesses || [])
      .filter(b => !b.is_closed && b.coordinates)
      .map(b => {
        // Detecta nosso tipo a partir da categoria principal
        const aliases = (b.categories || []).map(c => c.alias);
        let type = 'restaurant';
        if (aliases.some(a => a === 'coffee' || a === 'coffeeroasteries' || a === 'cafes')) type = 'cafe';
        else if (aliases.some(a => a === 'bakeries' || a === 'patisserie')) type = 'bakery';
        // Cuisine: pega titulos das categorias (ex: "Italian", "Pizza")
        const cuisineTitles = (b.categories || [])
          .map(c => c.title)
          .filter(t => !/coffee|tea|cafe|bakery|restaurant/i.test(t))
          .slice(0, 2);

        return {
          id: b.id,
          name: b.name,
          type,
          coords: [b.coordinates.latitude, b.coordinates.longitude],
          rating: b.rating,
          reviewCount: b.review_count,
          priceRange: b.price || '',
          photo: b.image_url || null,
          address: (b.location && b.location.address1) || '',
          area: (b.location && b.location.city) || '',
          cuisine: cuisineTitles.join(';').toLowerCase(),
          yelpUrl: b.url,
          yelpId: b.id
        };
      });

    return res.status(200).json({ places, total: data.total || places.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
