# Google Search Console: Search Analytics (performance) query — MCP tool

**Google Search Console MCP tool:** Runs a Search Analytics (performance) query for a property: clicks, impressions, CTR and average position from Google Search, grouped by the requested dimensions.

Technical name: `search_analytics`

## What task it solves

> I want to search Analytics (performance) query.

Runs a Search Analytics (performance) query for a property: clicks, impressions, CTR and average position from Google Search, grouped by the requested dimensions.

## When to use it

Use this capability when you need “Search Analytics (performance) query” without doing the same work manually in the Google Search Console interface. It runs only when an AI client calls it.

## What to provide

- `site_url` — **required**. The property EXACTLY as registered in Search Console. Two formats: URL-prefix — a full URL with scheme and trailing slash, e.g. "https://example.com/" (http/https and www/non-www are different properties), or domain property — "sc-domain:example.com" (no scheme, no slash). A mismatched value returns 403/404; list_sites shows the exact registered values.
- `start_date` — **required**. First date of the range, YYYY-MM-DD, Pacific Time.
- `end_date` — **required**. Last date of the range, YYYY-MM-DD, Pacific Time, inclusive.
- `dimensions` — **optional**. How to group rows; keys[] in each row follows this order. "country" values are ISO 3166-1 alpha-3 codes, "device" is DESKTOP/MOBILE/TABLET, "hour" requires data_state "hourly_all". Omit for one totals row.
- `search_type` — **optional**. Which search surface to report: "web" (default), "image", "video", "news" (News tab of search), "discover" (Discover feed), "googleNews" (news.google.com and the app). discover/googleNews support a reduced dimension set — an unsupported combination returns the API's 400 verbatim.
- `filters` — **optional**. Row filters, ALL combined with AND — the API has no OR across filters (run separate queries instead).
- `aggregation_type` — **optional**. How metrics are aggregated: "auto" (default) lets the API decide, "byPage"/"byProperty" force it, "byNewsShowcasePanel" is for News Showcase. Affects how clicks/impressions are counted, not which rows exist.
- `row_limit` — **optional**. Max rows to return (1..25000; API default 1000).
- `start_row` — **optional**. 0-based row offset for pagination (default 0). A response with no rows means the end.
- `data_state` — **optional**. "final" (default) — only finalized data; "all" — include fresh data still subject to change; "hourly_all" — required when grouping by hour (recent data only).

## What it returns

Returns compact JSON from the upstream API or a clear MCP tool error. The exact fields depend on the operation and are documented in the technical reference.

## What changes in Google Search Console

The tool reads Google Search Console data and does not change it.

## Example request

> Search Analytics (performance) query in Google Search Console. Ask for any required identifiers that are missing.

## Errors and limitations

Each returned row has keys[] (one value per requested dimension, in the same order) plus clicks, impressions, ctr (a FRACTION 0..1, not a percent) and position; rows are sorted by clicks descending. With no dimensions you get one totals row for the range. Dates are calendar dates in Pacific Time and end_date is INCLUSIVE; final data lags ~2-3 days behind (use data_state "all" for fresh, still-changing rows). Pagination: there is no page token — repeat with start_row increased by row_limit until a response comes back with no rows. When grouping by query/page some anonymized long-tail data is never returned, so summed rows will not match a dimensionless totals query. Quota: 1,200 queries/minute per site and per user.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Top search queries](./get-top-queries.md) — `get_top_queries`

## Technical details

- **Impact:** read-only
- **Group:** Search analytics
- **Description source:** `search_analytics` registration in `src/tools/analytics.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
