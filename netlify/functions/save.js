exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' } };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const token = process.env.mine;
  if (!token) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Token not configured' }) };
  }

  let content;
  try {
    content = JSON.parse(event.body).content;
    if (!content) throw new Error('missing content');
  } catch(e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const apiUrl = 'https://api.github.com/repos/UlianaEB/uli-todo/contents/content.json';
  const headers = {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    'User-Agent': 'uli-todo-dashboard'
  };

  let sha;
  const getResp = await fetch(apiUrl + '?ref=main', { headers });
  if (getResp.status === 200) {
    sha = (await getResp.json()).sha;
  } else if (getResp.status === 401 || getResp.status === 403) {
    return { statusCode: 502, body: JSON.stringify({ error: 'GitHub token invalid or expired' }) };
  } else if (getResp.status !== 404) {
    return { statusCode: 502, body: JSON.stringify({ error: 'GitHub error: ' + getResp.status }) };
  }

  const putBody = { message: 'Update content.json from dashboard', content: Buffer.from(content).toString('base64'), branch: 'main' };
  if (sha) putBody.sha = sha;

  const putResp = await fetch(apiUrl, { method: 'PUT', headers, body: JSON.stringify(putBody) });
  if (putResp.ok) {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
  }
  const t = await putResp.text();
  return { statusCode: 502, body: JSON.stringify({ error: 'Push failed (' + putResp.status + '): ' + t.slice(0, 200) }) };
};
