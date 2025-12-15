# QuickItQuote MCP HTTP Server

MCP (Model Context Protocol) HTTP endpoint للبحث في QuickItQuote API - جاهز للاستخدام في OpenAI Agent Builder.

## 🚀 Production URL

```
https://mcp-http-40yqfq3d0-qiq1.vercel.app/api/mcp
```

## 📋 استخدام في Agent Builder

### الخطوات:
1. افتح Agent Builder في OpenAI Platform
2. اضغط **Tools** → **MCP** → **Add MCP Server**
3. ألصق الرابط: `https://mcp-http-40yqfq3d0-qiq1.vercel.app/api/mcp`
4. الأداة `quickitquote_search` ستكون متاحة للـ Agent

### الأداة المتاحة:
- **Name:** `quickitquote_search`
- **Description:** Search QuickItQuote API
- **Parameters:** `q` (string) - Search query
- **Example:** "ابحث عن python"

## 🧪 اختبار

### Test Page
**https://mcp-http-40yqfq3d0-qiq1.vercel.app/test.html**

### API Endpoints

- `GET /api/health` — Health check
- `GET /api/search?q=<query>` — Direct QuickItQuote search proxy
- `GET /api/mcp` — MCP server info & tools list
- `POST /api/mcp` — MCP JSON-RPC endpoint (initialize, tools/list, tools/call)

## 🔧 MCP Protocol Details

**Protocol Version:** `mcp/2024-11-05`  
**Transport:** Plain HTTP with JSON (not SSE)  
**Format:** JSON-RPC 2.0

### Supported Methods:
```json
// 1. Initialize
POST /api/mcp
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {}
}

// 2. List Tools
POST /api/mcp
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}

// 3. Call Tool
POST /api/mcp
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "quickitquote_search",
    "arguments": { "q": "search term" }
  }
}
```

## 💻 Local Development

```bash
# Install dependencies
npm install

# Run locally
npm start
# Opens at http://localhost:3000

# Test locally
curl http://localhost:3000/api/search?q=test
```

## 🚀 Deploy to Vercel

```bash
# Deploy to production
npx vercel --prod

# Your endpoint will be:
# https://your-project.vercel.app/api/mcp
```

## 📁 Project Structure

```
mcp-http/
├── src/
│   ├── server.js       # Main Express app
│   ├── mcp-plain.js    # MCP endpoint handler (current)
│   ├── mcp-sse.js      # SSE version (deprecated)
│   └── mcp-minimal-v2.js # Previous version
├── vercel.json         # Vercel config
├── package.json        # Dependencies
└── README.md          # Documentation
```

## 🔐 CORS & Security

- CORS enabled for all origins (`*`) 
- No authentication required
- Suitable for public MCP endpoints

## 📊 Monitoring

- **Vercel Dashboard:** https://vercel.com/qiq1/mcp-http
- **GitHub Repo:** https://github.com/quickitquote/mcp-http

## 📖 References

- [Model Context Protocol](https://modelcontextprotocol.io)
- [OpenAI Agent Builder](https://platform.openai.com/docs/guides/agent-builder)
- [QuickItQuote API](https://quickitquote.com)
