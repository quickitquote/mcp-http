

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
