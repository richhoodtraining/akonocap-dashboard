const { GRAPH_BASE, GRAPH_VERSION, getSession } = require('./_session');

module.exports = async (req, res) => {
  const session = await getSession(req, res);
  res.setHeader('Content-Type', 'application/json');

  if (!session) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: { message: 'Not connected' } }));
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const mediaId = url.searchParams.get('media_id');
  if (!mediaId) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: { message: 'Missing media_id' } }));
    return;
  }

  const apiUrl = new URL(`${GRAPH_BASE}/${GRAPH_VERSION}/${mediaId}/comments`);
  apiUrl.searchParams.set('fields', 'id,text,username,timestamp,like_count');
  apiUrl.searchParams.set('access_token', session.access_token);

  const response = await fetch(apiUrl.toString());
  const data = await response.json();
  res.statusCode = response.status;
  res.end(JSON.stringify(data));
};
