import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// MCP tool definition
const TOOL_ID = 'quickitquote_search';
const TOOL_DEF = {
    id: TOOL_ID,
    name: 'QuickItQuote Search',
    description: 'Search QuickItQuote using q',
    input_schema: {
        type: 'object',
        properties: { q: { type: 'string', description: 'Search query' } },
        required: ['q'],
    },
    output_schema: { type: 'object' },
};

// Streamable HTTP handler
router.post('/', async (req, res) => {
    // MCP frames: https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#streamable-http
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
        try {
            const lines = body.split('\n').filter(Boolean);
            for (const line of lines) {
                const frame = JSON.parse(line);
                if (frame.type === 'tools.list') {
                    res.write(JSON.stringify({
                        type: 'tools.list',
                        tools: [TOOL_DEF],
                        id: frame.id,
                    }) + '\n');
                } else if (frame.type === 'tools.invoke' && frame.tool === TOOL_ID) {
                    // Call QuickItQuote API
                    const q = frame.input?.q || '';
                    const url = `https://quickitquote.com/api/search?q=${encodeURIComponent(q)}`;
                    const r = await fetch(url);
                    const data = await r.json();
                    res.write(JSON.stringify({
                        type: 'tools.output',
                        id: frame.id,
                        output: data,
                    }) + '\n');
                } else {
                    res.write(JSON.stringify({ type: 'error', id: frame.id, error: 'Unknown frame or tool' }) + '\n');
                }
            }
            res.end();
        } catch (err) {
            res.write(JSON.stringify({ type: 'error', error: err.message }) + '\n');
            res.end();
        }
    });
});

export default router;
