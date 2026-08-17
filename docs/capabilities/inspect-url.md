# Google Search Console: Inspect a URL's index status — MCP tool

**Google Search Console MCP tool:** Inspects a URL's status in the Google index (URL Inspection API).

Technical name: `inspect_url`

## What task it solves

> I want to inspect a URL's index status.

Inspects a URL's status in the Google index (URL Inspection API).

## When to use it

Use this capability when you need “Inspect a URL's index status” without doing the same work manually in the Google Search Console interface. It runs only when an AI client calls it.

## What to provide

- `inspection_url` — **required**. The fully-qualified URL to inspect. It must belong to the property given in site_url.
- `site_url` — **required**. The property EXACTLY as registered in Search Console. Two formats: URL-prefix — a full URL with scheme and trailing slash, e.g. "https://example.com/" (http/https and www/non-www are different properties), or domain property — "sc-domain:example.com" (no scheme, no slash). A mismatched value returns 403/404; list_sites shows the exact registered values.
- `language_code` — **optional**. IETF BCP-47 language for the human-readable issue messages, e.g. "en-US" (the default).

## What it returns

Returns { inspectionResult } with: inspectionResultLink (the Search Console UI page for this inspection); indexStatusResult — verdict (PASS/PARTIAL/FAIL/NEUTRAL), human-readable coverageState (e.g.

## What changes in Google Search Console

The tool reads Google Search Console data and does not change it.

## Example request

> Inspect a URL's index status in Google Search Console. Ask for any required identifiers that are missing.

## Errors and limitations

"Submitted and indexed"), robotsTxtState (ALLOWED/DISALLOWED), indexingState, lastCrawlTime, pageFetchState (SUCCESSFUL/SOFT_404/NOT_FOUND/SERVER_ERROR/...), googleCanonical vs userCanonical, sitemap[], referringUrls[], crawledAs (DESKTOP/MOBILE); plus ampResult and richResultsResult (with per-item issues and severities) when applicable. Only the status of the version already in the Google index is returned — this is NOT a live test. mobileUsabilityResult may still appear in responses but the product is retired — ignore it. QUOTA WARNING: only 2,000 inspections per property per DAY (and 600/minute) — throttle any batch inspection and expect 429/403 rateLimitExceeded beyond that.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

There are no other dedicated tools in this group.

## Technical details

- **Impact:** read-only
- **Group:** URL inspection
- **Description source:** `inspect_url` registration in `src/tools/inspection.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
