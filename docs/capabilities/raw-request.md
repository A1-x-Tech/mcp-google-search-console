# Google Search Console: Raw Search Console API call — MCP tool

**Google Search Console MCP tool:** Escape hatch to call any Google Search Console API path directly, for requests the typed tools don't cover.

Technical name: `raw_request`

## What task it solves

> I want to raw Search Console API call.

Escape hatch to call any Google Search Console API path directly, for requests the typed tools don't cover.

## When to use it

Use this capability when you need “Raw Search Console API call” without doing the same work manually in the Google Search Console interface. It runs only when an AI client calls it.

## What to provide

- `path` — **required**. API path relative to https://searchconsole.googleapis.com, e.g. "webmasters/v3/sites" or "v1/urlInspection/index:inspect".
- `method` — **optional**. HTTP method (the Search Console API uses only these four). Defaults to GET.
- `body` — **optional**. JSON request body (POST only; PUT endpoints here take no body).

## What it returns

Returns compact JSON from the upstream API or a clear MCP tool error. The exact fields depend on the operation and are documented in the technical reference.

## What changes in Google Search Console

The source marks the entire “Raw Search Console API call” call as destructive. The exact effect depends on the selected action and is described below; review the parameters and reversibility before calling it.

## Example request

> Raw Search Console API call in Google Search Console. Ask for any required identifiers that are missing. Show me the exact change and wait for confirmation first.

## Errors and limitations

Two surfaces share the host: "webmasters/v3/..." (sites, sitemaps, searchAnalytics) and "v1/..." (urlInspection). siteUrl and feedpath are PATH SEGMENTS and must be URL-encoded (encodeURIComponent), e.g. "webmasters/v3/sites/sc-domain%3Aexample.com/sitemaps". The path may carry a query string. The Bearer token is added automatically; the method defaults to GET. Note: sites.add and sitemaps.submit are PUT with no body and return an empty response on success.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

There are no other dedicated tools in this group.

## Technical details

- **Impact:** destructive operation
- **Group:** Additional API methods
- **Description source:** `raw_request` registration in `src/tools/raw.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
