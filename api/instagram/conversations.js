const { GRAPH_BASE, GRAPH_VERSION, getSession } = require('./_session');

module.exports = async (req, res) => {
  const session = await getSession(req, res);
  res.setHeader('Content-Type', 'application/json');

  if (!session) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: { message: 'Not connected' } }));
    return;
  }

  const url = new URL(`${GRAPH_BASE}/${GRAPH_VERSION}/me/conversations`);
  url.searchParams.set('fields', 'id,participants,messages.limit(1){message,from,created_time}');
  url.searchParams.set('access_token', session.access_token);
  url.searchParams.set('limit', '10');

  const response = await fetch(url.toString());
  const data = await response.json();
  res.statusCode = response.status;
  res.end(JSON.stringify(data));
};
