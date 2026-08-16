# <img src="./assets/a1-logo.svg" alt="A1" width="40"> Google Search Console MCP

**English** | [Русский](./README.ru.md)

[![npm](https://img.shields.io/npm/v/mcp-google-search-console)](https://www.npmjs.com/package/mcp-google-search-console)
[![CI](https://github.com/A1-x-Tech/mcp-google-search-console/actions/workflows/ci.yml/badge.svg)](https://github.com/A1-x-Tech/mcp-google-search-console/actions/workflows/ci.yml)
[![Glama](https://glama.ai/mcp/servers/A1-x-Tech/mcp-google-search-console/badges/score.svg)](https://glama.ai/mcp/servers/A1-x-Tech/mcp-google-search-console)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

**A1 Google Search Console MCP** connects an AI app to Google Search Console. Investigate search performance, check whether a URL is indexed, inspect sitemaps and deliberately submit or remove a sitemap when needed.

It works with the properties your Google account can access. The important detail is that it uses the exact Search Console property value — a domain property and a URL-prefix property are different objects.

- **12 tools.** Seven tools read properties, search data, sitemaps and index status; two add a property or submit a sitemap; three can remove data or call an arbitrary API method.
- **Exact property IDs.** `https://example.com/`, `https://www.example.com/` and `sc-domain:example.com` are distinct. `list_sites` shows the value to use.
- **Search data with context.** Query clicks, impressions, CTR and position by date, page, query, country, device or search appearance.
- **Indexing, not publishing.** URL inspection explains Google’s current status; it does not force a page into the index.

Start with a read-only question:

> Show the top 20 search queries for my property over the last 28 days, with clicks and CTR.

[Connect the server](#quick-start) · [Explore use cases](#what-you-can-ask-it-to-do) · [Open technical documentation](#technical-documentation)

---

## See it work in a minute

> **You:** Is `https://example.com/pricing` indexed? If not, why?
>
> **Assistant:** Inspects the URL and shows the index verdict, coverage, crawl information and canonical URLs. Nothing changes.
>
> **You:** Check my submitted sitemaps and prepare a resubmission for the one with errors.
>
> **Assistant:** Shows the sitemap, its warnings and errors, then asks for confirmation before submitting it again.
>
> **You:** Confirm.
>
> **Assistant:** Resubmits the selected sitemap. It does not change page content or guarantee indexing.

## Contents

- [Quick start](#quick-start)
- [What you can ask it to do](#what-you-can-ask-it-to-do)
- [How Search Console properties work](#how-search-console-properties-work)
- [What can change](#what-can-change)
- [Getting access](#getting-access)
- [Configuration](#configuration)
- [Data, limits and background work](#data-limits-and-background-work)
- [Technical documentation](#technical-documentation)
- [Support](#support)

## Quick start

You need Node.js 20+, a Google account with access to a Search Console property and OAuth credentials from Google Cloud.

1. [Prepare OAuth access](#getting-access).
2. Add the server to your AI app.
3. Start with the read-only question above.

<details open><summary><strong>Codex</strong></summary>

<br>

**In the app:** open **Settings → Plugins → MCP servers**, choose **Add server**, then add `npx -y mcp-google-search-console@latest` with `GOOGLE_SEARCH_CONSOLE_CLIENT_ID`, `GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET` and `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN`.

```bash
codex mcp add google-search-console \
  --env GOOGLE_SEARCH_CONSOLE_CLIENT_ID=your_client_id \
  --env GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET=your_client_secret \
  --env GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=your_refresh_token \
  -- npx -y mcp-google-search-console@latest
codex mcp list
```

[Codex MCP documentation](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)

</details>

<details><summary><strong>Claude Code</strong></summary>

<br>

```bash
claude mcp add \
  --env GOOGLE_SEARCH_CONSOLE_CLIENT_ID=your_client_id \
  --env GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET=your_client_secret \
  --env GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=your_refresh_token \
  --transport stdio --scope user google-search-console \
  -- npx -y mcp-google-search-console@latest
claude mcp list
```

[Claude Code MCP documentation](https://code.claude.com/docs/en/mcp)

</details>

<details><summary><strong>Claude Desktop</strong></summary>

<br>

Open **Settings → Developer → Edit Config** and add:

```json
{"mcpServers":{"google-search-console":{"command":"npx","args":["-y","mcp-google-search-console@latest"],"env":{"GOOGLE_SEARCH_CONSOLE_CLIENT_ID":"your_client_id","GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET":"your_client_secret","GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN":"your_refresh_token"}}}}
```

If **Edit Config** is unavailable, edit `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows.

[Claude Desktop MCP documentation](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop)

</details>

<details><summary><strong>Cursor</strong></summary>

<br>

Add to `~/.cursor/mcp.json` on macOS/Linux or `%USERPROFILE%\.cursor\mcp.json` on Windows:

```json
{"mcpServers":{"google-search-console":{"type":"stdio","command":"npx","args":["-y","mcp-google-search-console@latest"],"env":{"GOOGLE_SEARCH_CONSOLE_CLIENT_ID":"your_client_id","GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET":"your_client_secret","GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN":"your_refresh_token"}}}}
```

[Cursor MCP documentation](https://cursor.com/docs/mcp)

</details>

<details><summary><strong>VS Code</strong></summary>

<br>

Run **MCP: Open User Configuration** and add:

```json
{"servers":{"google-search-console":{"type":"stdio","command":"npx","args":["-y","mcp-google-search-console@latest"],"env":{"GOOGLE_SEARCH_CONSOLE_CLIENT_ID":"${input:gsc_client_id}","GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET":"${input:gsc_client_secret}","GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN":"${input:gsc_refresh_token}"}}},"inputs":[{"type":"promptString","id":"gsc_client_id","description":"Google OAuth client ID"},{"type":"promptString","id":"gsc_client_secret","description":"Google OAuth client secret","password":true},{"type":"promptString","id":"gsc_refresh_token","description":"Google OAuth refresh token","password":true}]}
```

Check it with **MCP: List Servers**. [VS Code MCP documentation](https://code.visualstudio.com/docs/agent-customization/mcp-servers)

</details>

## What you can ask it to do

### Find search opportunities

- Which queries and pages brought the most clicks this month?
- Which pages lost clicks compared with the previous period?
- Show queries containing `mcp` where average position is below 10.

### Check index status and sitemaps

- Is this URL indexed? Show coverage, crawl and canonical information.
- Which submitted sitemaps have errors or warnings?
- Resubmit this sitemap after showing its current status.

### Manage properties carefully

- List the Search Console properties I can access.
- Add this exact property value; I will verify ownership separately.
- Remove this property from my account after confirmation.

## How Search Console properties work

A URL-prefix property must include its protocol and trailing slash, for example `https://example.com/`. A domain property is written as `sc-domain:example.com`. A near-match causes 403 or 404, so use the exact value returned by `list_sites`.

`add_site` only registers a property. Verification remains in the Search Console UI or Site Verification API. Search data uses Pacific Time; `end_date` is inclusive and final analytics data typically lags by two to three days. `data_state: "all"` can include fresher, still-changing rows.

## What can change

| Operation | What happens | Confirmation boundary |
|---|---|---|
| List properties, analytics, sitemaps and URL status | Reads Search Console data | No change |
| Add a property | Adds a property entry; does not verify it | Changes account access |
| Submit or resubmit a sitemap | Requests processing of a sitemap | Changes Search Console state |
| Delete a property | Unlinks the property from the account; Google data is not deleted | Destructive |
| Delete a sitemap | Removes a submitted sitemap | Destructive |
| Raw API request | May call a write or delete endpoint | Potentially destructive |

The AI client controls confirmation prompts. The server marks reads, writes and destructive calls so the client can distinguish an inspection from a real change.

## Getting access

Search Console data requires Google OAuth 2.0; an API key is not enough.

1. Create or select a Google Cloud project and enable **Google Search Console API**.
2. Configure the OAuth consent screen and create a **Desktop app** OAuth client.
3. Use the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground) with **Use your own OAuth credentials** to authorize the Google account that can access the properties and obtain a refresh token.
4. Use `https://www.googleapis.com/auth/webmasters` to include sitemaps and property changes. Use `https://www.googleapis.com/auth/webmasters.readonly` only if you intentionally need read-only access.

Testing-mode refresh tokens can expire after seven days. Publish the OAuth app, or use an Internal Workspace app, for long-lived access. Treat the client secret and refresh token as passwords.

## Configuration

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_SEARCH_CONSOLE_CLIENT_ID` | Yes* | OAuth client ID. |
| `GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET` | Yes* | OAuth client secret. |
| `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN` | Yes* | OAuth refresh token. |
| `GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN` | Yes* | Short-lived alternative to the OAuth trio. |
| `GOOGLE_SEARCH_CONSOLE_API_BASE` | No | API base URL override. |
| `GOOGLE_SEARCH_CONSOLE_TIMEOUT_MS` | No | Per-request timeout; default `60000` ms. |
| `GOOGLE_SEARCH_CONSOLE_MAX_RETRIES` | No | Temporary-error retries; default `3`. |

\* Provide either the OAuth trio or an access token.

## Data, limits and background work

- **Privacy.** The local server calls Google and sends anonymous telemetry with an installation ID, versions and tool names — never OAuth tokens, property data, tool arguments or prompts. Set `ASKADS_TELEMETRY=0` to opt out.
- **API limits.** URL inspection allows 2,000 inspections per property per day and 600 per minute. Analytics returns at most 25,000 rows per request; long-tail anonymized queries are never returned. Use pagination and do not inspect whole sites URL by URL.
- **No background monitoring.** The server works only while called. If your AI app supports scheduled tasks, it can periodically check a sitemap or an important URL.

## Technical documentation

- [All tools and inputs](./docs/TOOLS.md)
- [Development documentation](./docs/DEVELOPMENT.md)
- [Publishing documentation](./docs/PUBLISHING.md)
- [Google Search Console API](https://developers.google.com/webmaster-tools)

## Support

Found a bug or need a scenario? [Create an issue](https://github.com/A1-x-Tech/mcp-google-search-console/issues) or write in [Telegram](https://t.me/a1_mcp).

<br>

<p align="center">
  <img src="https://github.com/ztemerbekov/a1-yandex-kit-skills/raw/main/assets/images/mona-hifive-yandex-kit-warm.gif" alt="Две Моны дают пять" width="256">
</p>

<p align="center">
  Вы дочитали до конца!
</p>
