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

// Simple JSON-RPC 2.0 handler for MCP with a plain GET tools listing for Agent Builder
const handler = async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    // Many clients (including Agent Builder) probe with a simple GET expecting a plain list of tools
    if (req.method === 'GET') {
        res.write(JSON.stringify({ tools: [TOOL_DEF], resources: [] }) + '\n');
        res.end();
        return;
    }

    let body = '';
    await new Promise((resolve) => {
        req.on('data', chunk => { body += chunk; });
        req.on('end', resolve);
    });

    try {
        if (!body || body.trim() === '') {
            // Empty request - return tool list directly in a simple shape
            res.write(JSON.stringify({ tools: [TOOL_DEF], resources: [] }) + '\n');
            res.end();
            return;
        }

        const lines = body.split('\n').filter(l => l.trim());

        for (const line of lines) {
            try {
                const frame = JSON.parse(line);

                if (frame.method === 'initialize') {
                    res.write(JSON.stringify({
                        jsonrpc: '2.0',
                        id: frame.id || 1,
                        result: {
                            protocolVersion: '2025-06-18',
                            capabilities: {},
                            serverInfo: { name: 'quickitquote-mcp', version: '1.0' },
                            tools: [TOOL_DEF],
                            resources: [],
                        },
                    }) + '\n');
                }
                else if (frame.method === 'tools/list' || frame.type === 'tools.list') {
                    res.write(JSON.stringify({
                        jsonrpc: '2.0',
                        id: frame.id || 1,
                        result: { tools: [TOOL_DEF], resources: [] },
                    }) + '\n');
                }
                else if (frame.method === 'tools/call' || frame.type === 'tools.invoke') {
                    const toolName = frame.params?.name || frame.tool;

                    if (toolName === 'quickitquote_search') {
                        const q = frame.params?.arguments?.q || '';
                        if (!q) {
                            res.write(JSON.stringify({
                                jsonrpc: '2.0',
                                id: frame.id || 1,
                                error: { code: -1, message: 'q parameter required' },
                            }) + '\n');
                        } else {
                            try {
                                const url = `https://quickitquote.com/api/search?q=${encodeURIComponent(q)}`;
                                const r = await fetch(url);
                                const data = await r.json();
                                res.write(JSON.stringify({
                                    jsonrpc: '2.0',
                                    id: frame.id || 1,
                                    result: data,
                                }) + '\n');
                            } catch (err) {
                                res.write(JSON.stringify({
                                    jsonrpc: '2.0',
                                    id: frame.id || 1,
                                    error: { code: -1, message: err.message },
                                }) + '\n');
                            }
                        }
                    }
                }
            } catch (e) {
                // Ignore invalid JSON lines
            }
        }
        res.end();
    } catch (err) {
        res.statusCode = 500;
        res.write(JSON.stringify({ error: err.message }));
        res.end();
    }
};

router.get('/', handler);
router.post('/', handler);

export default router;
