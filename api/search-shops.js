// Vercel Serverless Function: curadoria de lojas via Claude Haiku
// Recebe { description, shops } → retorna { matches: [{ name, why }], note }
// Env vars necessarias: ANTHROPIC_API_KEY

export default async function handler(req, res) {
  // CORS pra mesma origin (Vercel serve static + api do mesmo dominio, sem CORS issue normalmente)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.NYCagent;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Configure ANTHROPIC_API_KEY (ou NYCagent) no Vercel > Settings > Environment Variables.'
    });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: 'Body invalido' });
  }
  const { description, shops } = body || {};
  if (!description || !Array.isArray(shops) || shops.length === 0) {
    return res.status(400).json({ error: 'Faltam description ou shops' });
  }

  // Catalogo enxuto pro prompt (so' fields uteis pra match semantico)
  const catalog = shops.map((s, i) =>
    `${i + 1}. ${s.name} | ${s.type || 'shop'} | ${s.vibe || '-'} | ${s.area || '-'} | ${s.desc || ''}`
  ).join('\n');

  const systemPrompt = `Você é uma curadora-personal-shopper especialista em NYC. Receberá uma descrição do gosto do cliente e um catálogo numerado de lojas. Selecione as 12 lojas que melhor combinam, ordenadas por relevância. Para cada uma, dê uma razão curta (1 frase, em PT-BR). Responda APENAS um JSON válido neste formato:
{ "matches": [{ "name": "Nome exato da loja", "why": "Razão curta" }, ...], "note": "Observação geral curta sobre a curadoria" }
Não invente nomes — use apenas os que estão no catálogo. Se a descrição for ambígua ou nenhum match for bom, retorne menos de 12 matches (ou matches vazio com note explicativa).`;

  const userPrompt = `Descrição do cliente:
"${description}"

Catálogo:
${catalog}`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (!r.ok) {
      const errText = await r.text();
      return res.status(r.status).json({ error: `Anthropic API: ${r.status}`, detail: errText.slice(0, 300) });
    }

    const data = await r.json();
    const text = data.content?.[0]?.text || '';
    // Claude pode envolver em markdown ```json — extrai o primeiro objeto
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Resposta sem JSON', raw: text.slice(0, 500) });
    }
    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      return res.status(500).json({ error: 'JSON invalido', raw: jsonMatch[0].slice(0, 500) });
    }

    return res.status(200).json({
      matches: parsed.matches || [],
      note: parsed.note || '',
      model: data.model,
      usage: data.usage
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
