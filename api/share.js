const HTML_TTL_MS = 60 * 60 * 1000;
const META_TTL_MS = 5 * 60 * 1000;
const BACKEND_TIMEOUT_MS = 1500;

let htmlCache = { value: null, expires: 0 };
const metaCache = new Map();

const STATIC_LABELS = {
  'payment-form': {
    title: 'Upload Payment Receipt — NEXIUM',
    desc: 'Submit your payment receipt for verification.',
  },
  'payment-success': {
    title: 'Payment Receipt Status — NEXIUM',
    desc: 'Track the status of your submitted payment receipt.',
  },
  'payment-closed': {
    title: 'Payment Closed — NEXIUM',
    desc: 'This payment collection has been closed.',
  },
  'payment-tickets': {
    title: 'My Payment Tickets — NEXIUM',
    desc: 'View your previously submitted payment tickets.',
  },
  'submission-form': {
    title: 'Submit Assignment — NEXIUM',
    desc: 'Upload your submission for class.',
  },
  'submission-success': {
    title: 'Submission Received — NEXIUM',
    desc: 'Your submission was received.',
  },
  'submission-closed': {
    title: 'Submission Closed — NEXIUM',
    desc: 'This submission has been closed.',
  },
  transparency: {
    title: 'Class Transparency — NEXIUM',
    desc: 'Class account transparency and ledger.',
  },
  default: {
    title: 'NEXIUM',
    desc: 'NEXIUM — class submissions, payments and account transparency',
  },
};

const ROUTE_PATTERNS = [
  { re: /^\/(?:payment|pay)\/([^/]+)\/success\/?$/, kind: 'payment-success' },
  { re: /^\/(?:payment|pay)\/([^/]+)\/closed\/?$/, kind: 'payment-closed' },
  { re: /^\/(?:payment|pay)\/([^/]+)\/my-tickets\/?$/, kind: 'payment-tickets' },
  { re: /^\/(?:payment|pay)\/([^/]+)\/?$/, kind: 'payment-form' },
  { re: /^\/(?:submitit|submit)\/([^/]+)\/success\/?$/, kind: 'submission-success' },
  { re: /^\/(?:submitit|submit)\/([^/]+)\/closed\/?$/, kind: 'submission-closed' },
  { re: /^\/(?:submitit|submit)\/([^/]+)\/?$/, kind: 'submission-form' },
  { re: /^\/transparency\/?$/, kind: 'transparency' },
];

function classify(pathname) {
  for (const { re, kind } of ROUTE_PATTERNS) {
    const m = pathname.match(re);
    if (m) return { kind, slug: m[1] ?? null };
  }
  return { kind: 'default', slug: null };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function getIndexHtml(origin) {
  const now = Date.now();
  if (htmlCache.value && htmlCache.expires > now) return htmlCache.value;
  const r = await fetch(`${origin}/index.html`);
  if (!r.ok) throw new Error(`index.html fetch failed: ${r.status}`);
  const text = await r.text();
  htmlCache = { value: text, expires: now + HTML_TTL_MS };
  return text;
}

async function fetchEventTitle(kind, slug) {
  const backend = process.env.BACKEND_URL;
  if (!backend) return null;

  const cacheKey = `${kind}:${slug}`;
  const now = Date.now();
  const cached = metaCache.get(cacheKey);
  if (cached && cached.expires > now) return cached.title;

  const path =
    kind === 'payment-form'
      ? `/api/payment-events/slug/${encodeURIComponent(slug)}`
      : `/api/events/${encodeURIComponent(slug)}`;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), BACKEND_TIMEOUT_MS);
    const r = await fetch(`${backend.replace(/\/$/, '')}${path}`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) return null;
    const data = await r.json();
    const title = typeof data?.title === 'string' ? data.title : null;
    if (title) metaCache.set(cacheKey, { title, expires: now + META_TTL_MS });
    return title;
  } catch {
    return null;
  }
}

async function resolveMeta(pathname) {
  const { kind, slug } = classify(pathname);
  const fallback = STATIC_LABELS[kind] ?? STATIC_LABELS.default;

  if (slug && (kind === 'payment-form' || kind === 'submission-form')) {
    const eventTitle = await fetchEventTitle(kind, slug);
    if (eventTitle) {
      const verb = kind === 'payment-form' ? 'Pay' : 'Submit';
      const desc =
        kind === 'payment-form'
          ? `Submit your payment receipt for ${eventTitle}.`
          : `Upload your submission for ${eventTitle}.`;
      return { title: `${verb}: ${eventTitle} — NEXIUM`, desc };
    }
  }

  return fallback;
}

function rewriteHead(html, meta, fullUrl) {
  const title = escapeHtml(meta.title);
  const desc = escapeHtml(meta.desc);
  const url = escapeHtml(fullUrl);

  let out = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  out = out.replace(
    /<meta\s+name="description"[^>]*\/?>/i,
    `<meta name="description" content="${desc}" />`
  );

  out = out.replace(/<link\s+rel="icon"[^>]*\/?>\s*/gi, '');
  out = out.replace(/<link\s+rel="apple-touch-icon"[^>]*\/?>\s*/gi, '');

  const ogBlock = `    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="NEXIUM" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${desc}" />
`;

  out = out.replace('</head>', `${ogBlock}  </head>`);
  return out;
}

export default async function handler(req, res) {
  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const origin = `${proto}://${host}`;
    const url = new URL(req.url, origin);

    const [html, meta] = await Promise.all([
      getIndexHtml(origin),
      resolveMeta(url.pathname),
    ]);

    const rewritten = rewriteHead(html, meta, `${origin}${url.pathname}`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    res.status(200).send(rewritten);
  } catch (err) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(
      `<!doctype html><html><head><title>NEXIUM</title><meta http-equiv="refresh" content="0;url=/" /></head><body></body></html>`
    );
  }
}
