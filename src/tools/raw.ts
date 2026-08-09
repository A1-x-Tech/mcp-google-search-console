import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GoogleSearchConsoleClient, HttpMethod } from "../client.js";
import { fail, ok, RAW } from "./util.js";

export function registerRawTool(server: McpServer, client: GoogleSearchConsoleClient): void {
  server.registerTool(
    "raw_request",
    {
      title: "Raw Search Console API call",
      // Arbitrary method/path incl. DELETE — annotate for the worst case a call
      // can do, not the average.
      annotations: RAW,
      description:
        'Escape hatch to call any Google Search Console API path directly, for requests the typed tools don\'t cover. Two surfaces share the host: "webmasters/v3/..." (sites, sitemaps, searchAnalytics) and "v1/..." (urlInspection). siteUrl and feedpath are PATH SEGMENTS and must be URL-encoded (encodeURIComponent), e.g. "webmasters/v3/sites/sc-domain%3Aexample.com/sitemaps". The path may carry a query string. The Bearer token is added automatically; the method defaults to GET. Note: sites.add and sitemaps.submit are PUT with no body and return an empty response on success.',
      inputSchema: {
        path: z
          .string()
          .min(1)
          .describe(
            'API path relative to https://searchconsole.googleapis.com, e.g. "webmasters/v3/sites" or "v1/urlInspection/index:inspect".',
          ),
        method: z
          .enum(["GET", "POST", "PUT", "DELETE"])
          .optional()
          .describe("HTTP method (the Search Console API uses only these four). Defaults to GET."),
        body: z.record(z.any()).optional().describe("JSON request body (POST only; PUT endpoints here take no body)."),
      },
    },
    async ({ path, method, body }) => {
      try {
        const m = (method ?? "GET") as HttpMethod;
        return ok((await client.request(m, path, body)) ?? { ok: true });
      } catch (e) {
        return fail(e);
      }
    },
  );
}
