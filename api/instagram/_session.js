const { kv } = require('@vercel/kv');

const GRAPH_BASE = process.env.IG_GRAPH_BASE || 'https://graph.instagram.com';
const GRAPH_VERSION = process.env.IG_GRAPH_VERSION || 'v21.0';
const SESSION_COOKIE = 'ig_session';
const STATE_COOKIE = 'ig_oauth_state';
const NEXT_COOKIE = 'ig_oauth_next';

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return header.split(';').reduce((acc, part) => {
    const [key, ...rest] = part.trim().split('=');
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

function buildCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  return parts.join('; ');
}

function buildSessionCookie(sessionId, maxAgeSeconds) {
  return buildCookie(SESSION_COOKIE, sessionId, {
    maxAge: maxAgeSeconds,
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax'
  });
}

function clearCookie(name) {
  return buildCookie(name, '', {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax'
  });
}

function getBaseUrl(req) {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  return `${proto}://${host}`;
}

function getRedirectUri(req) {
  if (process.env.INSTAGRAM_REDIRECT_URI) return process.env.INSTAGRAM_REDIRECT_URI;
  return `${getBaseUrl(req)}/api/instagram/callback`;
}

async function refreshToken(accessToken) {
  const url = new URL(`${GRAPH_BASE}/refresh_access_token`);
  url.searchParams.set('grant_type', 'ig_refresh_token');
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url.toString());
  const data = await response.json();
  if (!response.ok) return null;
  return data;
}

async function getSession(req, res) {
  const cookies = parseCookies(req);
  const sessionId = cookies[SESSION_COOKIE];
  if (!sessionId) return null;

  const session = await kv.get(`ig:session:${sessionId}`);
  if (!session) return null;

  const now = Date.now();
  if (session.expires_at && session.expires_at <= now) {
    await kv.del(`ig:session:${sessionId}`);
    return null;
  }

  const refreshWindowMs = 7 * 24 * 60 * 60 * 1000;
  if (session.expires_at && session.expires_at - now < refreshWindowMs) {
    const refreshed = await refreshToken(session.access_token);
    if (refreshed && refreshed.access_token) {
      session.access_token = refreshed.access_token;
      session.expires_at = now + (refreshed.expires_in || 0) * 1000;
      const ttl = Math.max(60, Math.floor((refreshed.expires_in || 0)));
      await kv.set(`ig:session:${sessionId}`, session, { ex: ttl });
      if (res) {
        res.setHeader('Set-Cookie', buildSessionCookie(sessionId, ttl));
      }
    }
  }

  return session;
}

async function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

module.exports = {
  GRAPH_BASE,
  GRAPH_VERSION,
  SESSION_COOKIE,
  STATE_COOKIE,
  NEXT_COOKIE,
  parseCookies,
  buildCookie,
  buildSessionCookie,
  clearCookie,
  getBaseUrl,
  getRedirectUri,
  getSession,
  readJson
};
