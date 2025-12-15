import express from 'express';
import fetch from 'node-fetch';
const router = express.Router();

// MCP tool definition
const TOOL_ID = 'quickitquote_search';
const TOOL_DEF = {
    name: 'quickitquote_search',
    description: 'Search QuickItQuote API',
    input_schema: {
        type: 'object',
        properties: { q: { type: 'string', description: 'Search query' } },
        required: ['q'],
    },
};

// Handle both GET and POST
const handler = async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    // Collect body
    let body = '';
    await new Promise((resolve) => {
        req.on('data', chunk => { body += chunk; });
        req.on('end', resolve);
    });

    try {
        const lines = body.split('\n').filter(Boolean);

        for (const line of lines) {
            const frame = JSON.parse(line);

            if (frame.type === 'initialize') {
                res.write(JSON.stringify({
                    type: 'initialize',
                    protocolVersion: '2025-06-18',
                    capabilities: {},
                    serverInfo: { name: 'quickitquote-mcp', version: '1.0' },
                }) + '\n');
            } else if (frame.type === 'tools.list') {
                res.write(JSON.stringify({
                    type: 'tools.list',
                    tools: [TOOL_DEF],
                }) + '\n');
            } else if (frame.type === 'tools.invoke' && frame.tool === TOOL_ID) {
                const q = frame.arguments?.q || '';
                if (!q) {
                    res.write(JSON.stringify({
                        type: 'tool.result',
                        content: [{ type: 'text', text: 'Error: q parameter required' }],
                        isError: true,
                    }) + '\n');
                } else {
                    try {
                        const url = `https://quickitquote.com/api/search?q=${encodeURIComponent(q)}`;
                        const r = await fetch(url);
                        const data = await r.json();
                        res.write(JSON.stringify({
                            type: 'tool.result',
                            content: [{ type: 'json', text: JSON.stringify(data) }],
                        }) + '\n');
                    } catch (err) {
                        res.write(JSON.stringify({
                            type: 'tool.result',
                            content: [{ type: 'text', text: `Error: ${err.message}` }],
                            isError: true,
                        }) + '\n');
                    }
                }
            }
        }
        res.end();
    } catch (err) {
        res.write(JSON.stringify({ type: 'error', error: err.message }) + '\n');
        res.end();
    }
};

router.get('/', handler);
router.post('/', handler);

export default router;
