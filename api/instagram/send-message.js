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

  const message = body.message;
  const recipientId = body.recipient_id;
  const conversationId = body.conversation_id;

  if (!message || (!recipientId && !conversationId)) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: { message: 'Missing message or recipient' } }));
    return;
  }

  let apiUrl;
  let payload;

  if (conversationId) {
    apiUrl = `${GRAPH_BASE}/${GRAPH_VERSION}/${conversationId}/messages`;
    payload = { message };
  } else {
    apiUrl = `${GRAPH_BASE}/${GRAPH_VERSION}/me/messages`;
    payload = {
      recipient: { id: recipientId },
      message: { text: message }
    };
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  res.statusCode = response.status;
  res.end(JSON.stringify(data));
};
