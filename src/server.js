import cors from 'cors';
import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3000;
const IS_VERCEL = !!process.env.VERCEL;

// Enable CORS for browser-based callers (Agent Builder UI, etc.)
app.use(cors());

// Simple health check
app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'mcp-http', time: new Date().toISOString() });
});

// HTTP-only search flow: proxies to QuickItQuote and lightly processes JSON
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

        // Normalize output for Agent Builder compatibility: a concise, predictable shape
        const normalized = {
            query: q,
            source: 'quickitquote',
            count: Array.isArray(data?.results) ? data.results.length : undefined,
            results: Array.isArray(data?.results)
                ? data.results.map((item) => ({
                    title: item.title ?? item.name ?? 'Untitled',
                    url: item.url ?? item.link ?? null,
                    snippet: item.snippet ?? item.description ?? null,
                    score: item.score ?? null,
                }))
                : data,
        };

        res.json(normalized);
    } catch (err) {
        console.error('Search error', err);
        res.status(500).json({ error: 'Internal error', details: (err && err.message) || String(err) });
    }
});

// Only start a listener in local/dev. On Vercel serverless, the platform handles the request lifecycle.
if (!IS_VERCEL) {
    app.listen(PORT, () => {
        console.log(`mcp-http server running on http://localhost:${PORT}`);
    });
}

// Export the app for serverless platforms (Vercel)

import mcpMinimal from './mcp-minimal-v2.js';

const app = express();
const PORT = process.env.PORT || 3000;
const IS_VERCEL = !!process.env.VERCEL;

app.use(cors());

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

// Minimal MCP endpoint (Streamable HTTP)
app.use('/api/mcp', mcpMinimal);

if (!IS_VERCEL) {
    app.listen(PORT, () => {
        console.log(`mcp-http server running on http://localhost:${PORT}`);
    });
}

export default app;
