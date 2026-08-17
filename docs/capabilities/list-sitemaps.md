# Google Search Console: List sitemaps — MCP tool

**Google Search Console MCP tool:** Lists the sitemaps submitted for a property (or, with sitemap_index, the children of a sitemap index file).

Technical name: `list_sitemaps`

## What task it solves

> I want to list sitemaps.

Lists the sitemaps submitted for a property (or, with sitemap_index, the children of a sitemap index file).

## When to use it

Use this capability when you need “List sitemaps” without doing the same work manually in the Google Search Console interface. It runs only when an AI client calls it.

## What to provide

- `site_url` — **required**. The property EXACTLY as registered in Search Console. Two formats: URL-prefix — a full URL with scheme and trailing slash, e.g. "https://example.com/" (http/https and www/non-www are different properties), or domain property — "sc-domain:example.com" (no scheme, no slash). A mismatched value returns 403/404; list_sites shows the exact registered values.
- `sitemap_index` — **optional**. URL of a sitemap index file — lists its child sitemaps instead of the property's own list.

## What it returns

Returns { sitemap: [WmxSitemap] } with per-sitemap path, lastSubmitted, lastDownloaded, isPending, isSitemapsIndex, type (sitemap/rssFeed/atomFeed/patternSitemap/urlList/notSitemap), warnings and errors counts, and contents[] with per-content-type submitted counts.

## What changes in Google Search Console

The tool reads Google Search Console data and does not change it.

## Example request

> List sitemaps in Google Search Console. Ask for any required identifiers that are missing.

## Errors and limitations

The contents[].indexed field is deprecated and returns nothing useful — never present it as indexed pages.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Delete a sitemap](./delete-sitemap.md) — `delete_sitemap`
- [Get one sitemap](./get-sitemap.md) — `get_sitemap`
- [Submit a sitemap](./submit-sitemap.md) — `submit_sitemap`

## Technical details

- **Impact:** read-only
- **Group:** Sitemaps
- **Description source:** `list_sitemaps` registration in `src/tools/sitemaps.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
