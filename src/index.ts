#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { GoogleSearchConsoleClient } from "./client.js";
import { ConfigError, loadConfig } from "./config.js";
import { instrumentToolCalls, Telemetry } from "./telemetry.js";
import type { GoogleSearchConsoleConfig } from "./types.js";
import { registerSiteTools } from "./tools/sites.js";
import { registerSitemapTools } from "./tools/sitemaps.js";
import { registerAnalyticsTools } from "./tools/analytics.js";
import { registerInspectionTools } from "./tools/inspection.js";
import { registerRawTool } from "./tools/raw.js";

/**
 * Prepended to every session as the `instructions` of the MCP initialize result
 * — the only prose the calling model sees before it picks a tool. It carries
 * what the tool list cannot: which product this is, what the API refuses to do,
 * what a call costs, and how its errors decode.
 */
const INSTRUCTIONS =
  "Google Search Console reports how a property performs in organic Google Search and how its URLs " +
  "stand in the index — not Google Analytics (on-site traffic), not Google Ads. Nothing here can " +
  "request (re)indexing; a sitemap submission is the only nudge, and writes are limited to " +
  "linking/unlinking a property and submitting/removing sitemaps. Batch work is where it bites: " +
  "2,000 URL inspections per property a day and 200 sites/sitemaps calls a minute — never sweep a " +
  "whole site; 429s and read-side 5xx are already retried inside the server, so a returned error is " +
  "final. Take property ids verbatim from list_sites: a 403/404 is usually a near-miss id (scheme, " +
  "www, trailing slash, sc-domain:), not a permissions problem; a 403 on a write points at a " +
  "readonly token; auth failing on every call means a dead refresh token (they expire after 7 days " +
  "while the OAuth consent screen is in Testing). Empty rows[] on the first page usually means the " +
  "dates fall in the 2-3 day finalization lag or you queried a sibling property, not zero traffic. " +
  "Confirm with the user before delete_site or delete_sitemap.";

/** Reads the package version so the server reports its real version to MCP clients. */
function readVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/**
 * Loads the config, reporting the drop-off if it is missing. An unconfigured
 * server dies before the MCP handshake, so this ping is the only trace such an
 * install ever leaves — and it has to be awaited, or process.exit() below would
 * kill the request in flight.
 */
async function loadConfigOrExit(telemetry: Telemetry): Promise<GoogleSearchConsoleConfig> {
  try {
    return loadConfig();
  } catch (err) {
    if (!(err instanceof ConfigError)) throw err;
    console.error(`Error: ${err.message}`);
    await telemetry.sendBlocking("startup_failed", { reason: err.reason });
    process.exit(1);
  }
}

async function main(): Promise<void> {
  // Anonymous usage pings (ids/names/versions only, never data or arguments);
  // opt out with ASKADS_TELEMETRY=0. Built before the config so missing
  // credentials can be reported; wired to the server before tools register.
  const telemetry = new Telemetry(readVersion());
  const config = await loadConfigOrExit(telemetry);
  const client = new GoogleSearchConsoleClient(config);

  // `instructions` rides in the options argument (not serverInfo) — that is what
  // the SDK copies into the initialize result.
  const server = new McpServer(
    {
      name: "mcp-google-search-console",
      version: readVersion(),
    },
    { instructions: INSTRUCTIONS },
  );

  instrumentToolCalls(server, telemetry);
  server.server.oninitialized = () => {
    telemetry.setClientInfo(server.server.getClientVersion());
    telemetry.send("server_start");
  };

  registerSiteTools(server, client);
  registerSitemapTools(server, client);
  registerAnalyticsTools(server, client);
  registerInspectionTools(server, client);
  registerRawTool(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-google-search-console running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting mcp-google-search-console:", err);
  process.exit(1);
});
