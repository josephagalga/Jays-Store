// GET /api/og-store?slug=<store-slug>
//
// Preview page: crawlers get item-specific Open Graph tags (vendor profile
// picture unfurls on WhatsApp/Facebook/X); humans following a /share/ link
// are redirected to the real store page (see `share` below).
//

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

// Absolute + WhatsApp-friendly: relative backend paths are expanded, and
// Cloudinary images are served resized (1200px, auto quality/format) because
// WhatsApp/Facebook often refuse huge originals. Other hosts pass through.
function previewImage(url) {
  if (!url) return null;
  let s = String(url);
  if (!/^https?:\/\//i.test(s)) {
    const origin = apiBase().replace(/\/api$/, '');
    s = origin + (s.startsWith('/') ? s : `/${s}`);
  }
  if (s.includes('res.cloudinary.com') && s.includes('/upload/')) {
    return s.replace('/upload/', '/upload/w_1200,q_auto,f_auto/');
  }
  return s;
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

async function fetchJson(url, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return { reached: true, data: null };
    return { reached: true, data: await res.json() };
  } catch {
    return { reached: false, data: null };
  } finally {
    clearTimeout(timer);
  }
}

// Primary backend comes from env. Known-good Render host is the safety net:
// link previews must never die silently because of a misconfigured env var.
// Falls back whenever the primary yields nothing (unreachable OR answered
// 404 — a dead/suspended host answers 404 to everything, which is
// indistinguishable from "not found" except by asking the known-good host).
async function fetchApi(path) {
  const bases = [apiBase()];
  const fallback = 'https://myjays-store.onrender.com/api';
  if (!bases[0].startsWith(fallback)) bases.push(fallback);
  let last = { reached: false, data: null };
  for (const base of bases) {
    last = await fetchJson(
      `${base}${path}`,
      // Render's free tier can cold-start for 20s+; maxDuration (vercel.json) is 30s.
      base === bases[0] ? 10000 : 15000
    );
    if (last.data) return last;
  }
  return last;
}

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80&auto=format&fit=crop';

function page({ status, title, description, image, url }) {
  return {
    status,
    html: `<!doctype html><html lang="en"><head><!-- og-store v2 -->${[
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

// Scrapers that read meta tags but don't run JavaScript. Used only to tell
// humans (who followed a /share/ link) apart from crawlers.
const BOT_UA =
  /facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|telegrambot|discordbot|pinterest|skypeuripreview|whatsapp|viber|micromessenger|kakaotalk|vkshare|redditbot|embedly|iframely|quora|applebot/i;

export default async function handler(req, res) {
  const slug = req.query?.slug;
  const site = siteOrigin();

  // Preview-link visits by humans bounce straight to the real store page
  // (crawlers ignore the redirect and read the tags below instead).
  if (req.query?.share && !BOT_UA.test(req.headers?.['user-agent'] || '')) {
    res.status(302).setHeader('Location', `${site}/stores/${encodeURIComponent(slug || '')}`).send('');
    return;
  }

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

  const { data: store } = await fetchApi(`/accounts/stores/${encodeURIComponent(slug)}/`);

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
  const image = previewImage(store.logo_url || store.banner_url) || FALLBACK_IMAGE;
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
