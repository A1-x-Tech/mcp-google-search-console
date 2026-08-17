# CLAUDE.md — mcp-google-search-console

MCP server for the Google Search Console API (TypeScript, stdio). Mostly reads
plus a few idempotent mutations: tools cover properties (sites), sitemaps, the
Search Analytics performance query and URL index inspection; `raw_request` is
the escape hatch. The server talks to `https://searchconsole.googleapis.com`
(one host, two surfaces: `webmasters/v3` and `v1`) with a Bearer token; the
token is minted from an OAuth2 refresh token via
`https://oauth2.googleapis.com/token` (or a static
`GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN`, mostly for testing).

## Commands

```bash
npm run dev        # run from source (tsx watch)
npm test           # unit tests + dist smoke, no network
npm run typecheck  # types for src + tests
npm run build      # emit dist/
npm run smoke      # live READ-ONLY check (lists the account's properties)
```

## Architecture

- `src/config.ts` — env → config; throws `ConfigError` (with a `reason` code) instead of
  exiting, so `index.ts` can report the drop-off before dying. Credentials: either the
  refresh triple `GOOGLE_SEARCH_CONSOLE_CLIENT_ID` + `GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET` +
  `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN` (all three or `incomplete_oauth_config`) or
  `GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN`; optional `GOOGLE_SEARCH_CONSOLE_API_BASE`,
  `GOOGLE_SEARCH_CONSOLE_TIMEOUT_MS`, `GOOGLE_SEARCH_CONSOLE_MAX_RETRIES`.
- `src/client.ts` — all HTTP and all wire mapping. Token lifecycle (cache until ~60s before
  expiry, dedupe concurrent refreshes, one forced re-mint + replay on 401); `request()`
  resolves the path against the base and rejects foreign origins (SSRF guard), enforces an
  AbortController timeout that also covers reading the body, retries 429 always but
  5xx/network errors **only for GET**, and throws `GoogleSearchConsoleError(status, body)`
  surfacing Google's envelope with the first `reason`. `seg()` URL-encodes `siteUrl`/`feedpath`
  path segments — full URLs and `sc-domain:` values embedded in paths. `searchAnalytics()`
  wraps flat filters into the single AND `dimensionFilterGroups` group; mutations
  (sites.add/delete, sitemaps.submit/delete) return an **empty body** on success, wrapped as
  `{ ok: true, ... }` — never parse it as JSON.
- `src/tools/sites.ts` — `list_sites`, `get_site`, `add_site`, `delete_site`.
  `src/tools/sitemaps.ts` — `list_sitemaps`, `get_sitemap`, `submit_sitemap`,
  `delete_sitemap`. `src/tools/analytics.ts` — `search_analytics` and its sugar
  `get_top_queries` (dimensions=["query"] + optional page/country/device filters).
  `src/tools/inspection.ts` — `inspect_url`. `src/tools/raw.ts` — `raw_request`
  (GET/POST/PUT/DELETE). `src/tools/util.ts` — `ok`/`fail`, the four annotation presets
  (`READ_ONLY`/`WRITE`/`DESTRUCTIVE`/`RAW`) and shared zod schema factories
  (`siteUrlSchema`, `feedpathSchema`, `ymdDate`).
- `src/index.ts` — wires every `register*` into the McpServer.
- `src/telemetry.ts` — anonymous usage pings (ids/names/versions only, never data or
  arguments; fire-and-forget, must never block or throw; opt-out `ASKADS_TELEMETRY=0`).
  `startup_failed` is the exception: `sendBlocking` awaits it, because the caller exits right
  after. Its `reason` is a closed vocabulary (`missing_credentials`,
  `incomplete_oauth_config`) — never a variable's name or value.

## Conventions (do not break)

- **Never retry a mutation on 5xx/network errors.** Only 429 (rejected before executing) and
  GET are safe; the gate lives in `request()` and is pinned by tests. Do not auto-retry
  403 `quotaExceeded` either — daily quotas don't recover within a backoff.
- **siteUrl/feedpath encoding lives in the client** (`seg()`), never in the tools. Tools pass
  the user's property string through raw; a tool must never pre-normalize it (adding a
  trailing slash "helpfully" would silently target a different property).
- **Don't validate dimension/type combinations client-side.** The per-type restrictions for
  discover/googleNews and searchAppearance combinations are not fully documented — pass the
  request through and let the API's 400 explain itself.
- **Empty success bodies are the contract** for sites.add/delete and sitemaps.submit/delete
  (submit is PUT with **no** request body) — keep wrapping them as `{ ok: true, ... }`.
- **No tools on retired products**: `mobileUsabilityResult` and
  `urlTestingTools.mobileFriendlyTest.run` still appear in Google's schemas but the products
  are retired — don't build on them.
- **Auth is the client's job.** Tools never see tokens; the Bearer header, refresh, caching
  and the 401 replay all live in `request()`/`accessToken()`.
- **Validate inputs with zod** in `inputSchema`; reuse the shared schema **factories** in
  `util.ts` (a fresh schema per field avoids `$ref` dedup in the JSON schema).
- **Annotations are pinned per tool** in `annotations.test.ts` — changing one is a conscious
  decision that updates the map, with all four hints always set.
- **Output compact JSON via `ok`** — the consumer is an LLM; pretty-printing burns tokens.
  Responses pass through verbatim (describe the fields in the tool `description`, the only
  place the external model reads — e.g. "ctr is a fraction", "keys[] mirrors dimensions").

## Adding a tool

Before changing the tool registry, read [the MCP capability documentation contract](docs/CAPABILITY-DOCUMENTATION.md). Every registered tool must have exactly one task-oriented page in `docs/capabilities/`; update that page, the index, and the coverage test in the same change.

1. Add (or extend) `src/tools/<name>.ts` with `register<Name>Tools(server, client)`.
2. If it hits a new endpoint, add a method to `src/client.ts` with the wire mapping.
3. Import and call the register fn in `src/index.ts`.
4. Add a `*.test.ts` using the mock-fetch (client) / fake-client (tools) harness — no
   network — and add the tool + hints to `annotations.test.ts` and `test/dist-smoke.test.js`.
5. `npm run typecheck && npm test`.

## Releasing

Keep the version in sync across **all** channels in one go (`git push --follow-tags` pushes
the tag but does **not** create a GitHub Release; the registry is immutable per version):

1. Bump `version` in **three places, identically**: `package.json`, and in `server.json`
   **both** the root `version` **and** `packages[0].version`. `mcpName` in `package.json` must
   match `name` in `server.json` (`io.github.A1-x-Tech/mcp-google-search-console`). Verify:
   `grep -n '"version"' package.json server.json`.
   > ⚠️ `mcp-publisher` publishes the **root** `server.json.version`. A stale root makes
   > `mcp-publisher publish` fail with a misleading `400 cannot publish duplicate version`
   > while `npm publish` succeeds.
2. Update `CHANGELOG.md`, then `npm publish` (runs typecheck + tests + build via
   `prepublishOnly` / `prepare`).
3. `git commit`, `git tag -a vX.Y.Z -m vX.Y.Z`, `git push origin main --follow-tags`.
4. **GitHub Release:** `gh release create vX.Y.Z --title vX.Y.Z --generate-notes --verify-tag`.
5. **Official MCP registry:** `mcp-publisher publish` (login with
   `mcp-publisher login github --token "$(gh auth token)"`).
