const { GRAPH_BASE, GRAPH_VERSION, getSession } = require('./_session');

module.exports = async (req, res) => {
  const session = await getSession(req, res);
  res.setHeader('Content-Type', 'application/json');

  if (!session) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: { message: 'Not connected' } }));
    return;
  }

  const url = new URL(`${GRAPH_BASE}/${GRAPH_VERSION}/me/media`);
  url.searchParams.set(
    'fields',
    'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count'
  );
  url.searchParams.set('limit', '9');
  url.searchParams.set('access_token', session.access_token);

  const response = await fetch(url.toString());
  const data = await response.json();
  res.statusCode = response.status;
  res.end(JSON.stringify(data));
};
