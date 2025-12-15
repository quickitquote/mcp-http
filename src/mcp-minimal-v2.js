import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// MCP tool definition
const TOOL_DEF = {
    name: 'quickitquote_search',
    description: 'Search QuickItQuote API',
    input_schema: {
        type: 'object',
        properties: { q: { type: 'string', description: 'Search query' } },
        required: ['q'],
    },
};

const SERVER_INFO = {
    name: 'quickitquote-mcp',
    version: '1.0',
};
const PROTOCOL_VERSION = '2025-06-18';

// Simple JSON-RPC 2.0 handler for MCP with a plain GET tools listing for Agent Builder
const handler = async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    // Many clients (including Agent Builder) probe with a simple GET expecting a plain list of tools
    if (req.method === 'GET') {
        return res.json({
            tools: [TOOL_DEF],
            resources: [],
        });
    }

    let body = '';
    await new Promise((resolve) => {
        req.on('data', chunk => { body += chunk; });
        req.on('end', resolve);
    });

    try {
        if (!body || body.trim() === '') {
            // Empty request - return tool list directly in a simple shape
            return res.json({
                tools: [TOOL_DEF],
                resources: [],
            });
        }

        const lines = body.split('\n').filter(l => l.trim());

        for (const line of lines) {
            try {
                const frame = JSON.parse(line);

                if (frame.method === 'initialize') {
                    return res.json({
                        jsonrpc: '2.0',
                        id: frame.id || 1,
                        result: {
                            protocolVersion: PROTOCOL_VERSION,
                            capabilities: {},
                            serverInfo: SERVER_INFO,
                            tools: [TOOL_DEF],
                            resources: [],
                        },
                    });
                }
                else if (frame.method === 'tools/list' || frame.type === 'tools.list') {
                    return res.json({
                        jsonrpc: '2.0',
                        id: frame.id || 1,
                        result: { tools: [TOOL_DEF], resources: [] },
                    });
                }
                else if (frame.method === 'tools/call' || frame.type === 'tools.invoke') {
                    const toolName = frame.params?.name || frame.tool;

                    if (toolName === 'quickitquote_search') {
                        const q = frame.params?.arguments?.q || '';
                        if (!q) {
                            return res.json({
                                jsonrpc: '2.0',
                                id: frame.id || 1,
                                error: { code: -1, message: 'q parameter required' },
                            });
                        } else {
                            try {
                                const url = `https://quickitquote.com/api/search?q=${encodeURIComponent(q)}`;
                                const r = await fetch(url);
                                const data = await r.json();
                                return res.json({
                                    jsonrpc: '2.0',
                                    id: frame.id || 1,
                                    result: data,
                                });
                            } catch (err) {
                                return res.json({
                                    jsonrpc: '2.0',
                                    id: frame.id || 1,
                                    error: { code: -1, message: err.message },
                                });
                            }
                        }
                    }
                }
            } catch (e) {
                // Ignore invalid JSON lines
            }
        }
        // Default fallback: list tools
        return res.json({ jsonrpc: '2.0', result: { tools: [TOOL_DEF], resources: [] } });
    } catch (err) {
        res.statusCode = 500;
        res.json({ error: err.message });
    }
};

router.get('/', handler);
router.options('/', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.status(204).end();
});
router.post('/', handler);

export default router;
