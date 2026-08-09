import { test } from "node:test";
import assert from "node:assert/strict";
import { registerSiteTools } from "./sites.js";
import { registerSitemapTools } from "./sitemaps.js";
import { registerAnalyticsTools } from "./analytics.js";
import { registerInspectionTools } from "./inspection.js";
import { registerRawTool } from "./raw.js";
import { DESTRUCTIVE, RAW, READ_ONLY, WRITE } from "./util.js";

interface Annotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

/** Registers every tool against a fake server, capturing each tool's annotations. */
function collectAnnotations(): Record<string, Annotations | undefined> {
  const annotations: Record<string, Annotations | undefined> = {};
  const server = {
    registerTool: (name: string, cfg: { annotations?: Annotations }) => {
      annotations[name] = cfg.annotations;
    },
  };
  // Registration reads the client only inside handlers, so a stub is fine here.
  registerSiteTools(server as never, {} as never);
  registerSitemapTools(server as never, {} as never);
  registerAnalyticsTools(server as never, {} as never);
  registerInspectionTools(server as never, {} as never);
  registerRawTool(server as never, {} as never);
  return annotations;
}

const ANN = collectAnnotations();

/**
 * The Search Console API mixes reads with a few idempotent mutations, so the
 * expected hints are pinned per tool. Changing a tool's annotation must be a
 * conscious decision that updates this map.
 */
const EXPECTED: Record<string, Annotations> = {
  list_sites: READ_ONLY,
  get_site: READ_ONLY,
  add_site: WRITE,
  delete_site: DESTRUCTIVE,
  list_sitemaps: READ_ONLY,
  get_sitemap: READ_ONLY,
  submit_sitemap: WRITE,
  delete_sitemap: DESTRUCTIVE,
  search_analytics: READ_ONLY,
  inspect_url: READ_ONLY,
  raw_request: RAW,
};

test("registers all eleven tools with annotations", () => {
  assert.deepEqual(Object.keys(ANN).sort(), Object.keys(EXPECTED).sort());
  for (const [name, a] of Object.entries(ANN)) {
    assert.ok(a, `${name} is missing annotations`);
  }
});

test("every tool carries exactly its pinned hints (all four set)", () => {
  for (const [name, expected] of Object.entries(EXPECTED)) {
    assert.deepEqual(ANN[name], expected, `${name} annotations drifted`);
  }
});

test("analytics and inspection stay read-only — they never mutate the property", () => {
  for (const name of ["search_analytics", "inspect_url", "list_sites", "get_site", "list_sitemaps", "get_sitemap"]) {
    assert.equal(ANN[name]?.readOnlyHint, true, `${name} must be read-only`);
  }
});
