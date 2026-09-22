#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { EverythingClient, formatBytes } from "./everythingClient.js";
import { EverythingSearchInputSchema } from "./types.js";

const client = new EverythingClient();

const server = new McpServer({
  name: "everything-mcp-enhanced",
  version: "1.0.0"
});

server.tool(
  "everything_search",
  `Search Windows files and folders instantly via voidtools Everything index with millisecond latency.
Features:
- Ultra-fast millisecond-level response (5-30ms) across 10M+ indexed files, eliminating slow recursive terminal scans (dir /s, Get-ChildItem).
- Zero disk I/O thrashing (queries in-memory index directly).
- Supports dedicated 'path' parameter to scope into specific drive or folder (e.g. 'D:\\Projects').
- Built-in 'exclude_noise' filter (default: true) to eliminate node_modules/.git/.venv clutter.
- Token-saving 'compact' format (default: true, 1 line per file path) saving 75%+ tokens.
- Max count up to 5000 results without artificial hard 100-item cutoff.`,
  EverythingSearchInputSchema.shape,
  async (input) => {
    try {
      const searchResult = await client.search(input);
      const { totalResults, items, executedQuery, durationMs } = searchResult;

      const header = [
        `Everything Search: "${executedQuery}"`,
        `Total Matches: ${totalResults} | Returned: ${items.length} | Time: ${durationMs}ms`,
        ""
      ];

      let body = "";
      if (items.length === 0) {
        body = "No files or folders matched the query.";
      } else if (input.format === "detailed") {
        body = items
          .map((item, idx) => {
            const lines = [`${idx + 1}. ${item.fullPath}`, `   type: ${item.type}`];
            if (item.size !== undefined) {
              lines.push(`   size: ${formatBytes(item.size)} (${item.size} bytes)`);
            }
            if (item.dateModified) {
              lines.push(`   modified: ${item.dateModified}`);
            }
            return lines.join("\n");
          })
          .join("\n");
      } else {
        // Compact format (1 line per file path - default & token optimal)
        body = items.map((item, idx) => `${idx + 1}. ${item.fullPath}`).join("\n");
      }

      const text = header.join("\n") + body;

      return {
        content: [
          {
            type: "text",
            text
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `[Everything Search Error] ${error?.message || String(error)}\n\nTroubleshooting:\n1. Ensure Everything.exe is running.\n2. In Everything, check Tools -> Options -> HTTP Server, ensure 'Enable HTTP Server' is checked.\n3. Verify the port (default 8011 or 80).`
          }
        ],
        isError: true
      };
    }
  }
);

server.tool(
  "everything_health",
  "Check connectivity to local voidtools Everything HTTP server and report index statistics.",
  {},
  async () => {
    const health = await client.checkHealth();
    if (health.reachable) {
      return {
        content: [
          {
            type: "text",
            text: `Everything HTTP Server is ONLINE!\n- Base URL: ${health.baseUrl}\n- Total Indexed Items: ${health.totalIndexed?.toLocaleString() ?? "unknown"}\n- Response Latency: ${health.latencyMs}ms`
          }
        ]
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: `Everything HTTP Server is OFFLINE / Unreachable!\n- Base URL probed: ${health.baseUrl}\n- Error: ${health.error}\n- Latency: ${health.latencyMs}ms\n\nPlease check Everything (Tools -> Options -> HTTP Server) to ensure HTTP Server is enabled.`
          }
        ],
        isError: true
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error starting Everything MCP server:", err);
  process.exit(1);
});
