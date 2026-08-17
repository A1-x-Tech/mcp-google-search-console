# Google Search Console: Get one sitemap — MCP tool

**Google Search Console MCP tool:** Returns one submitted sitemap's details (the same WmxSitemap shape as list_sitemaps): errors/warnings counts, isPending, lastSubmitted/lastDownloaded, and per-content-type submitted counts.

Technical name: `get_sitemap`

## What task it solves

> I want to get one sitemap.

Returns one submitted sitemap's details (the same WmxSitemap shape as list_sitemaps): errors/warnings counts, isPending, lastSubmitted/lastDownloaded, and per-content-type submitted counts.

## When to use it

Use this capability when you need “Get one sitemap” without doing the same work manually in the Google Search Console interface. It runs only when an AI client calls it.

## What to provide

- `site_url` — **required**. The property EXACTLY as registered in Search Console. Two formats: URL-prefix — a full URL with scheme and trailing slash, e.g. "https://example.com/" (http/https and www/non-www are different properties), or domain property — "sc-domain:example.com" (no scheme, no slash). A mismatched value returns 403/404; list_sites shows the exact registered values.
- `feedpath` — **required**. The full sitemap URL, e.g. "https://example.com/sitemap.xml".

## What it returns

Returns one submitted sitemap's details (the same WmxSitemap shape as list_sitemaps): errors/warnings counts, isPending, lastSubmitted/lastDownloaded, and per-content-type submitted counts.

## What changes in Google Search Console

The tool reads Google Search Console data and does not change it.

## Example request

> Get one sitemap in Google Search Console. Ask for any required identifiers that are missing.

## Errors and limitations

Useful to check processing status after submit_sitemap.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Delete a sitemap](./delete-sitemap.md) — `delete_sitemap`
- [List sitemaps](./list-sitemaps.md) — `list_sitemaps`
- [Submit a sitemap](./submit-sitemap.md) — `submit_sitemap`

## Technical details

- **Impact:** read-only
- **Group:** Sitemaps
- **Description source:** `get_sitemap` registration in `src/tools/sitemaps.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
