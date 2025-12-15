import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

const TOOL_DEF = {
    name: 'quickitquote_search',
    description: 'Search QuickItQuote API',
    inputSchema: {
        type: 'object',
        properties: { q: { type: 'string', description: 'Search query' } },
        required: ['q'],
    },
};

// OPTIONS for CORS
router.options('/', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.status(204).end();
});

// GET - return server info and tools
router.get('/', (req, res) => {
    res.json({
        protocol: 'mcp/2024-11-05',
        capabilities: {
            tools: {}
        },
        serverInfo: {
            name: 'quickitquote-mcp',
            version: '1.0.0'
        },
        tools: [TOOL_DEF]
    });
});

// POST - handle JSON-RPC
router.post('/', express.json(), async (req, res) => {
    try {
        const { method, id, params } = req.body;

        // Initialize
        if (method === 'initialize') {
            return res.json({
                jsonrpc: '2.0',
                id,
                result: {
                    protocolVersion: '2024-11-05',
                    capabilities: { tools: {} },
                    serverInfo: { name: 'quickitquote-mcp', version: '1.0.0' }
                }
            });
        }

        // List tools
        if (method === 'tools/list') {
            return res.json({
                jsonrpc: '2.0',
                id,
                result: { tools: [TOOL_DEF] }
            });
        }

        // Call tool
        if (method === 'tools/call') {
            const { name, arguments: args } = params;

            if (name === 'quickitquote_search') {
                const q = args?.q;
                if (!q) {
                    return res.json({
                        jsonrpc: '2.0',
                        id,
                        error: { code: -32602, message: 'Missing parameter: q' }
                    });
                }

                const url = `https://quickitquote.com/api/search?q=${encodeURIComponent(q)}`;
                const response = await fetch(url);
                const data = await response.json();

                return res.json({
                    jsonrpc: '2.0',
                    id,
                    result: {
                        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
                    }
                });
            }

            return res.json({
                jsonrpc: '2.0',
                id,
                error: { code: -32601, message: `Tool not found: ${name}` }
            });
        }

        // Unknown method
        return res.json({
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Method not found: ${method}` }
        });

    } catch (err) {
        return res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32603, message: err.message }
        });
    }
});

export default router;
