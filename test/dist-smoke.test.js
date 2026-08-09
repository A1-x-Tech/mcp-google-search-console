import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { GoogleSearchConsoleClient } from "../dist/client.js";
import { registerSiteTools } from "../dist/tools/sites.js";
import { registerSitemapTools } from "../dist/tools/sitemaps.js";
import { registerAnalyticsTools } from "../dist/tools/analytics.js";
import { registerInspectionTools } from "../dist/tools/inspection.js";
import { registerRawTool } from "../dist/tools/raw.js";

const ALL_TOOLS = [
  "add_site",
  "delete_site",
  "delete_sitemap",
  "get_site",
  "get_sitemap",
  "get_top_queries",
  "inspect_url",
  "list_sitemaps",
  "list_sites",
  "raw_request",
  "search_analytics",
  "submit_sitemap",
];

test("dist client rejects foreign-origin paths before sending the Bearer token", async () => {
  const original = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return new Response("{}", { status: 200 });
  };
  try {
    const client = new GoogleSearchConsoleClient({
      accessToken: "SECRET",
      apiBase: "https://searchconsole.googleapis.com",
      timeoutMs: 1000,
      maxRetries: 0,
    });
    await assert.rejects(() => client.request("GET", "https://example.invalid/steal"), /foreign origin/);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = original;
  }
});

test("dist client sends the Bearer token, URL-encodes the property and posts JSON", async () => {
  const original = globalThis.fetch;
  let seen;
  globalThis.fetch = async (url, init) => {
    seen = { url: String(url), auth: init.headers.Authorization, body: JSON.parse(init.body) };
    return new Response('{"rows":[]}', { status: 200 });
  };
  try {
    const client = new GoogleSearchConsoleClient({
      accessToken: "SECRET",
      apiBase: "https://searchconsole.googleapis.com",
      timeoutMs: 1000,
      maxRetries: 0,
    });
    await client.searchAnalytics({
      siteUrl: "sc-domain:example.com",
      startDate: "2026-08-01",
      endDate: "2026-08-07",
    });
    assert.equal(
      seen.url,
      "https://searchconsole.googleapis.com/webmasters/v3/sites/sc-domain%3Aexample.com/searchAnalytics/query",
    );
    assert.equal(seen.auth, "Bearer SECRET");
    assert.deepEqual(seen.body, { startDate: "2026-08-01", endDate: "2026-08-07" });
  } finally {
    globalThis.fetch = original;
  }
});

test("dist registers the expected tools", () => {
  const names = [];
  const server = {
    registerTool(name) {
      names.push(name);
    },
  };
  const client = {};

  registerSiteTools(server, client);
  registerSitemapTools(server, client);
  registerAnalyticsTools(server, client);
  registerInspectionTools(server, client);
  registerRawTool(server, client);

  assert.deepEqual(names.sort(), ALL_TOOLS);
});

test("dist binary completes a real MCP handshake over stdio and lists every tool", async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL("../dist/index.js", import.meta.url))],
    env: {
      ...process.env,
      GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN: "test-token",
      ASKADS_TELEMETRY: "0", // keep the suite offline
    },
    stderr: "pipe",
  });
  const client = new Client({ name: "dist-smoke", version: "0.0.0" });
  await client.connect(transport);
  try {
    const server = client.getServerVersion();
    assert.equal(server?.name, "mcp-google-search-console");
    assert.match(String(server?.version), /^\d+\.\d+\.\d+$/);

    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), ALL_TOOLS);

    const analytics = tools.find((t) => t.name === "search_analytics");
    assert.equal(analytics.annotations?.readOnlyHint, true);
    assert.ok(analytics.inputSchema?.properties?.site_url, "input schema must reach the client");

    const deleteSite = tools.find((t) => t.name === "delete_site");
    assert.equal(deleteSite.annotations?.destructiveHint, true);
  } finally {
    await client.close();
  }
});
