import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GoogleSearchConsoleClient } from "../client.js";
import { DESTRUCTIVE, fail, feedpathSchema, ok, READ_ONLY, siteUrlSchema, WRITE } from "./util.js";

export function registerSitemapTools(server: McpServer, client: GoogleSearchConsoleClient): void {
  server.registerTool(
    "list_sitemaps",
    {
      title: "List sitemaps",
      annotations: READ_ONLY,
      description:
        "Lists the sitemaps submitted for a property (or, with sitemap_index, the children of a sitemap index file). Returns { sitemap: [WmxSitemap] } with per-sitemap path, lastSubmitted, lastDownloaded, isPending, isSitemapsIndex, type (sitemap/rssFeed/atomFeed/patternSitemap/urlList/notSitemap), warnings and errors counts, and contents[] with per-content-type submitted counts. The contents[].indexed field is deprecated and returns nothing useful — never present it as indexed pages.",
      inputSchema: {
        site_url: siteUrlSchema(),
        sitemap_index: z
          .string()
          .optional()
          .describe("URL of a sitemap index file — lists its child sitemaps instead of the property's own list."),
      },
    },
    async ({ site_url, sitemap_index }) => {
      try {
        return ok(await client.listSitemaps(site_url, sitemap_index));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "get_sitemap",
    {
      title: "Get one sitemap",
      annotations: READ_ONLY,
      description:
        "Returns one submitted sitemap's details (the same WmxSitemap shape as list_sitemaps): errors/warnings counts, isPending, lastSubmitted/lastDownloaded, and per-content-type submitted counts. Useful to check processing status after submit_sitemap.",
      inputSchema: { site_url: siteUrlSchema(), feedpath: feedpathSchema() },
    },
    async ({ site_url, feedpath }) => {
      try {
        return ok(await client.getSitemap(site_url, feedpath));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "submit_sitemap",
    {
      title: "Submit a sitemap",
      annotations: WRITE,
      description:
        "Submits (or resubmits) a sitemap for the property. The feedpath must be the sitemap's full URL on the property. Success is an EMPTY API response (surfaced as { ok: true, submitted }); processing is asynchronous — check errors/warnings later with get_sitemap. Requires the full webmasters OAuth scope (readonly is not enough).",
      inputSchema: { site_url: siteUrlSchema(), feedpath: feedpathSchema() },
    },
    async ({ site_url, feedpath }) => {
      try {
        return ok(await client.submitSitemap(site_url, feedpath));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "delete_sitemap",
    {
      title: "Delete a sitemap",
      annotations: DESTRUCTIVE,
      description:
        "Removes a sitemap from Search Console. This does not delete the file from the site, and Google may still discover it via robots.txt — it only removes the submission. Success is an empty API response (surfaced as { ok: true, deleted }). Requires the full webmasters OAuth scope.",
      inputSchema: { site_url: siteUrlSchema(), feedpath: feedpathSchema() },
    },
    async ({ site_url, feedpath }) => {
      try {
        return ok(await client.deleteSitemap(site_url, feedpath));
      } catch (e) {
        return fail(e);
      }
    },
  );
}
