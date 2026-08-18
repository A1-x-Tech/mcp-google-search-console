# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and the project adheres to [Semantic Versioning](https://semver.org/).

## [1.1.0] — 2026-08-19

### Changed

- **The server no longer exits because of configuration.** Missing credentials are a
  survivable state: the server starts, completes the MCP handshake, serves the full tool list
  and opens the `initialize` instructions with the fix (which variables to set, and that the
  server must be restarted afterwards — credentials are read from the environment only at
  startup). The first tool call then fails with that same actionable message instead of the
  client showing a dead server with no reason. A malformed setup (a partial refresh triple)
  still reports `incomplete_oauth_config`, but degrades the same way — its message is carried
  into the instructions — instead of killing the process before the handshake.

### Added

- Telemetry event `unconfigured_start` (with the same closed reason vocabulary): a server
  without credentials now survives to the MCP handshake, so a degraded start is counted
  separately instead of inflating `server_start` or dying as `startup_failed`.

## [1.0.1] — 2026-08-12

### Added

- Server instructions. The MCP `initialize` response now carries a short briefing for the calling
  model: what this API is and is not, what it cannot do, and the quotas, retry rules and misleading
  failures that should change how it is used. That knowledge previously lived only in the README,
  which a model never reads.

## [1.0.0] — 2026-08-11

### Changed

- Declared stable. The tool surface, input schemas and environment variables of 0.1.x carry over
  unchanged — this release marks API stability, not new behaviour.

## [0.1.0] — 2026-08-09

### Added
- First real release: a full MCP server for the Google Search Console API
  (stdio, TypeScript, `@modelcontextprotocol/sdk` + `zod`), covering both API
  surfaces on `searchconsole.googleapis.com` — `webmasters/v3` (sites,
  sitemaps, searchanalytics) and `v1` (urlInspection).
- Tools (12):
  - `list_sites`, `get_site` — properties and permission levels (the source of
    truth for the exact siteUrl format: URL-prefix vs `sc-domain:`);
  - `add_site`, `delete_site` — add/unlink a property (verification stays with
    the Search Console UI / Site Verification API);
  - `search_analytics` — the full performance query: dimensions (date, query,
    page, country, device, searchAppearance, hour), search types (web, image,
    video, news, discover, googleNews), AND-combined filters incl. RE2 regex
    operators, aggregation types, `rowLimit`/`startRow` pagination and
    `dataState` (final/all/hourly_all);
  - `get_top_queries` — sugar over the same endpoint for the most common ask:
    top queries by clicks, with optional page/country/device filters;
  - `list_sitemaps`, `get_sitemap`, `submit_sitemap`, `delete_sitemap` —
    sitemap management (submit is the API's body-less PUT with an empty
    success response, surfaced as `{ ok: true }`);
  - `inspect_url` — Google-index status with verdicts, coverage, crawl info,
    canonicals and rich results (the tool description warns about the
    2,000/day per-property quota);
  - `raw_request` — escape hatch to any path on either surface (SSRF-guarded).
- Property identifiers (`siteUrl`) and sitemap URLs (`feedpath`) are fully
  URL-encoded as path segments by the client — `sc-domain:example.com` and
  `https://example.com/` both route correctly.
- OAuth2 refresh flow: access tokens are minted from
  `GOOGLE_SEARCH_CONSOLE_CLIENT_ID`/`_CLIENT_SECRET`/`_REFRESH_TOKEN`, cached
  until just before expiry, deduped across concurrent requests and re-minted
  once on a 401; a static `GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN` works as an
  alternative.
- Resilience: request timeout covering body reads, `Retry-After`-aware backoff,
  429 retried for every method, 5xx/network retries gated to reads so mutations
  are never replayed; Google's error envelope is surfaced with the
  machine-readable `reason` (e.g. `quotaExceeded`).
- Anonymous usage telemetry (event/tool names and versions only; opt out with
  `ASKADS_TELEMETRY=0`), including the `startup_failed` drop-off ping.
- Offline test suite (75 tests): mocked-fetch client tests incl. the OAuth flow
  and path encoding, fake-server tool tests, pinned per-tool annotations, plus
  a dist smoke test that spawns the built binary and performs a real MCP
  handshake over stdio.
- CI (Node 20/22/24: typecheck + build + tests) and a daily live health check
  that skips itself when repo secrets are absent.

## [0.0.1] — 2026-08-09

### Added
- npm name reservation stub.

[Unreleased]: https://github.com/A1-x-Tech/mcp-google-search-console/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/A1-x-Tech/mcp-google-search-console/releases/tag/v1.0.1
[1.0.0]: https://github.com/A1-x-Tech/mcp-google-search-console/releases/tag/v1.0.0
[0.1.0]: https://github.com/A1-x-Tech/mcp-google-search-console/releases/tag/v0.1.0
[0.0.1]: https://github.com/A1-x-Tech/mcp-google-search-console/commits/main
