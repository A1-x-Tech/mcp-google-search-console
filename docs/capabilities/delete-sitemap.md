# Google Search Console: Delete a sitemap — MCP tool

**Google Search Console MCP tool:** Removes a sitemap from Search Console.

Technical name: `delete_sitemap`

## What task it solves

> I want to delete a sitemap.

Removes a sitemap from Search Console.

## When to use it

Use this capability when you need “Delete a sitemap” without doing the same work manually in the Google Search Console interface. It runs only when an AI client calls it.

## What to provide

- `site_url` — **required**. The property EXACTLY as registered in Search Console. Two formats: URL-prefix — a full URL with scheme and trailing slash, e.g. "https://example.com/" (http/https and www/non-www are different properties), or domain property — "sc-domain:example.com" (no scheme, no slash). A mismatched value returns 403/404; list_sites shows the exact registered values.
- `feedpath` — **required**. The full sitemap URL, e.g. "https://example.com/sitemap.xml".

## What it returns

Returns compact JSON from the upstream API or a clear MCP tool error. The exact fields depend on the operation and are documented in the technical reference.

## What changes in Google Search Console

The source marks the entire “Delete a sitemap” call as destructive. The exact effect depends on the selected action and is described below; review the parameters and reversibility before calling it.

## Example request

> Delete a sitemap in Google Search Console. Ask for any required identifiers that are missing. Show me the exact change and wait for confirmation first.

## Errors and limitations

This does not delete the file from the site, and Google may still discover it via robots.txt — it only removes the submission. Success is an empty API response (surfaced as { ok: true, deleted }). Requires the full webmasters OAuth scope.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Get one sitemap](./get-sitemap.md) — `get_sitemap`
- [List sitemaps](./list-sitemaps.md) — `list_sitemaps`
- [Submit a sitemap](./submit-sitemap.md) — `submit_sitemap`

## Technical details

- **Impact:** destructive operation
- **Group:** Sitemaps
- **Description source:** `delete_sitemap` registration in `src/tools/sitemaps.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
