# mcp-http

A minimal HTTP-only search proxy to integrate with OpenAI Agent Builder without MCP. It forwards queries to QuickItQuote and returns normalized JSON.

## Endpoints

- `GET /api/health` — simple health check
- `GET /api/search?q=<query>` — proxies to `https://quickitquote.com/api/search?q=<query>` and returns normalized JSON
- `GET/POST /api/mcp` — MCP server endpoint providing a tool `quickitquote_search` (input: `{ q: string }`) that calls `/api/search`

## Local run

```bash
# Node 18+
npm install
npm run dev
# Open http://localhost:3000/api/search?q=test
```

## Environment

Create a `.env` (already provided) and set optional values:

- `AUTH_TOKEN` (optional): if you want to secure access later. Not enforced yet.
- `SEARCH_BASE_URL` (optional): override base URL used by MCP tool (default https://mcp-http.vercel.app)

## Deploy (Optional: Vercel)

You can deploy this project to Vercel. Provide Authorization metadata if needed to integrate with Agent Builder or OAuth later.

When deployed on Vercel, the app exports the Express instance for serverless. Your production endpoints will look like:

- `https://<your-vercel-domain>/api/health`
- `https://<your-vercel-domain>/api/search?q=test`
- `https://<your-vercel-domain>/api/mcp`

## GitHub

Please create a GitHub repository named `mcp-http` and share the remote URL so we can push from this workspace.
