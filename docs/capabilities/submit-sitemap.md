# Google Search Console: Submit a sitemap — MCP tool

**Google Search Console MCP tool:** Submits (or resubmits) a sitemap for the property.

Technical name: `submit_sitemap`

## What task it solves

> I want to submit a sitemap.

Submits (or resubmits) a sitemap for the property.

## When to use it

Use this capability when you need “Submit a sitemap” without doing the same work manually in the Google Search Console interface. It runs only when an AI client calls it.

## What to provide

- `site_url` — **required**. The property EXACTLY as registered in Search Console. Two formats: URL-prefix — a full URL with scheme and trailing slash, e.g. "https://example.com/" (http/https and www/non-www are different properties), or domain property — "sc-domain:example.com" (no scheme, no slash). A mismatched value returns 403/404; list_sites shows the exact registered values.
- `feedpath` — **required**. The full sitemap URL, e.g. "https://example.com/sitemap.xml".

## What it returns

Returns compact JSON from the upstream API or a clear MCP tool error. The exact fields depend on the operation and are documented in the technical reference.

## What changes in Google Search Console

The tool changes real Google Search Console data as described above. The server does not promise an automatic rollback.

## Example request

> Submit a sitemap in Google Search Console. Ask for any required identifiers that are missing.

## Errors and limitations

The feedpath must be the sitemap's full URL on the property. Success is an EMPTY API response (surfaced as { ok: true, submitted }); processing is asynchronous — check errors/warnings later with get_sitemap. Requires the full webmasters OAuth scope (readonly is not enough).

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Delete a sitemap](./delete-sitemap.md) — `delete_sitemap`
- [Get one sitemap](./get-sitemap.md) — `get_sitemap`
- [List sitemaps](./list-sitemaps.md) — `list_sitemaps`

## Technical details

- **Impact:** changes data
- **Group:** Sitemaps
- **Description source:** `submit_sitemap` registration in `src/tools/sitemaps.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
