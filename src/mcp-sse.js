import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// MCP tool definition
const TOOL_DEF = {
    name: 'quickitquote_search',
    description: 'Search QuickItQuote API',
    inputSchema: {
        type: 'object',
        properties: { q: { type: 'string', description: 'Search query' } },
        required: ['q'],
    },
};

// SSE handler for MCP
const handler = async (req, res) => {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    // Simple GET: return tools list via SSE and keep connection open
    if (req.method === 'GET') {
        res.write(`data: ${JSON.stringify({ tools: [TOOL_DEF], resources: [] })}\n\n`);
        
        // Keep connection alive with heartbeat
        const heartbeat = setInterval(() => {
            res.write(': heartbeat\n\n');
        }, 15000);
        
        req.on('close', () => {
            clearInterval(heartbeat);
            res.end();
        });
        return;
    }

    // POST: handle JSON-RPC requests
    let body = '';
    await new Promise((resolve) => {
        req.on('data', chunk => { body += chunk; });
        req.on('end', resolve);
    });

    try {
        // Empty body: return tools
        if (!body || body.trim() === '') {
            res.write(`data: ${JSON.stringify({ tools: [TOOL_DEF], resources: [] })}\n\n`);
            res.end();
            return;
        }

        const frame = JSON.parse(body);

        // Handle initialize
        if (frame.method === 'initialize') {
            const response = {
                jsonrpc: '2.0',
                id: frame.id || 1,
                result: {
                    protocolVersion: '2024-11-05',
                    capabilities: { tools: {} },
                    serverInfo: { name: 'quickitquote-mcp', version: '1.0.0' },
                },
            };
            res.write(`data: ${JSON.stringify(response)}\n\n`);
            res.end();
            return;
        }

        // Handle tools/list
        if (frame.method === 'tools/list') {
            const response = {
                jsonrpc: '2.0',
                id: frame.id || 1,
                result: { tools: [TOOL_DEF] },
            };
            res.write(`data: ${JSON.stringify(response)}\n\n`);
            res.end();
            return;
        }

        // Handle tools/call
        if (frame.method === 'tools/call') {
            const toolName = frame.params?.name;
            if (toolName === 'quickitquote_search') {
                const q = frame.params?.arguments?.q || '';
                if (!q) {
                    const response = {
                        jsonrpc: '2.0',
                        id: frame.id || 1,
                        error: { code: -32602, message: 'q parameter required' },
                    };
                    res.write(`data: ${JSON.stringify(response)}\n\n`);
                    res.end();
                    return;
                }

                try {
                    const url = `https://quickitquote.com/api/search?q=${encodeURIComponent(q)}`;
                    const r = await fetch(url);
                    const data = await r.json();
                    const response = {
                        jsonrpc: '2.0',
                        id: frame.id || 1,
                        result: { content: [{ type: 'text', text: JSON.stringify(data) }] },
                    };
                    res.write(`data: ${JSON.stringify(response)}\n\n`);
                    res.end();
                } catch (err) {
                    const response = {
                        jsonrpc: '2.0',
                        id: frame.id || 1,
                        error: { code: -32603, message: err.message },
                    };
                    res.write(`data: ${JSON.stringify(response)}\n\n`);
                    res.end();
                }
            } else {
                const response = {
                    jsonrpc: '2.0',
                    id: frame.id || 1,
                    error: { code: -32601, message: 'Tool not found' },
                };
                res.write(`data: ${JSON.stringify(response)}\n\n`);
                res.end();
            }
            return;
        }

        // Default: unknown method
        const response = {
            jsonrpc: '2.0',
            id: frame.id || 1,
            error: { code: -32601, message: 'Method not found' },
        };
        res.write(`data: ${JSON.stringify(response)}\n\n`);
        res.end();
    } catch (err) {
        const response = {
            jsonrpc: '2.0',
            error: { code: -32700, message: 'Parse error' },
        };
        res.write(`data: ${JSON.stringify(response)}\n\n`);
        res.end();
    }
};

router.get('/', handler);
router.post('/', handler);
router.options('/', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.status(204).end();
});

export default router;
