import { test } from "node:test";
import assert from "node:assert/strict";
import { registerSitemapTools } from "./sitemaps.js";

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
    listSitemaps: make("listSitemaps"),
    getSitemap: make("getSitemap"),
    submitSitemap: make("submitSitemap"),
    deleteSitemap: make("deleteSitemap"),
  };
  const tools: Record<string, Handler> = {};
  const server = {
    registerTool: (name: string, _cfg: unknown, handler: Handler) => {
      tools[name] = handler;
    },
  };
  registerSitemapTools(server as never, client as never);
  return { calls, tools };
}

test("registers the four sitemap tools", () => {
  const { tools } = harness();
  assert.deepEqual(Object.keys(tools).sort(), [
    "delete_sitemap",
    "get_sitemap",
    "list_sitemaps",
    "submit_sitemap",
  ]);
});

test("list_sitemaps forwards site_url and the optional sitemap_index", async () => {
  const { calls, tools } = harness();
  await tools.list_sitemaps({ site_url: "https://example.com/" });
  assert.deepEqual(calls[0], { method: "listSitemaps", params: ["https://example.com/", undefined] });
  await tools.list_sitemaps({
    site_url: "https://example.com/",
    sitemap_index: "https://example.com/sitemap_index.xml",
  });
  assert.deepEqual(calls[1], {
    method: "listSitemaps",
    params: ["https://example.com/", "https://example.com/sitemap_index.xml"],
  });
});

test("get/submit/delete forward site_url + feedpath in order", async () => {
  const { calls, tools } = harness();
  const args = { site_url: "sc-domain:example.com", feedpath: "https://example.com/sitemap.xml" };
  await tools.get_sitemap(args);
  await tools.submit_sitemap(args);
  await tools.delete_sitemap(args);
  for (const [i, method] of ["getSitemap", "submitSitemap", "deleteSitemap"].entries()) {
    assert.deepEqual(calls[i], { method, params: ["sc-domain:example.com", "https://example.com/sitemap.xml"] });
  }
});

test("a client error is returned as an isError result, not thrown", async () => {
  const { tools } = harness({ throwOn: "submitSitemap" });
  const res = await tools.submit_sitemap({
    site_url: "https://example.com/",
    feedpath: "https://example.com/sitemap.xml",
  });
  assert.equal(res.isError, true);
  assert.match(res.content[0].text, /boom/);
});
