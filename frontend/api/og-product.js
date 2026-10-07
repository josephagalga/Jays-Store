// GET /api/og-product?slug=<product-slug>
//
// Crawler-only preview page: returns minimal HTML with Open Graph tags so
// shared product links unfurl with the product image on WhatsApp, Facebook,
// X/Twitter, LinkedIn, Telegram, etc.
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

function backendOrigin() {
  return apiBase().replace(/\/api$/, '');
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

function absolutize(url) {
  if (!url) return null;
  const s = String(url);
  if (/^https?:\/\//i.test(s)) return s;
  return backendOrigin() + (s.startsWith('/') ? s : `/${s}`);
}

async function fetchJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
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

function page({ status, title, description, image, url, price }) {
  const tags = [
    '<meta charset="utf-8">',
    '<meta name="robots" content="noindex">',
    `<title>${esc(title)}</title>`,
    '<meta property="og:type" content="product">',
    '<meta property="og:site_name" content="My Jay\'s Store">',
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    `<meta name="twitter:image" content="${esc(image)}">`,
  ];
  if (price) {
    tags.push(
      `<meta property="product:price:amount" content="${esc(price)}">`,
      '<meta property="product:price:currency" content="GHS">'
    );
  }
  return {
    status,
    html: `<!doctype html><html lang="en"><head>${tags.join('')}</head><body></body></html>`,
  };
}

export default async function handler(req, res) {
  const slug = req.query?.slug;
  const site = siteOrigin();

  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
    const { status, html } = page({
      status: 404,
      title: "My Jay's Store",
      description: "Shop from Navrongo vendors. Pay with MoMo. Delivered to your door.",
      image: FALLBACK_IMAGE,
      url: site,
    });
    res.status(status).setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
    return;
  }

  const product = await fetchJson(`${apiBase()}/products/${encodeURIComponent(slug)}/`);

  if (!product) {
    const { status, html } = page({
      status: 404,
      title: "Product not found | My Jay's Store",
      description: 'This product is no longer available.',
      image: FALLBACK_IMAGE,
      url: `${site}/products/${encodeURIComponent(slug)}`,
    });
    res
      .status(status)
      .setHeader('Content-Type', 'text/html; charset=utf-8')
      .setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
      .send(html);
    return;
  }

  const images = Array.isArray(product.images) ? product.images : [];
  const primary =
    images.find((img) => img && img.is_primary && img.url) ||
    images.find((img) => img && img.url);
  const image = absolutize(primary && primary.url) || FALLBACK_IMAGE;

  const price = product.effective_price ? String(product.effective_price) : null;
  const title = price ? `${product.name} — GHS ${price}` : product.name;
  const description =
    trunc(product.description, 200) ||
    `${product.store_name || "My Jay's Store"} · ★ ${product.average_rating || 0}`;

  const { status, html } = page({
    status: 200,
    title: `${title} | My Jay's Store`,
    description,
    image,
    url: `${site}/products/${encodeURIComponent(product.slug || slug)}`,
    price,
  });

  res
    .status(status)
    .setHeader('Content-Type', 'text/html; charset=utf-8')
    .setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    .send(html);
}
