const { GRAPH_BASE, GRAPH_VERSION, getSession, readJson } = require('./_session');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: { message: 'Method not allowed' } }));
    return;
  }

  const session = await getSession(req, res);
  if (!session) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: { message: 'Not connected' } }));
    return;
  }

  let body = {};
  try {
    body = await readJson(req);
  } catch (error) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: { message: 'Invalid JSON body' } }));
    return;
  }

  const commentId = body.comment_id;
  const message = body.message;
  if (!commentId || !message) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: { message: 'Missing comment_id or message' } }));
    return;
  }

  const apiUrl = new URL(`${GRAPH_BASE}/${GRAPH_VERSION}/${commentId}/replies`);
  apiUrl.searchParams.set('message', message);
  apiUrl.searchParams.set('access_token', session.access_token);

  const response = await fetch(apiUrl.toString(), { method: 'POST' });
  const data = await response.json();
  res.statusCode = response.status;
  res.end(JSON.stringify(data));
};
