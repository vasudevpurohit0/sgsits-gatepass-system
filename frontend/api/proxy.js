const BACKEND_URL = 'https://sgsits-gatepass-system-production.up.railway.app';

export const config = {
  api: {
    bodyParser: false,
  },
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  // Handle CORS preflight from browser
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  // Retrieve matched path (e.g. "auth/login")
  const pathParam = req.query.path || '';
  
  // Reconstruct other query parameters if they exist
  const query = { ...req.query };
  delete query.path;
  const queryString = new URLSearchParams(query).toString();
  
  // Build final target URL
  const targetUrl = `${BACKEND_URL}/api/v1/${pathParam}${queryString ? '?' + queryString : ''}`;

  // Copy headers but strip Host, Origin, and connection-specific headers
  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    const lower = key.toLowerCase();
    if (['host', 'origin', 'connection', 'transfer-encoding', 'content-length'].includes(lower)) continue;
    headers[key] = Array.isArray(value) ? value.join(', ') : value;
  }
  headers['host'] = 'sgsits-gatepass-system-production.up.railway.app';

  try {
    // Read raw body for non-GET requests
    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.body) {
        body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      } else {
        const buffer = await readBody(req);
        if (buffer.length > 0) {
          body = buffer.toString('utf8');
        }
      }

      if (body) {
        headers['content-length'] = String(Buffer.byteLength(body));
      }
    }

    console.log(`[Proxy] Forwarding ${req.method} to ${targetUrl} with content-length: ${headers['content-length'] || 0}`);

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    // Forward all response headers except connection-level ones
    const skipHeaders = new Set(['transfer-encoding', 'connection', 'keep-alive']);
    for (const [key, value] of response.headers.entries()) {
      if (!skipHeaders.has(key.toLowerCase())) {
        if (key.toLowerCase() === 'set-cookie') {
          res.appendHeader(key, value);
        } else {
          res.setHeader(key, value);
        }
      }
    }

    const data = Buffer.from(await response.arrayBuffer());
    res.status(response.status).send(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(502).json({ 
      success: false, 
      message: 'Backend unavailable', 
      error: error.message, 
      stack: error.stack 
    });
  }
}
