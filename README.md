# Google Search Console MCP

[![npm](https://img.shields.io/npm/v/mcp-google-search-console)](https://www.npmjs.com/package/mcp-google-search-console)
[![CI](https://github.com/A1-x-Tech/mcp-google-search-console/actions/workflows/ci.yml/badge.svg)](https://github.com/A1-x-Tech/mcp-google-search-console/actions/workflows/ci.yml)
[![Glama](https://glama.ai/mcp/servers/A1-x-Tech/mcp-google-search-console/badges/score.svg)](https://glama.ai/mcp/servers/A1-x-Tech/mcp-google-search-console)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

MCP server for the **Google Search Console API**: search performance analytics
(clicks, impressions, CTR, position), sitemap management, URL index inspection
and property management — from Claude, Cursor, Codex and other AI clients, in
natural language.

Ask your assistant "which queries brought the most clicks last month?", "is this
page indexed?", or "resubmit the sitemap" — it drives the Search Console API for
you, from a quick indexing check to a full performance analysis.

## Quick start

1. [Get OAuth credentials](#getting-credentials) for the Search Console API.
2. Add the server — for example, in Claude Code ([other clients](#installation)):

   ```bash
   claude mcp add google-search-console \
     -e GOOGLE_SEARCH_CONSOLE_CLIENT_ID=your_client_id \
     -e GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET=your_client_secret \
     -e GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=your_refresh_token \
     -- npx -y mcp-google-search-console@latest
   ```

3. Ask the assistant: *"Show me the top 20 search queries for example.com over
   the last 28 days, with clicks and CTR."*

## Tools

| Tool | Description |
|---|---|
| `list_sites` | All Search Console properties the account can access, with permission levels. |
| `get_site` | One property's entry (siteUrl + permissionLevel). |
| `add_site` | Add a property (stays unverified until verified in Search Console). |
| `delete_site` | Unlink a property from the account (no data is deleted). |
| `search_analytics` | Performance query: clicks/impressions/CTR/position by date, query, page, country, device, search appearance or hour; filters, search type, pagination, fresh-data mode. |
| `get_top_queries` | Shortcut for the most common ask: top queries by clicks, optionally filtered by page substring, country or device. |
| `list_sitemaps` | Submitted sitemaps (or children of a sitemap index), with errors/warnings. |
| `get_sitemap` | One sitemap's status and per-content-type counts. |
| `submit_sitemap` | Submit or resubmit a sitemap. |
| `delete_sitemap` | Remove a sitemap from Search Console. |
| `inspect_url` | Google-index status of a URL: verdict, coverage, crawl info, canonicals, rich results. |
| `raw_request` | Escape hatch: any Search Console API path (webmasters/v3 or v1). |

Plus resilience built in: automatic OAuth token refresh (including on 401),
retries with backoff on 429 (and on 5xx/network errors for reads only —
mutations are never replayed), a request timeout, and an SSRF guard so the
token can't leak to a foreign host.

## Example prompts

- "Which pages lost the most clicks this month compared to the previous one?"
- "Is https://example.com/pricing indexed? If not, why?"
- "List queries containing 'mcp' where we rank below position 10."
- "Do any of our sitemaps have errors? Resubmit the ones that do."

## Two property formats (the #1 pitfall)

The `site_url` must match the property **exactly** as registered in Search Console:

- **URL-prefix property** — full URL with scheme and trailing slash:
  `https://example.com/`. Note `http://example.com/`, `https://example.com/`
  and `https://www.example.com/` are three **different** properties.
- **Domain property** — `sc-domain:example.com` (no scheme, no slash).

A near-match returns 403/404. `list_sites` shows the exact registered values —
the assistant will usually call it first.

## Limitations (the API's, not the server's)

- **Dates are in Pacific Time** and `end_date` is inclusive; final analytics
  data lags ~2–3 days (pass `data_state: "all"` for fresh, still-changing rows).
- **Filters are AND-only** — no OR across filters; regex operators use RE2 syntax.
- **URL inspection quota is small**: 2,000 inspections per property per day
  (600/minute) — don't batch-inspect entire sites.
- **Search analytics**: max 25,000 rows per request (paginate with `start_row`);
  anonymized long-tail queries are never returned.
- **Verification is out of scope**: `add_site` registers a property, but
  verification happens in the Search Console UI or the Site Verification API.

## Installation

Requires Node.js 20+ (runs via `npx`, no separate install).

<details open>
<summary><b>Claude Code</b></summary>

```bash
claude mcp add google-search-console \
  -e GOOGLE_SEARCH_CONSOLE_CLIENT_ID=your_client_id \
  -e GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET=your_client_secret \
  -e GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=your_refresh_token \
  -- npx -y mcp-google-search-console@latest
```

</details>

<details>
<summary><b>Claude Desktop</b></summary>

`claude_desktop_config.json` — macOS `~/Library/Application Support/Claude/`, Windows `%APPDATA%\Claude\`

```json
{
  "mcpServers": {
    "google-search-console": {
      "command": "npx",
      "args": ["-y", "mcp-google-search-console@latest"],
      "env": {
        "GOOGLE_SEARCH_CONSOLE_CLIENT_ID": "your_client_id",
        "GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET": "your_client_secret",
        "GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN": "your_refresh_token"
      }
    }
  }
}
```

</details>

<details>
<summary><b>Cursor</b></summary>

`~/.cursor/mcp.json` (or `.cursor/mcp.json` in the project)

```json
{
  "mcpServers": {
    "google-search-console": {
      "command": "npx",
      "args": ["-y", "mcp-google-search-console@latest"],
      "env": {
        "GOOGLE_SEARCH_CONSOLE_CLIENT_ID": "your_client_id",
        "GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET": "your_client_secret",
        "GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN": "your_refresh_token"
      }
    }
  }
}
```

</details>

<details>
<summary><b>VS Code</b></summary>

`.vscode/mcp.json` — note the `servers` key (not `mcpServers`)

```json
{
  "servers": {
    "google-search-console": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-google-search-console@latest"],
      "env": {
        "GOOGLE_SEARCH_CONSOLE_CLIENT_ID": "your_client_id",
        "GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET": "your_client_secret",
        "GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN": "your_refresh_token"
      }
    }
  }
}
```

</details>

## Getting credentials

The Search Console API has no API-key access — every call needs OAuth 2.0 (the
data belongs to your account). One-time setup, ~10 minutes:

1. **Create a Google Cloud project** (or reuse one) at
   [console.cloud.google.com](https://console.cloud.google.com/), then enable
   the **Google Search Console API**: *APIs & Services → Library → Google
   Search Console API → Enable*.
2. **Configure the OAuth consent screen** (*APIs & Services → OAuth consent
   screen*): choose *External*, fill in the app name and your email, and add
   your Google account under **Test users** (in Testing mode only listed users
   can authorize — no app verification needed).
3. **Create an OAuth client** (*APIs & Services → Credentials → Create
   credentials → OAuth client ID*), application type **Desktop app**. Save the
   **client ID** and **client secret**.
4. **Mint a refresh token.** The easiest way is the
   [OAuth 2.0 Playground](https://developers.google.com/oauthplayground):
   - Click the gear icon → check **Use your own OAuth credentials** → paste
     your client ID and secret (add
     `https://developers.google.com/oauthplayground` as an authorized redirect
     URI to the OAuth client first).
   - In *Step 1*, enter the scope `https://www.googleapis.com/auth/webmasters`
     and click **Authorize APIs**, signing in with the test-user account that
     owns your Search Console properties.
   - In *Step 2*, click **Exchange authorization code for tokens** and copy the
     **refresh token**.
5. Put the three values into `GOOGLE_SEARCH_CONSOLE_CLIENT_ID`,
   `GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET` and
   `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN`. The server exchanges the refresh
   token for short-lived access tokens automatically.

Scope notes: `https://www.googleapis.com/auth/webmasters` covers everything
including sitemap submission and property management. If you only need reads
(analytics, inspection, listings), the narrower
`https://www.googleapis.com/auth/webmasters.readonly` works — but `add_site`,
`delete_site`, `submit_sitemap` and `delete_sitemap` will then return 403.
While the consent screen stays in Testing mode, refresh tokens expire after
7 days — publish the app (or keep it Internal in a Workspace domain) for
long-lived tokens.

⚠️ The credentials are stored **in plain text** in your client's config — treat
them like a password. The refresh token grants access to your Search Console
data until revoked at
[myaccount.google.com/permissions](https://myaccount.google.com/permissions).

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `GOOGLE_SEARCH_CONSOLE_CLIENT_ID` | yes* | — | OAuth2 client id (refresh flow). |
| `GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET` | yes* | — | OAuth2 client secret (refresh flow). |
| `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN` | yes* | — | OAuth2 refresh token (refresh flow). |
| `GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN` | yes* | — | Alternative: a static access token (~1 h lifetime), mostly for testing. |
| `GOOGLE_SEARCH_CONSOLE_API_BASE` | no | `https://searchconsole.googleapis.com` | API root override. |
| `GOOGLE_SEARCH_CONSOLE_TIMEOUT_MS` | no | `60000` | Per-request timeout, ms. |
| `GOOGLE_SEARCH_CONSOLE_MAX_RETRIES` | no | `3` | Retries on transient errors. |

\* Either the three refresh-flow variables together, **or** `GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN`.

## Documentation

- [All tools](https://github.com/A1-x-Tech/mcp-google-search-console/blob/main/docs/TOOLS.md) — full reference with parameters and notes.
- [Development](https://github.com/A1-x-Tech/mcp-google-search-console/blob/main/docs/DEVELOPMENT.md) — build, tests, smoke check, telemetry.
- [Publishing](https://github.com/A1-x-Tech/mcp-google-search-console/blob/main/docs/PUBLISHING.md) — releasing and MCP-catalog listing.

## Support

Questions, ideas, issues — Telegram [@gistrec](http://t.me/gistrec) or
[GitHub issues](https://github.com/A1-x-Tech/mcp-google-search-console/issues).

## License

MIT — see [LICENSE](./LICENSE).
