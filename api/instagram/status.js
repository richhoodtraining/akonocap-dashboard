const { getSession } = require('./_session');

module.exports = async (req, res) => {
  const session = await getSession(req, res);
  res.setHeader('Content-Type', 'application/json');

  if (!session) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: { message: 'Not connected' } }));
    return;
  }

  res.statusCode = 200;
  res.end(JSON.stringify({ connected: true, user: session.user }));
};
