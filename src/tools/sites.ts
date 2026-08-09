import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GoogleSearchConsoleClient } from "../client.js";
import { DESTRUCTIVE, fail, ok, READ_ONLY, siteUrlSchema, WRITE } from "./util.js";

export function registerSiteTools(server: McpServer, client: GoogleSearchConsoleClient): void {
  server.registerTool(
    "list_sites",
    {
      title: "List Search Console properties",
      annotations: READ_ONLY,
      description:
        'Lists every Search Console property the authenticated account can access. Returns { siteEntry: [{ siteUrl, permissionLevel }] } where siteUrl is either a URL-prefix property ("https://example.com/") or a domain property ("sc-domain:example.com"), and permissionLevel is siteOwner, siteFullUser, siteRestrictedUser or siteUnverifiedUser. Call this FIRST: every other tool needs the siteUrl exactly as returned here — a near-match (missing trailing slash, wrong scheme, www vs non-www) is a different property and returns 403/404.',
      inputSchema: {},
    },
    async () => {
      try {
        return ok(await client.listSites());
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "get_site",
    {
      title: "Get one property",
      annotations: READ_ONLY,
      description:
        "Returns one property's entry: { siteUrl, permissionLevel }. A 404 means the value does not match any registered property — check the exact format (trailing slash, scheme, sc-domain: prefix) against list_sites output.",
      inputSchema: { site_url: siteUrlSchema() },
    },
    async ({ site_url }) => {
      try {
        return ok(await client.getSite(site_url));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "add_site",
    {
      title: "Add a property",
      annotations: WRITE,
      description:
        'Adds a property to the account\'s Search Console set. The property starts UNVERIFIED (permissionLevel siteUnverifiedUser) and most data calls will return 403 until it is verified — verification happens through the Search Console UI or the separate Site Verification API, not through this API. Success is an empty API response (surfaced as { ok: true, added }). Requires the full webmasters OAuth scope (the readonly scope cannot mutate).',
      inputSchema: { site_url: siteUrlSchema() },
    },
    async ({ site_url }) => {
      try {
        return ok(await client.addSite(site_url));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "delete_site",
    {
      title: "Remove a property",
      annotations: DESTRUCTIVE,
      description:
        "Removes (unlinks) a property from the account's Search Console set. No data is deleted and other owners keep their access — this only removes the property from THIS account's list; it can be re-added later. Success is an empty API response (surfaced as { ok: true, removed }). Requires the full webmasters OAuth scope.",
      inputSchema: { site_url: siteUrlSchema() },
    },
    async ({ site_url }) => {
      try {
        return ok(await client.deleteSite(site_url));
      } catch (e) {
        return fail(e);
      }
    },
  );
}
