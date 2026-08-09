# Tools

The Google Search Console API is mostly reads plus a few idempotent mutations,
so every tool carries explicit MCP annotations: reads are `readOnlyHint`,
`add_site`/`submit_sitemap` are non-destructive idempotent writes,
`delete_site`/`delete_sitemap` are destructive. The client handles OAuth
entirely on its own and URL-encodes `site_url`/`feedpath` path segments — tools
pass user values through raw.

`site_url` must match the property **exactly** as registered in Search Console:
either a URL-prefix property (`https://example.com/` — scheme and trailing
slash included; http/https and www/non-www are different properties) or a
domain property (`sc-domain:example.com`). `list_sites` is the source of truth.

## Sites

| Tool | Description |
|---|---|
| `list_sites` | All properties the account can access: `{ siteEntry: [{ siteUrl, permissionLevel }] }`. Permission levels: `siteOwner`, `siteFullUser`, `siteRestrictedUser`, `siteUnverifiedUser`. Call it first — every other tool needs the exact `siteUrl` from here. |
| `get_site` | One property's `{ siteUrl, permissionLevel }`. A 404 means the format didn't match (trailing slash, scheme, `sc-domain:` prefix). |
| `add_site` | Adds a property. It starts **unverified** and most data calls 403 until verified (Search Console UI / Site Verification API — not this API). Empty API response → `{ ok: true, added }`. |
| `delete_site` | Unlinks a property from this account. No data is deleted; other owners keep access. Empty API response → `{ ok: true, removed }`. |

## Sitemaps

| Tool | Description |
|---|---|
| `list_sitemaps` | Submitted sitemaps for a property, or children of an index via `sitemap_index`. Each `WmxSitemap`: `path`, `lastSubmitted`, `lastDownloaded`, `isPending`, `isSitemapsIndex`, `type`, `warnings`/`errors` counts, `contents[]` with per-type `submitted` counts. `contents[].indexed` is **deprecated** — never surface it. |
| `get_sitemap` | One sitemap's `WmxSitemap` — check processing status after a submit. |
| `submit_sitemap` | Submits/resubmits a sitemap. The API call is **PUT with no request body** and an **empty response** on success (`{ ok: true, submitted }` here); processing is async. Requires the full `webmasters` scope. |
| `delete_sitemap` | Removes the submission (not the file; Google may still crawl it via robots.txt). Empty response → `{ ok: true, deleted }`. |

## Search Analytics

| Tool | Description |
|---|---|
| `search_analytics` | `POST .../searchAnalytics/query`. Inputs: `start_date`/`end_date` (YYYY-MM-DD, **Pacific Time**, end inclusive), `dimensions` (`date`, `query`, `page`, `country`, `device`, `searchAppearance`, `hour`), `search_type` (`web` default, `image`, `video`, `news`, `discover`, `googleNews`), `filters` (AND-only; operators `equals`, `notEquals`, `contains`, `notContains`, `includingRegex`, `excludingRegex` — RE2), `aggregation_type` (`auto`/`byPage`/`byProperty`/`byNewsShowcasePanel`), `row_limit` (≤25000), `start_row`, `data_state` (`final`/`all`/`hourly_all`). Rows: `keys[]` (mirrors the dimensions order) + `clicks`, `impressions`, `ctr` (fraction 0..1), `position`; sorted by clicks desc. |
| `get_top_queries` | Convenience wrapper over the same endpoint: groups by `query`, sorted by clicks desc. Inputs: `site_url`, `start_date`/`end_date`, `limit` (default 100), optional `page_filter` (page URL contains), `country` (alpha-3), `device` (`DESKTOP`/`MOBILE`/`TABLET`). For anything fancier use `search_analytics`. |

Search-analytics notes:

- Final data lags ~2–3 days; `data_state: "all"` includes fresh rows that may
  change on re-query. The `hour` dimension needs `data_state: "hourly_all"`.
- Pagination has no page token: loop `start_row += row_limit` until a response
  has no `rows`. Grouping by `query`/`page` drops anonymized long-tail data, so
  summed rows won't equal a dimensionless totals query.
- `discover`/`googleNews` types support a reduced dimension set that Google does
  not fully document — the server passes the API's 400 through verbatim.

## URL Inspection

| Tool | Description |
|---|---|
| `inspect_url` | `POST v1/urlInspection/index:inspect` with `{ inspection_url, site_url, language_code? }`. Returns `inspectionResult`: `inspectionResultLink`, `indexStatusResult` (verdict `PASS`/`PARTIAL`/`FAIL`/`NEUTRAL`, `coverageState`, `robotsTxtState`, `indexingState`, `lastCrawlTime`, `pageFetchState`, `googleCanonical`/`userCanonical`, `sitemap[]`, `referringUrls[]`, `crawledAs`), plus `ampResult` and `richResultsResult` when applicable. Index status only — **not** a live test. `mobileUsabilityResult` is deprecated (product retired). **Quota: 2,000/day and 600/minute per property** — throttle batch inspections. |

## Escape hatch

| Tool | Description |
|---|---|
| `raw_request` | Calls any Search Console API path directly (`GET`/`POST`/`PUT`/`DELETE`, default GET). Both surfaces share the host: `webmasters/v3/...` and `v1/...`. `siteUrl`/`feedpath` are path segments — URL-encode them (`sc-domain%3Aexample.com`). A path resolving to a foreign origin is rejected (SSRF guard), so the Bearer token never leaves `searchconsole.googleapis.com`. |

## Notes

- **Retry policy:** 429 is retried with backoff for every method (the request was rejected
  before executing); 5xx and network errors are retried **only for GET**. 403
  `quotaExceeded` (daily limits) is never retried — the quota won't recover within a backoff.
- **OAuth:** access tokens are minted from the refresh token automatically, cached until ~60s
  before expiry, and re-minted once on a 401. Mutations (`add_site`, `delete_site`,
  `submit_sitemap`, `delete_sitemap`) need the full `webmasters` scope; reads accept
  `webmasters.readonly` too.
- **Quotas** (per Google's published limits): search analytics 1,200 QPM per site and per
  user; URL inspection 600 QPM / 2,000 QPD per site; other resources 20 QPS / 200 QPM per
  user. Quota breaches surface as 403 `quotaExceeded` / 429 `rateLimitExceeded` with the
  reason included in the error message.

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GOOGLE_SEARCH_CONSOLE_CLIENT_ID` | yes* | — | OAuth2 client id (refresh flow). |
| `GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET` | yes* | — | OAuth2 client secret (refresh flow). Secret. |
| `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN` | yes* | — | OAuth2 refresh token (refresh flow). Secret. |
| `GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN` | yes* | — | Alternative: static access token (~1 h lifetime). Secret. |
| `GOOGLE_SEARCH_CONSOLE_API_BASE` | no | `https://searchconsole.googleapis.com` | API root override. |
| `GOOGLE_SEARCH_CONSOLE_TIMEOUT_MS` | no | `60000` | Per-request timeout, ms. |
| `GOOGLE_SEARCH_CONSOLE_MAX_RETRIES` | no | `3` | Retries on transient errors. |

\* Either the refresh triple together, or the static access token.
