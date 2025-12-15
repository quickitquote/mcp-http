import { createMcpHandler } from 'mcp-handler';
import fetch from 'node-fetch';
import { z } from 'zod';

// Define MCP server with a single tool that calls our HTTP search endpoint
const handler = createMcpHandler(
    (server) => {
        server.tool(
            'quickitquote_search',
            'Perform QuickItQuote search via mcp-http endpoint',
            { q: z.string().min(1) },
            async ({ q }) => {
                const base = process.env.SEARCH_BASE_URL || 'https://quickitquote.com';
                const url = `${base}/api/search?q=${encodeURIComponent(q)}`;
                const r = await fetch(url, { method: 'GET' });
                if (!r.ok) {
                    return {
                        content: [
                            { type: 'text', text: `Upstream error ${r.status}` },
                        ],
                        isError: true,
                    };
                }
                const data = await r.json();
                return {
                    content: [
                        { type: 'json', text: JSON.stringify(data) },
                    ],
                };
            },
        );
    },
    {},
    { basePath: '/api' },
);

export { handler as DELETE, handler as GET, handler as POST };

