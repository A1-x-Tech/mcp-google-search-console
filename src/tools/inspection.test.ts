import { test } from "node:test";
import assert from "node:assert/strict";
import { registerInspectionTools } from "./inspection.js";

type Args = Record<string, unknown>;
type Handler = (args: Args) => Promise<{ content: { text: string }[]; isError?: boolean }>;

/** Fake server + fake client so the tool handlers run without network. */
function harness(opts: { throwOn?: string } = {}) {
  const calls: { method: string; params: unknown[] }[] = [];
  const client = {
    inspectUrl: async (...params: unknown[]) => {
      calls.push({ method: "inspectUrl", params });
      if (opts.throwOn === "inspectUrl") throw new Error("boom");
      return { inspectionResult: {} };
    },
  };
  const tools: Record<string, Handler> = {};
  const server = {
    registerTool: (name: string, _cfg: unknown, handler: Handler) => {
      tools[name] = handler;
    },
  };
  registerInspectionTools(server as never, client as never);
  return { calls, tools };
}

test("registers inspect_url", () => {
  const { tools } = harness();
  assert.deepEqual(Object.keys(tools), ["inspect_url"]);
});

test("inspect_url forwards the url, property and language normalized", async () => {
  const { calls, tools } = harness();
  await tools.inspect_url({
    inspection_url: "https://example.com/page",
    site_url: "sc-domain:example.com",
    language_code: "de-DE",
  });
  assert.deepEqual(calls[0].params[0], {
    inspectionUrl: "https://example.com/page",
    siteUrl: "sc-domain:example.com",
    languageCode: "de-DE",
  });
});

test("language_code is optional", async () => {
  const { calls, tools } = harness();
  await tools.inspect_url({
    inspection_url: "https://example.com/page",
    site_url: "https://example.com/",
  });
  assert.deepEqual(calls[0].params[0], {
    inspectionUrl: "https://example.com/page",
    siteUrl: "https://example.com/",
    languageCode: undefined,
  });
});

test("the tool description warns about the small per-site quota", () => {
  let description = "";
  const server = {
    registerTool: (_name: string, cfg: { description: string }) => {
      description = cfg.description;
    },
  };
  registerInspectionTools(server as never, {} as never);
  assert.match(description, /2,000 inspections per property per DAY/);
});

test("a client error is returned as an isError result, not thrown", async () => {
  const { tools } = harness({ throwOn: "inspectUrl" });
  const res = await tools.inspect_url({
    inspection_url: "https://example.com/page",
    site_url: "https://example.com/",
  });
  assert.equal(res.isError, true);
  assert.match(res.content[0].text, /boom/);
});
