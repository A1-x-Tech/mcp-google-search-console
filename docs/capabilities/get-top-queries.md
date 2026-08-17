# Google Search Console: Top search queries — MCP tool

**Google Search Console MCP tool:** Convenience wrapper over search_analytics for the most common ask: the top search queries for a property, sorted by clicks descending (the API's default order).

Technical name: `get_top_queries`

## What task it solves

> I want to top search queries.

Convenience wrapper over search_analytics for the most common ask: the top search queries for a property, sorted by clicks descending (the API's default order).

## When to use it

Use this capability when you need “Top search queries” without doing the same work manually in the Google Search Console interface. It runs only when an AI client calls it.

## What to provide

- `site_url` — **required**. The property EXACTLY as registered in Search Console. Two formats: URL-prefix — a full URL with scheme and trailing slash, e.g. "https://example.com/" (http/https and www/non-www are different properties), or domain property — "sc-domain:example.com" (no scheme, no slash). A mismatched value returns 403/404; list_sites shows the exact registered values.
- `start_date` — **required**. First date of the range, YYYY-MM-DD, Pacific Time.
- `end_date` — **required**. Last date of the range, YYYY-MM-DD, Pacific Time, inclusive.
- `limit` — **optional**. How many top queries to return (1..25000; default 100).
- `page_filter` — **optional**. Only count traffic to pages whose URL CONTAINS this substring, e.g. "/blog/".
- `country` — **optional**. Only count traffic from this country — ISO 3166-1 alpha-3 code, e.g. "usa".
- `device` — **optional**. Only count traffic from this device class.

## What it returns

Returns compact JSON from the upstream API or a clear MCP tool error. The exact fields depend on the operation and are documented in the technical reference.

## What changes in Google Search Console

The tool reads Google Search Console data and does not change it.

## Example request

> Top search queries in Google Search Console. Ask for any required identifiers that are missing.

## Errors and limitations

Each row has keys[0] = the query string plus clicks, impressions, ctr (a FRACTION 0..1) and position. Dates are calendar dates in Pacific Time, end_date inclusive; final data lags ~2-3 days. Anonymized long-tail queries are never returned. Same endpoint and quota as search_analytics — use search_analytics directly for other dimensions, pagination, fresh data or regex filters.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Search Analytics (performance) query](./search-analytics.md) — `search_analytics`

## Technical details

- **Impact:** read-only
- **Group:** Search analytics
- **Description source:** `get_top_queries` registration in `src/tools/analytics.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
