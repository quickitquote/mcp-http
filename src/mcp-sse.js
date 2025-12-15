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

const sessions = new Map();

// POST-only handler for MCP
router.post('/', express.json(), async (req, res) => {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const sessionId = req.headers['x-session-id'] || Math.random().toString(36);

    try {
        const frame = req.body;

        if (!frame || !frame.method) {
            res.write(`data: ${JSON.stringify({ error: 'Invalid request' })}\n\n`);
            res.end();
            return;
        }

        const sendMessage = (msg) => {
            res.write(`data: ${JSON.stringify(msg)}\n\n`);
        };

        // Handle initialize
        if (frame.method === 'initialize') {
            sessions.set(sessionId, { initialized: true });
            const response = {
                jsonrpc: '2.0',
                id: frame.id || 1,
                result: {
                    protocolVersion: '2024-11-05',
                    capabilities: { tools: {} },
                    serverInfo: { name: 'quickitquote-mcp', version: '1.0.0' },
                },
            };
            sendMessage(response);

            // Keep connection alive
            const heartbeat = setInterval(() => {
                try {
                    res.write(': heartbeat\n\n');
                } catch (e) {
                    clearInterval(heartbeat);
                }
            }, 15000);

            req.on('close', () => {
                clearInterval(heartbeat);
                sessions.delete(sessionId);
            });
            return;
        }

        // Handle tools/list
        if (frame.method === 'tools/list') {
            const response = {
                jsonrpc: '2.0',
                id: frame.id || 1,
                result: { tools: [TOOL_DEF] },
            };
            sendMessage(response);
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
                    sendMessage(response);
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
                    sendMessage(response);
                    res.end();
                } catch (err) {
                    const response = {
                        jsonrpc: '2.0',
                        id: frame.id || 1,
                        error: { code: -32603, message: err.message },
                    };
                    sendMessage(response);
                    res.end();
                }
            } else {
                const response = {
                    jsonrpc: '2.0',
                    id: frame.id || 1,
                    error: { code: -32601, message: 'Tool not found' },
                };
                sendMessage(response);
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
        sendMessage(response);
        res.end();
    } catch (err) {
        const response = {
            jsonrpc: '2.0',
            error: { code: -32700, message: 'Parse error: ' + err.message },
        };
        res.write(`data: ${JSON.stringify(response)}\n\n`);
        res.end();
    }
});

// GET endpoint for discovery
router.get('/', (req, res) => {
    res.json({
        name: 'quickitquote-mcp',
        version: '1.0.0',
        protocol: 'mcp/2024-11-05',
        capabilities: { tools: {} },
        tools: [TOOL_DEF]
    });
});
router.options('/', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.status(204).end();
});

export default router;
