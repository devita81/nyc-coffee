# NYC Coffee + Hotel Explorer — PWA

Aplicação web progressiva (PWA) para explorar cafeterias, bakeries e hotéis em Manhattan e Brooklyn.

## Recursos PWA

- **Instalável** no desktop (Chrome/Edge) e no celular (Android e iOS) — vira app real com ícone próprio
- **Funciona offline** depois da primeira visita: app shell, ícones, Leaflet, base curada de hotéis e cafés ficam em cache
- **Cache inteligente de tiles do mapa** — áreas já visitadas continuam carregando sem internet
- **Service Worker** com estratégias diferenciadas (cache-first para shell, network-first para APIs, stale-while-revalidate para tiles)
- **Atalhos** no menu de contexto da app instalada: pular direto para o modo "Hotel" ou "Café/Bakery"
- **Theme color** e safe-area-insets para iPhones com notch
- **Layout responsivo** para mobile

## Como rodar localmente

PWA **precisa** ser servida via HTTP — não funciona abrindo o arquivo direto com duplo clique.

### Windows
1. Instale Python 3 (https://www.python.org/downloads/) — marque "Add Python to PATH"
2. Dê duplo clique em `start_pwa.bat`
3. O navegador abre automaticamente em http://localhost:8765/

### macOS / Linux
```bash
chmod +x start_pwa.sh
./start_pwa.sh
```

### Alternativa manual (qualquer SO com Python)
```bash
cd nyc-coffee-pwa
python3 -m http.server 8765
# Abra http://localhost:8765/ no Chrome ou Edge
```

### Alternativa com Node.js
```bash
npx serve -p 8765
```

## Como instalar a app

### Desktop (Chrome / Edge)
- Clique no botão **"📲 Instalar App"** no canto superior direito, ou
- Clique no ícone de instalação na barra de endereço (✚ ou monitor com seta)

### Android (Chrome)
- Abra a app no Chrome
- Toque em **"Instalar"** quando o banner aparecer, ou
- Menu (⋮) → "Adicionar à tela inicial"

### iOS (Safari)
- Abra a app no Safari (precisa ser Safari, não Chrome no iOS)
- Toque no botão Compartilhar (□↑) na barra inferior
- Role e toque em **"Adicionar à Tela de Início"**

Depois de instalada, ela aparece no menu de apps com ícone próprio, abre em janela standalone (sem barra do browser) e funciona offline.

## Deploy gratuito (para usar de qualquer lugar)

Para acessar de qualquer dispositivo sem rodar Python local, suba os arquivos em qualquer host estático grátis:

### Opção 1: GitHub Pages
1. Crie um repositório no GitHub
2. Faça upload da pasta `nyc-coffee-pwa/` na raiz
3. Settings → Pages → Branch: main / root → Save
4. App fica em `https://seuuser.github.io/repo/`

### Opção 2: Netlify Drop (mais rápido)
1. Acesse https://app.netlify.com/drop
2. Arraste a pasta `nyc-coffee-pwa/` inteira
3. Pronto — URL gerada automaticamente, HTTPS incluso

### Opção 3: Cloudflare Pages
1. https://pages.cloudflare.com/
2. Conecte ao GitHub OU faça upload direto
3. HTTPS + CDN global grátis

Qualquer um desses serve HTTPS, que é o requisito para PWAs em produção (e ativa o botão "Instalar" em todos os dispositivos).

## Estrutura

```
nyc-coffee-pwa/
├── index.html              # App principal (HTML + CSS + JS embutidos)
├── manifest.webmanifest    # Metadados PWA (nome, ícones, tema)
├── sw.js                   # Service Worker (cache offline)
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable-192.png
│   ├── icon-maskable-512.png
│   ├── apple-touch-icon.png
│   ├── favicon-32.png
│   └── favicon-16.png
├── start_pwa.bat           # Starter Windows
├── start_pwa.sh            # Starter macOS/Linux
└── README.md               # Este arquivo
```

## Fontes de dados

- **Geocoding**: [Nominatim/OpenStreetMap](https://nominatim.org/) (gratuito, sem chave)
- **Cafés/Bakeries/Hotéis (descoberta dinâmica)**: [Overpass API](https://overpass-api.de/) com 4 endpoints de fallback
- **Avaliações Booking** (hotéis): coletadas de booking.com em maio/2026
- **Avaliações Google** (cafés/bakeries): coletadas em maio/2026
- **Preços de hotéis**: faixas referenciais de KAYAK/Booking — clique em "🏨 Booking" no card para preços exatos da sua data

## Atualizar o Service Worker

Se você modificar o código e quiser forçar atualização da PWA já instalada:

1. Edite `sw.js` e mude `CACHE_VERSION` para um valor novo (ex.: `"nyc-coffee-v4"`)
2. Recarregue a app — um banner "Nova versão disponível" aparece com botão "Atualizar"

## Permissões

A app **não pede acesso à localização** — você sempre pesquisa por nome. Nenhum dado pessoal sai do seu navegador. As APIs externas (Nominatim, Overpass, tiles OSM) recebem apenas as coordenadas/textos que você buscar.
