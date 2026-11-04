const jsonResponse = (status, error) =>
  new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

export default async (request) => {
  const configuredApiUrl = process.env.VYORA_API_URL?.trim();
  if (!configuredApiUrl) {
    return jsonResponse(
      503,
      'The VYORA API is not configured for this deployment. Set VYORA_API_URL to the deployed Express API origin.'
    );
  }

  let apiOrigin;
  try {
    apiOrigin = new URL(configuredApiUrl);
    if (!['http:', 'https:'].includes(apiOrigin.protocol) || apiOrigin.pathname !== '/') {
      return jsonResponse(500, 'VYORA_API_URL must be an HTTP(S) origin without a path.');
    }
  } catch {
    return jsonResponse(500, 'VYORA_API_URL must be a valid HTTP(S) origin.');
  }

  const incomingUrl = new URL(request.url);
  const functionPrefix = '/.netlify/functions/api';
  const apiPath = incomingUrl.pathname.startsWith(functionPrefix)
    ? incomingUrl.pathname.slice(functionPrefix.length)
    : incomingUrl.pathname.startsWith('/api/')
      ? incomingUrl.pathname.slice('/api'.length)
      : '';
  if (!apiPath.startsWith('/')) {
    return jsonResponse(404, 'API route not found.');
  }

  const targetUrl = new URL(`/api${apiPath}`, apiOrigin);
  targetUrl.search = incomingUrl.search;

  const headers = new Headers();
  for (const name of ['accept', 'authorization', 'content-type', 'cookie']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  let upstream;
  try {
    upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      ...(hasBody ? { body: await request.arrayBuffer() } : {}),
      redirect: 'manual'
    });
  } catch (error) {
    console.error('VYORA API proxy request failed:', error);
    return jsonResponse(502, 'The VYORA API could not be reached. Check the configured API service.');
  }

  const responseHeaders = new Headers();
  for (const name of ['cache-control', 'content-type', 'etag', 'location', 'vary']) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  const setCookies = upstream.headers.getSetCookie?.() ?? [];
  if (setCookies.length > 0) {
    for (const cookie of setCookies) responseHeaders.append('set-cookie', cookie);
  } else {
    const setCookie = upstream.headers.get('set-cookie');
    if (setCookie) responseHeaders.set('set-cookie', setCookie);
  }

  return new Response(request.method === 'HEAD' ? null : upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders
  });
};
