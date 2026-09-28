import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"
import { McpAuthError, requireMcpAuth } from "@/lib/mcp/auth"
import { registerMcpTools } from "@/lib/mcp/tools"
import { orgSessionStore } from "@/lib/server/session"

function createMcpServer() {
  const server = new McpServer({
    name: "project-one",
    version: "1.0.0",
  })
  registerMcpTools(server)
  return server
}

/**
 * Streamable HTTP MCP endpoint handler.
 *
 * Cursor mcp.json example:
 * ```json
 * {
 *   "mcpServers": {
 *     "project-one": {
 *       "url": "http://localhost:3000/api/mcp",
 *       "headers": {
 *         "x-api-key": "<key from authClient.apiKey.create>",
 *         "x-organization-id": "<org id>"
 *       }
 *     }
 *   }
 * }
 * ```
 */
export async function handleMcpRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Accept, Authorization, x-api-key, x-organization-id, mcp-session-id",
      },
    })
  }

  try {
    const ctx = await requireMcpAuth(request)

    return await orgSessionStore.run(ctx, async () => {
      const server = createMcpServer()
      const transport = new WebStandardStreamableHTTPServerTransport({
        // Stateless: works on serverless / multi-instance.
        sessionIdGenerator: undefined,
      })
      await server.connect(transport)
      return transport.handleRequest(request)
    })
  } catch (err) {
    if (err instanceof McpAuthError) {
      return Response.json(
        { error: err.message },
        {
          status: err.status,
          headers: { "Content-Type": "application/json" },
        }
      )
    }
    const message = err instanceof Error ? err.message : "MCP handler failed"
    return Response.json({ error: message }, { status: 500 })
  }
}
