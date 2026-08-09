import { test } from "node:test";
import assert from "node:assert/strict";
import { DESTRUCTIVE, fail, feedpathSchema, ok, RAW, READ_ONLY, siteUrlSchema, WRITE, ymdDate } from "./util.js";

test("ymdDate accepts YYYY-MM-DD and rejects timestamps/junk", () => {
  const d = ymdDate(); // factory → fresh schema
  assert.equal(d.safeParse("2026-08-01").success, true);
  assert.equal(d.safeParse("2026-08-01T00:00:00Z").success, false);
  assert.equal(d.safeParse("yesterday").success, false);
  assert.equal(d.safeParse("2026-8-1").success, false);
});

test("siteUrlSchema accepts both property formats (format guidance lives in the description)", () => {
  const s = siteUrlSchema();
  assert.equal(s.safeParse("https://example.com/").success, true);
  assert.equal(s.safeParse("sc-domain:example.com").success, true);
  assert.equal(s.safeParse("").success, false);
});

test("schema factories return independent schemas (no $ref dedup)", () => {
  assert.notEqual(siteUrlSchema(), siteUrlSchema());
  assert.notEqual(feedpathSchema(), feedpathSchema());
  assert.notEqual(ymdDate(), ymdDate());
});

test("ok emits compact JSON; fail flags isError", () => {
  assert.equal((ok({ a: 1 }).content[0] as { text: string }).text, '{"a":1}');
  const f = fail(new Error("boom"));
  assert.equal(f.isError, true);
  assert.match((f.content[0] as { text: string }).text, /boom/);
});

test("fail appends the underlying cause when present", () => {
  const err = new Error("timeout", { cause: new Error("ECONNRESET") });
  const f = fail(err);
  assert.match((f.content[0] as { text: string }).text, /timeout \(ECONNRESET\)/);
});

test("the four annotation presets set all four hints explicitly", () => {
  assert.deepEqual(READ_ONLY, {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  });
  // add_site / submit_sitemap: body-less PUT, replaying the same call converges.
  assert.deepEqual(WRITE, {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  });
  // delete_site / delete_sitemap: removes state, but the same call replayed is a no-op.
  assert.deepEqual(DESTRUCTIVE, {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  });
  // raw_request: arbitrary method/path — worst case.
  assert.deepEqual(RAW, {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  });
});
