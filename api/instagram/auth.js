const crypto = require('crypto');
const { buildCookie, getRedirectUri, STATE_COOKIE, NEXT_COOKIE } = require('./_session');

module.exports = async (req, res) => {
  const clientId = (process.env.INSTAGRAM_APP_ID || '').trim();
  if (!clientId) {
    res.statusCode = 500;
    res.end('Missing INSTAGRAM_APP_ID');
    return;
  }

  const state = crypto.randomBytes(16).toString('hex');
  const redirectUri = getRedirectUri(req);
  const scopes = (process.env.INSTAGRAM_SCOPES || '').trim() ||
    'instagram_basic,instagram_manage_messages,instagram_manage_comments,instagram_content_publish';

  const requestUrl = new URL(req.url, 'http://localhost');
  const next = requestUrl.searchParams.get('next') || '/';

  const authUrl = new URL('https://api.instagram.com/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);

  const cookies = [
    buildCookie(STATE_COOKIE, state, {
      maxAge: 300,
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax'
    }),
    buildCookie(NEXT_COOKIE, next, {
      maxAge: 600,
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax'
    })
  ];

  res.setHeader('Set-Cookie', cookies);
  res.writeHead(302, { Location: authUrl.toString() });
  res.end();
};
