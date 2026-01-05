const { kv } = require('@vercel/kv');
const { SESSION_COOKIE, parseCookies, clearCookie } = require('./_session');

module.exports = async (req, res) => {
  const cookies = parseCookies(req);
  const sessionId = cookies[SESSION_COOKIE];
  if (sessionId) {
    await kv.del(`ig:session:${sessionId}`);
  }

  res.setHeader('Set-Cookie', clearCookie(SESSION_COOKIE));
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.end(JSON.stringify({ ok: true }));
};
