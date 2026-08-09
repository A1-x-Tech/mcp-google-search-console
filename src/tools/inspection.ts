import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GoogleSearchConsoleClient } from "../client.js";
import { fail, ok, READ_ONLY, siteUrlSchema } from "./util.js";

export function registerInspectionTools(server: McpServer, client: GoogleSearchConsoleClient): void {
  server.registerTool(
    "inspect_url",
    {
      title: "Inspect a URL's index status",
      annotations: READ_ONLY,
      description:
        "Inspects a URL's status in the Google index (URL Inspection API). Returns { inspectionResult } with: inspectionResultLink (the Search Console UI page for this inspection); indexStatusResult — verdict (PASS/PARTIAL/FAIL/NEUTRAL), human-readable coverageState (e.g. \"Submitted and indexed\"), robotsTxtState (ALLOWED/DISALLOWED), indexingState, lastCrawlTime, pageFetchState (SUCCESSFUL/SOFT_404/NOT_FOUND/SERVER_ERROR/...), googleCanonical vs userCanonical, sitemap[], referringUrls[], crawledAs (DESKTOP/MOBILE); plus ampResult and richResultsResult (with per-item issues and severities) when applicable. Only the status of the version already in the Google index is returned — this is NOT a live test. mobileUsabilityResult may still appear in responses but the product is retired — ignore it. QUOTA WARNING: only 2,000 inspections per property per DAY (and 600/minute) — throttle any batch inspection and expect 429/403 rateLimitExceeded beyond that.",
      inputSchema: {
        inspection_url: z
          .string()
          .min(1)
          .describe("The fully-qualified URL to inspect. It must belong to the property given in site_url."),
        site_url: siteUrlSchema(),
        language_code: z
          .string()
          .optional()
          .describe('IETF BCP-47 language for the human-readable issue messages, e.g. "en-US" (the default).'),
      },
    },
    async ({ inspection_url, site_url, language_code }) => {
      try {
        return ok(
          await client.inspectUrl({
            inspectionUrl: inspection_url,
            siteUrl: site_url,
            languageCode: language_code,
          }),
        );
      } catch (e) {
        return fail(e);
      }
    },
  );
}
