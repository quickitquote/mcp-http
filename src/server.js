import cors from 'cors';
import express from 'express';
import fetch from 'node-fetch';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
// Export the app for serverless platforms (Vercel)
import mcpSSE from './mcp-sse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const IS_VERCEL = !!process.env.VERCEL;

app.use(cors());

// Serve test.html directly
app.get('/test.html', (_req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MCP Tool Test</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 2em; }
    input, button { font-size: 1em; padding: 0.5em; }
    #result { margin-top: 1em; white-space: pre-wrap; background: #f8f8f8; padding: 1em; border-radius: 6px; }
  </style>
</head>
<body>
  <h1>MCP Tool Test (quickitquote_search)</h1>
  <label>Query: <input id="q" value="test" /></label>
  <button onclick="runMCP()">Run MCP Tool</button>
  <div id="result"></div>
  <script>
    async function runMCP() {
      const q = document.getElementById('q').value;
      const frame = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'quickitquote_search', arguments: { q } }
      };
      document.getElementById('result').textContent = 'Loading...';
      try {
        const res = await fetch('/api/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(frame)
        });
        const text = await res.text();
        document.getElementById('result').textContent = text;
      } catch (e) {
        document.getElementById('result').textContent = 'Error: ' + e;
      }
    }
  </script>
</body>
</html>`);
});

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'mcp-http', time: new Date().toISOString() });
});

// HTTP-only search
app.get('/api/search', async (req, res) => {
    try {
        const q = (req.query.q || '').toString().trim();
        if (!q) {
            return res.status(400).json({ error: 'Missing query parameter q' });
        }
        const url = `https://quickitquote.com/api/search?q=${encodeURIComponent(q)}`;
        const r = await fetch(url, { method: 'GET' });
        if (!r.ok) {
            return res.status(r.status).json({ error: `Upstream error ${r.status}` });
        }
        const data = await r.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Internal error', details: (err && err.message) || String(err) });
    }
});

// Minimal MCP endpoint (SSE)
app.use('/api/mcp', mcpSSE);

if (!IS_VERCEL) {
    app.listen(PORT, () => {
        console.log(`mcp-http server running on http://localhost:${PORT}`);
    });
}

export default app;
