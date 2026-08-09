import { test } from "node:test";
import assert from "node:assert/strict";
import { GoogleSearchConsoleClient } from "../client.js";
import { registerRawTool } from "./raw.js";

type Args = Record<string, unknown>;
type Handler = (args: Args) => Promise<{ content: { text: string }[]; isError?: boolean }>;

/** Registers raw_request against a real client with a recording fetch stub. */
function harness(status = 200, body: string | null = '{"ok":true}') {
  const original = globalThis.fetch;
  const calls: { url: string; method: string; auth: unknown; body: unknown }[] = [];
  globalThis.fetch = (async (url: unknown, init: unknown) => {
    const i = (init ?? {}) as { method: string; headers?: Record<string, string>; body?: string };
    calls.push({
      url: String(url),
      method: i.method,
      auth: i.headers?.Authorization,
      body: i.body ? JSON.parse(i.body) : undefined,
    });
    return new Response(body, { status });
  }) as typeof fetch;

  const client = new GoogleSearchConsoleClient({
    accessToken: "TKN",
    apiBase: "https://searchconsole.googleapis.com",
    maxRetries: 0,
  });
  const tools: Record<string, Handler> = {};
  const server = {
    registerTool: (name: string, _cfg: unknown, h: Handler) => {
      tools[name] = h;
    },
  };
  registerRawTool(server as never, client);
  return {
    tools,
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

test("raw_request defaults to GET with the Bearer token", async () => {
  const { tools, calls, restore } = harness();
  try {
    const res = await tools.raw_request({ path: "webmasters/v3/sites" });
    assert.equal(res.isError, undefined);
    assert.equal(calls[0].method, "GET");
    assert.equal(calls[0].url, "https://searchconsole.googleapis.com/webmasters/v3/sites");
    assert.equal(calls[0].auth, "Bearer TKN");
    assert.equal(calls[0].body, undefined);
  } finally {
    restore();
  }
});

test("raw_request POSTs a JSON body to a relative path", async () => {
  const { tools, calls, restore } = harness();
  try {
    await tools.raw_request({
      path: "webmasters/v3/sites/sc-domain%3Aexample.com/searchAnalytics/query",
      method: "POST",
      body: { startDate: "2026-08-01", endDate: "2026-08-07" },
    });
    assert.equal(calls[0].method, "POST");
    assert.equal(
      calls[0].url,
      "https://searchconsole.googleapis.com/webmasters/v3/sites/sc-domain%3Aexample.com/searchAnalytics/query",
    );
    assert.deepEqual(calls[0].body, { startDate: "2026-08-01", endDate: "2026-08-07" });
  } finally {
    restore();
  }
});

test("raw_request wraps an empty success response (PUT submit) as { ok: true }", async () => {
  const { tools, calls, restore } = harness(204, null);
  try {
    const res = await tools.raw_request({
      path: "webmasters/v3/sites/https%3A%2F%2Fexample.com%2F",
      method: "PUT",
    });
    assert.equal(res.isError, undefined);
    assert.equal(calls[0].method, "PUT");
    assert.equal(res.content[0].text, '{"ok":true}');
  } finally {
    restore();
  }
});

test("raw_request rejects an absolute path as an isError result, without fetching", async () => {
  for (const evil of ["https://evil.example/steal", "http://evil.example/x", "\\\\evil.example/x"]) {
    const { tools, calls, restore } = harness();
    try {
      const res = await tools.raw_request({ path: evil });
      assert.equal(res.isError, true, `${JSON.stringify(evil)} should be isError`);
      assert.match(res.content[0].text, /foreign origin/);
      assert.equal(calls.length, 0, `must not fetch for ${JSON.stringify(evil)}`);
    } finally {
      restore();
    }
  }
});
