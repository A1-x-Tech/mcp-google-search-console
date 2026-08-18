#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { GoogleSearchConsoleClient } from "./client.js";
import { ConfigError, DEFAULT_BASE, hasCredentials, loadConfig } from "./config.js";
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

/**
 * Prepended to INSTRUCTIONS when no credentials are configured. The model reads
 * this before it picks a tool, so an unconfigured session opens with the fix
 * rather than with a failed call. There is no in-chat login here: credentials
 * come only from the environment, so the fix is an operator action + restart.
 */
const UNCONFIGURED_PREFIX =
  "ATTENTION: Google Search Console is not connected yet — no credentials are configured, so " +
  "every tool call will fail. The operator must set GOOGLE_SEARCH_CONSOLE_CLIENT_ID + " +
  "GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET + GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN (recommended), or " +
  "GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN with a short-lived access token, in the MCP client's " +
  "server config and restart this server — the variables are read only at startup. ";

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
 * Loads the config without dying on a bad value. A server that exits here never
 * completes the MCP handshake, so the user sees a dead server and no reason.
 * Instead the problem is carried into the session, where the model can read it
 * and relay it: the config degrades to "no credentials" and every tool call
 * fails with the actionable message.
 */
function loadConfigOrDegraded(telemetry: Telemetry): {
  config: GoogleSearchConsoleConfig;
  problem?: ConfigError;
} {
  try {
    return { config: loadConfig() };
  } catch (err) {
    if (!(err instanceof ConfigError)) throw err;
    console.error(`Error: ${err.message}`);
    // Fire-and-forget now that the process survives: the historical
    // `startup_failed` funnel stays comparable, but nothing blocks startup.
    telemetry.send("startup_failed", { reason: err.reason });
    return {
      config: { apiBase: process.env.GOOGLE_SEARCH_CONSOLE_API_BASE || DEFAULT_BASE },
      problem: err,
    };
  }
}

async function main(): Promise<void> {
  // Anonymous usage pings (ids/names/versions only, never data or arguments);
  // opt out with ASKADS_TELEMETRY=0. Built before the config so missing
  // credentials can be reported; wired to the server before tools register.
  const telemetry = new Telemetry(readVersion());
  const { config, problem } = loadConfigOrDegraded(telemetry);
  const client = new GoogleSearchConsoleClient(config);

  // Decided once, at startup: credentials come only from the environment, so
  // "restart after setting the variables" is the accurate advice to give.
  const connected = hasCredentials(config);

  // `instructions` rides in the options argument (not serverInfo) — that is what
  // the SDK copies into the initialize result.
  const server = new McpServer(
    {
      name: "mcp-google-search-console",
      version: readVersion(),
    },
    {
      instructions: connected
        ? INSTRUCTIONS
        : UNCONFIGURED_PREFIX + (problem ? `Configuration problem: ${problem.message} ` : "") + INSTRUCTIONS,
    },
  );

  instrumentToolCalls(server, telemetry);
  server.server.oninitialized = () => {
    telemetry.setClientInfo(server.server.getClientVersion());
    // Split on purpose: `server_start` keeps meaning "a usable install started",
    // so the unconfigured case gets its own event instead of inflating that number.
    if (connected) telemetry.send("server_start");
    else telemetry.send("unconfigured_start", { reason: problem?.reason ?? "missing_credentials" });
  };

  registerSiteTools(server, client);
  registerSitemapTools(server, client);
  registerAnalyticsTools(server, client);
  registerInspectionTools(server, client);
  registerRawTool(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `mcp-google-search-console running on stdio${connected ? "" : " (no credentials — set the environment variables and restart)"}`,
  );
}

main().catch((err) => {
  console.error("Fatal error starting mcp-google-search-console:", err);
  process.exit(1);
});
