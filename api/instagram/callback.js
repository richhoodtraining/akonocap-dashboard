const crypto = require('crypto');
const { kv } = require('@vercel/kv');
const {
  GRAPH_BASE,
  GRAPH_VERSION,
  STATE_COOKIE,
  NEXT_COOKIE,
  parseCookies,
  buildSessionCookie,
  clearCookie,
  getBaseUrl,
  getRedirectUri
} = require('./_session');

function sanitizeNext(value) {
  if (!value) return '/';
  if (value.startsWith('/')) return value;
  return '/';
}

module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const error = url.searchParams.get('error');
  if (error) {
    res.statusCode = 400;
    res.end(`Instagram login error: ${error}`);
    return;
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookies = parseCookies(req);

  if (!code || !state || state !== cookies[STATE_COOKIE]) {
    res.statusCode = 400;
    res.end('Invalid OAuth state');
    return;
  }

  const clientId = process.env.INSTAGRAM_APP_ID;
  const clientSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!clientId || !clientSecret) {
    res.statusCode = 500;
    res.end('Missing INSTAGRAM_APP_ID or INSTAGRAM_APP_SECRET');
    return;
  }

  const redirectUri = getRedirectUri(req);
  const form = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code
  });

  const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString()
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    res.statusCode = tokenRes.status || 500;
    res.end('Failed to exchange Instagram code');
    return;
  }

  const exchangeUrl = new URL(`${GRAPH_BASE}/access_token`);
  exchangeUrl.searchParams.set('grant_type', 'ig_exchange_token');
  exchangeUrl.searchParams.set('client_secret', clientSecret);
  exchangeUrl.searchParams.set('access_token', tokenData.access_token);

  const longRes = await fetch(exchangeUrl.toString());
  const longData = await longRes.json();
  if (!longRes.ok || !longData.access_token) {
    res.statusCode = longRes.status || 500;
    res.end('Failed to exchange long-lived Instagram token');
    return;
  }

  const accessToken = longData.access_token;
  const expiresIn = Number(longData.expires_in || 0);
  const expiresAt = Date.now() + expiresIn * 1000;

  const meUrl = new URL(`${GRAPH_BASE}/${GRAPH_VERSION}/me`);
  meUrl.searchParams.set('fields', 'id,username,account_type,media_count');
  meUrl.searchParams.set('access_token', accessToken);
  const meRes = await fetch(meUrl.toString());
  const meData = await meRes.json();
  if (!meRes.ok || !meData.id) {
    res.statusCode = meRes.status || 500;
    res.end('Failed to fetch Instagram user');
    return;
  }

  const sessionId = crypto.randomBytes(24).toString('hex');
  const ttl = Math.max(60, Math.floor(expiresIn));
  await kv.set(
    `ig:session:${sessionId}`,
    { access_token: accessToken, expires_at: expiresAt, user: meData },
    { ex: ttl }
  );

  const next = sanitizeNext(cookies[NEXT_COOKIE]);
  const redirectBase = getBaseUrl(req);
  const redirectUrl = `${redirectBase}${next}`;

  const cookiesToSet = [
    buildSessionCookie(sessionId, ttl),
    clearCookie(STATE_COOKIE),
    clearCookie(NEXT_COOKIE)
  ];

  res.setHeader('Set-Cookie', cookiesToSet);
  res.writeHead(302, { Location: redirectUrl });
  res.end();
};
