import { test } from "node:test";
import assert from "node:assert/strict";
import { registerSiteTools } from "./sites.js";

type Args = Record<string, unknown>;
type Handler = (args: Args) => Promise<{ content: { text: string }[]; isError?: boolean }>;

/** Fake server + fake client so the tool handlers run without network. */
function harness(opts: { throwOn?: string } = {}) {
  const calls: { method: string; params: unknown[] }[] = [];
  const make =
    (method: string) =>
    async (...params: unknown[]) => {
      calls.push({ method, params });
      if (opts.throwOn === method) throw new Error("boom");
      return { ok: true };
    };
  const client = {
    listSites: make("listSites"),
    getSite: make("getSite"),
    addSite: make("addSite"),
    deleteSite: make("deleteSite"),
  };
  const tools: Record<string, Handler> = {};
  const server = {
    registerTool: (name: string, _cfg: unknown, handler: Handler) => {
      tools[name] = handler;
    },
  };
  registerSiteTools(server as never, client as never);
  return { calls, tools };
}

test("registers the four site tools", () => {
  const { tools } = harness();
  assert.deepEqual(Object.keys(tools).sort(), ["add_site", "delete_site", "get_site", "list_sites"]);
});

test("list_sites takes no arguments and calls listSites", async () => {
  const { calls, tools } = harness();
  await tools.list_sites({});
  assert.equal(calls[0].method, "listSites");
  assert.deepEqual(calls[0].params, []);
});

test("get_site / add_site / delete_site pass the raw site_url through", async () => {
  const { calls, tools } = harness();
  await tools.get_site({ site_url: "sc-domain:example.com" });
  await tools.add_site({ site_url: "https://example.com/" });
  await tools.delete_site({ site_url: "https://example.com/" });
  assert.deepEqual(calls, [
    { method: "getSite", params: ["sc-domain:example.com"] },
    { method: "addSite", params: ["https://example.com/"] },
    { method: "deleteSite", params: ["https://example.com/"] },
  ]);
});

test("a client error is returned as an isError result, not thrown", async () => {
  const { tools } = harness({ throwOn: "deleteSite" });
  const res = await tools.delete_site({ site_url: "https://example.com/" });
  assert.equal(res.isError, true);
  assert.match(res.content[0].text, /boom/);
});
