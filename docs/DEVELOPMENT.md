# Development

## Requirements

- Node.js 20+ (the published package ships compiled `dist/`; `npx` needs no separate
  install). CI runs the suite on Node 20 and 22.

## Commands

```bash
npm install
npm run dev        # run from source with tsx watch
npm test           # unit tests (node:test) + dist smoke, no network
npm run typecheck  # type-check src + tests (no emit)
npm run build      # clean dist/ and compile with tsc
npm run smoke      # live READ-ONLY check (see below)
```

## Local run

```bash
npm run build
GOOGLE_SEARCH_CONSOLE_CLIENT_ID=... GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET=... \
GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=... \
  node dist/index.js
# or, for a quick session with a short-lived token:
GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN=$(gcloud auth print-access-token) node dist/index.js
# optional: GOOGLE_SEARCH_CONSOLE_API_BASE, GOOGLE_SEARCH_CONSOLE_TIMEOUT_MS,
#           GOOGLE_SEARCH_CONSOLE_MAX_RETRIES
```

`npm run smoke` makes one live read: it lists the account's Search Console
properties (`sites.list`, the cheapest read the API has). Nothing is written.

## Tests

Unit tests mock `globalThis.fetch` (client) or use a fake server + fake client (tools), so
the whole suite runs offline — including the OAuth refresh flow, whose token endpoint is
served by the same fetch stub. `test/dist-smoke.test.js` additionally spawns the built
`dist/index.js` and performs a real MCP handshake over stdio through the official SDK,
asserting the server identity and the full tool list. Put a `*.test.ts` next to the code it
covers; `npm run typecheck && npm test` is the gate (also run by `prepublishOnly`).

## Usage telemetry

The server sends anonymous events to `usage.gistrec.cloud` (`server_start` when a client
connects, `tool_call` with the tool **name**, and `startup_failed` with a fixed-vocabulary
reason code when credentials are missing) to count active installs and tool demand. An event
carries only impersonal technical fields: a random installation id
(`~/.config/mcp-google-search-console/instance-id`), the package version, the AI client's
name and version from the MCP handshake, the Node.js version and the OS.

OAuth credentials, Search Console data, tool arguments and prompts are never sent or stored
(implementation: `src/telemetry.ts`). Sends run in the background with a 2 s timeout and are
silently skipped on any error. Opt out for all servers of this line at once:
`ASKADS_TELEMETRY=0`.
