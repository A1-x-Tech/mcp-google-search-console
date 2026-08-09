import { test } from "node:test";
import assert from "node:assert/strict";
import { registerAnalyticsTools } from "./analytics.js";

type Args = Record<string, unknown>;
type Handler = (args: Args) => Promise<{ content: { text: string }[]; isError?: boolean }>;

/** Fake server + fake client so the tool handlers run without network. */
function harness(opts: { throwOn?: string } = {}) {
  const calls: { method: string; params: unknown[] }[] = [];
  const client = {
    searchAnalytics: async (...params: unknown[]) => {
      calls.push({ method: "searchAnalytics", params });
      if (opts.throwOn === "searchAnalytics") throw new Error("boom");
      return { rows: [] };
    },
  };
  const tools: Record<string, Handler> = {};
  const server = {
    registerTool: (name: string, _cfg: unknown, handler: Handler) => {
      tools[name] = handler;
    },
  };
  registerAnalyticsTools(server as never, client as never);
  return { calls, tools };
}

test("registers search_analytics", () => {
  const { tools } = harness();
  assert.deepEqual(Object.keys(tools), ["search_analytics"]);
});

test("search_analytics forwards every field normalized to the client vocabulary", async () => {
  const { calls, tools } = harness();
  await tools.search_analytics({
    site_url: "sc-domain:example.com",
    start_date: "2026-07-01",
    end_date: "2026-07-31",
    dimensions: ["query", "device"],
    search_type: "web",
    filters: [{ dimension: "country", operator: "equals", expression: "usa" }],
    aggregation_type: "byProperty",
    row_limit: 100,
    start_row: 200,
    data_state: "all",
  });
  assert.deepEqual(calls[0].params[0], {
    siteUrl: "sc-domain:example.com",
    startDate: "2026-07-01",
    endDate: "2026-07-31",
    dimensions: ["query", "device"],
    searchType: "web",
    filters: [{ dimension: "country", operator: "equals", expression: "usa" }],
    aggregationType: "byProperty",
    rowLimit: 100,
    startRow: 200,
    dataState: "all",
  });
});

test("optional fields stay undefined when omitted (the client compacts them away)", async () => {
  const { calls, tools } = harness();
  await tools.search_analytics({
    site_url: "https://example.com/",
    start_date: "2026-08-01",
    end_date: "2026-08-07",
  });
  assert.deepEqual(calls[0].params[0], {
    siteUrl: "https://example.com/",
    startDate: "2026-08-01",
    endDate: "2026-08-07",
    dimensions: undefined,
    searchType: undefined,
    filters: undefined,
    aggregationType: undefined,
    rowLimit: undefined,
    startRow: undefined,
    dataState: undefined,
  });
});

test("a client error is returned as an isError result, not thrown", async () => {
  const { tools } = harness({ throwOn: "searchAnalytics" });
  const res = await tools.search_analytics({
    site_url: "https://example.com/",
    start_date: "2026-08-01",
    end_date: "2026-08-07",
  });
  assert.equal(res.isError, true);
  assert.match(res.content[0].text, /boom/);
});
