// GET /api/og-store?slug=<store-slug>
//
// Crawler-only preview page: returns minimal HTML with Open Graph tags so
// shared vendor links unfurl with the vendor's profile picture on WhatsApp,
// Facebook, X/Twitter, LinkedIn, Telegram, etc.
//
// Humans never see this response — vercel.json rewrites ONLY known crawler
// user-agents here; everyone else gets the React app.

function apiBase() {
  const raw = (process.env.VITE_API_URL || process.env.API_URL || 'https://myjays-store.onrender.com')
    .trim()
    .replace(/\/+$/, '');
  return raw.endsWith('/api') ? raw : `${raw}/api`;
}

function siteOrigin() {
  const env = (process.env.FRONTEND_URL || '').trim().replace(/\/+$/, '');
  if (env) return env;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'https://jays-store-steel.vercel.app';
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function trunc(value, max) {
  const s = String(value ?? '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

async function fetchJson(url) {
  const ctrl = new AbortController();
  // Render's free tier can cold-start for 20s+; maxDuration (vercel.json) is 30s.
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80&auto=format&fit=crop';

function page({ status, title, description, image, url }) {
  return {
    status,
    html: `<!doctype html><html lang="en"><head>${[
      '<meta charset="utf-8">',
      '<meta name="robots" content="noindex">',
      `<title>${esc(title)}</title>`,
      '<meta property="og:type" content="website">',
      '<meta property="og:site_name" content="My Jay\'s Store">',
      `<meta property="og:title" content="${esc(title)}">`,
      `<meta property="og:description" content="${esc(description)}">`,
      `<meta property="og:image" content="${esc(image)}">`,
      `<meta property="og:url" content="${esc(url)}">`,
      '<meta name="twitter:card" content="summary_large_image">',
      `<meta name="twitter:title" content="${esc(title)}">`,
      `<meta name="twitter:description" content="${esc(description)}">`,
      `<meta name="twitter:image" content="${esc(image)}">`,
    ].join('')}</head><body></body></html>`,
  };
}

export default async function handler(req, res) {
  const slug = req.query?.slug;
  const site = siteOrigin();

  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
    const { status, html } = page({
      status: 404,
      title: "My Jay's Store",
      description: 'Shop from Navrongo vendors. Pay with MoMo. Delivered to your door.',
      image: FALLBACK_IMAGE,
      url: site,
    });
    res.status(status).setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
    return;
  }

  const store = await fetchJson(`${apiBase()}/accounts/stores/${encodeURIComponent(slug)}/`);

  if (!store) {
    const { status, html } = page({
      status: 404,
      title: "Store not found | My Jay's Store",
      description: 'This store is no longer available.',
      image: FALLBACK_IMAGE,
      url: `${site}/stores/${encodeURIComponent(slug)}`,
    });
    res
      .status(status)
      .setHeader('Content-Type', 'text/html; charset=utf-8')
      .setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
      .send(html);
    return;
  }

  // Vendor's profile picture first (as requested), banner as fallback.
  const image = store.logo_url || store.banner_url || FALLBACK_IMAGE;
  const description =
    trunc(store.store_description, 200) ||
    `${store.full_name || store.store_name} · ★ ${store.seller_average_rating || 0}`;

  const { status, html } = page({
    status: 200,
    title: `${store.store_name} | My Jay's Store`,
    description,
    image,
    url: `${site}/stores/${encodeURIComponent(store.store_slug || slug)}`,
  });

  res
    .status(status)
    .setHeader('Content-Type', 'text/html; charset=utf-8')
    .setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    .send(html);
}
