import https from 'https';
import http from 'http';
import { URL } from 'url';

const BACKEND_URL = 'https://sgsits-gatepass-system-production.up.railway.app';

export const config = {
  api: {
    bodyParser: false,
  },
};

function readStream(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

function makeRequest(urlStr, options, body) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlStr);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = client.request(urlStr, options, (res) => {
      resolve(res);
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (body !== undefined) {
      req.write(body);
    }
    req.end();
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
      const buffer = await readStream(req);
      if (buffer.length > 0) {
        body = buffer;
      }

      if (body) {
        headers['content-length'] = String(body.length);
      }
    }

    const options = {
      method: req.method,
      headers,
    };

    console.log(`[Proxy] Forwarding ${req.method} to ${targetUrl} via https`);
    const response = await makeRequest(targetUrl, options, body);

    // Forward all response headers except connection-level ones
    const skipHeaders = new Set(['transfer-encoding', 'connection', 'keep-alive']);
    for (const [key, value] of Object.entries(response.headers)) {
      if (!skipHeaders.has(key.toLowerCase()) && value !== undefined) {
        if (key.toLowerCase() === 'set-cookie') {
          res.appendHeader(key, value);
        } else {
          res.setHeader(key, value);
        }
      }
    }

    const data = await readStream(response);
    res.status(response.statusCode).send(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(502).json({ success: false, message: 'Backend unavailable' });
  }
}
