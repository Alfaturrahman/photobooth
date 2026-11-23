const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

const root = __dirname;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const maxPhotoBytes = 5 * 1024 * 1024;

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS photos (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      image BYTEA NOT NULL,
      mime_type TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS wishes (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
      message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 500),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxPhotoBytes * 1.4) {
        reject(new Error('Request too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function serveFile(res, pathname) {
  const filename = pathname === '/' ? 'index.html' : pathname.slice(1);
  const fullPath = path.resolve(root, filename);
  if (!fullPath.startsWith(root) || !fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) return send(res, 404, { error: 'Not found' });
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
  res.writeHead(200, { 'content-type': types[path.extname(fullPath)] || 'application/octet-stream' });
  fs.createReadStream(fullPath).pipe(res);
}

async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { ok: true });
  if (req.method === 'GET' && url.pathname === '/api/photos') {
    const { rows } = await pool.query('SELECT id, created_at FROM photos ORDER BY id DESC LIMIT 100');
    return send(res, 200, rows.map((row) => ({ id: row.id, url: `/api/photos/${row.id}`, createdAt: row.created_at })));
  }
  if (req.method === 'GET' && /^\/api\/photos\/\d+$/.test(url.pathname)) {
    const { rows } = await pool.query('SELECT image, mime_type FROM photos WHERE id = $1', [url.pathname.split('/').pop()]);
    return rows[0] ? send(res, 200, rows[0].image, rows[0].mime_type) : send(res, 404, { error: 'Not found' });
  }
  if (req.method === 'POST' && url.pathname === '/api/photos') {
    const { image } = await readJson(req);
    const match = typeof image === 'string' && image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return send(res, 400, { error: 'Foto harus JPEG, PNG, atau WebP.' });
    const binary = Buffer.from(match[2], 'base64');
    if (!binary.length || binary.length > maxPhotoBytes) return send(res, 413, { error: 'Ukuran foto maksimal 5 MB.' });
    const { rows } = await pool.query('INSERT INTO photos (image, mime_type) VALUES ($1, $2) RETURNING id', [binary, match[1]]);
    return send(res, 201, { id: rows[0].id, url: `/api/photos/${rows[0].id}` });
  }
  if (req.method === 'GET' && url.pathname === '/api/wishes') {
    const { rows } = await pool.query('SELECT id, name, message FROM wishes ORDER BY id DESC LIMIT 100');
    return send(res, 200, rows);
  }
  if (req.method === 'POST' && url.pathname === '/api/wishes') {
    const { name, message } = await readJson(req);
    if (typeof name !== 'string' || typeof message !== 'string' || !name.trim() || !message.trim()) return send(res, 400, { error: 'Nama dan ucapan wajib diisi.' });
    const { rows } = await pool.query('INSERT INTO wishes (name, message) VALUES ($1, $2) RETURNING id, name, message', [name.trim().slice(0, 80), message.trim().slice(0, 500)]);
    return send(res, 201, rows[0]);
  }
  if (req.method === 'GET') return serveFile(res, decodeURIComponent(url.pathname));
  return send(res, 405, { error: 'Method not allowed' });
}

initDatabase().then(() => {
  http.createServer((req, res) => handler(req, res).catch((error) => {
    console.error(error);
    send(res, 500, { error: 'Server error' });
  })).listen(process.env.PORT || 3000, () => console.log('Server ready'));
}).catch((error) => {
  console.error('Database startup failed:', error);
  process.exit(1);
});
