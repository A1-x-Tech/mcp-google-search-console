import { test } from "node:test";
import assert from "node:assert/strict";
import { GoogleSearchConsoleClient } from "./client.js";
import { CredentialsError, MISSING_CREDENTIALS_MESSAGE } from "./config.js";
import type { GoogleSearchConsoleConfig } from "./types.js";

const BASE = "https://searchconsole.googleapis.com";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

type Call = { url: string; method: string; auth: unknown; body: string | undefined };

/** A client on a static access token — no token-endpoint traffic expected. */
function staticConfig(extra: Partial<GoogleSearchConsoleConfig> = {}): GoogleSearchConsoleConfig {
  return { accessToken: "STATIC", apiBase: BASE, maxRetries: 0, retryBaseMs: 0, ...extra };
}

/** A client on the refresh flow. */
function refreshConfig(extra: Partial<GoogleSearchConsoleConfig> = {}): GoogleSearchConsoleConfig {
  return {
    clientId: "cid",
    clientSecret: "csec",
    refreshToken: "rtok",
    apiBase: BASE,
    maxRetries: 0,
    retryBaseMs: 0,
    ...extra,
  };
}

/** Installs a recording fetch stub; the handler decides each response. */
function mockFetch(handler: (url: string, init: RequestInit, n: number) => Response | Promise<Response>) {
  const original = globalThis.fetch;
  const calls: Call[] = [];
  globalThis.fetch = (async (url: unknown, init: unknown) => {
    const i = (init ?? {}) as RequestInit & { headers?: Record<string, string> };
    calls.push({
      url: String(url),
      method: String(i.method),
      auth: i.headers?.Authorization,
      body: typeof i.body === "string" ? i.body : undefined,
    });
    return handler(String(url), i, calls.length);
  }) as typeof fetch;
  return {
    calls,
    restore() {
      globalThis.fetch = original;
    },
  };
}

const okJson = (data: unknown) => new Response(JSON.stringify(data), { status: 200 });

/** Default handler: token endpoint mints TOK-1, everything else returns { ok: true }. */
function defaultHandler(url: string): Response {
  if (url === TOKEN_URL) return okJson({ access_token: "TOK-1", expires_in: 3600 });
  return okJson({ ok: true });
}

// ---- Auth ----

/**
 * The degraded-start contract: a server without credentials still runs, so the
 * client must fail the call itself — with the exact actionable message, before
 * any fetch. Zero fetch calls proves the error skips the retry/backoff loop
 * and the forced 401 re-mint alike (maxRetries is deliberately non-zero here).
 */
test("no credentials at all: CredentialsError with the exact text, fetch never called", async () => {
  const mock = mockFetch(defaultHandler);
  try {
    const client = new GoogleSearchConsoleClient({ apiBase: BASE, maxRetries: 3, retryBaseMs: 0 });
    await assert.rejects(
      () => client.listSites(),
      (err: unknown) => {
        assert.ok(err instanceof CredentialsError, "must be a CredentialsError");
        assert.equal(err.message, MISSING_CREDENTIALS_MESSAGE);
        // The historical startup error, verbatim — the message is the product.
        assert.ok(
          err.message.startsWith(
            "Google OAuth credentials are required: set GOOGLE_SEARCH_CONSOLE_CLIENT_ID + " +
              "GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET + GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN (recommended), " +
              "or GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN with a short-lived access token.",
          ),
          "the message must open with the historical startup error, verbatim",
        );
        assert.match(err.message, /restart the server/, "the fix must mention the restart");
        return true;
      },
    );
    assert.equal(mock.calls.length, 0, "must not fetch at all — no retries, no token mint, no replay");
  } finally {
    mock.restore();
  }
});

test("static access token: Bearer header, no token-endpoint traffic", async () => {
  const mock = mockFetch(defaultHandler);
  try {
    await new GoogleSearchConsoleClient(staticConfig()).listSites();
    assert.equal(mock.calls.length, 1);
    assert.equal(mock.calls[0].url, `${BASE}/webmasters/v3/sites`);
    assert.equal(mock.calls[0].method, "GET");
    assert.equal(mock.calls[0].auth, "Bearer STATIC");
  } finally {
    mock.restore();
  }
});

test("refresh flow: mints a token first, then caches it across requests", async () => {
  const mock = mockFetch(defaultHandler);
  try {
    const client = new GoogleSearchConsoleClient(refreshConfig());
    await client.listSites();
    await client.getSite("sc-domain:example.com");

    const tokenCalls = mock.calls.filter((c) => c.url === TOKEN_URL);
    assert.equal(tokenCalls.length, 1, "the second request must reuse the cached token");
    assert.equal(tokenCalls[0].method, "POST");
    const params = new URLSearchParams(tokenCalls[0].body);
    assert.equal(params.get("grant_type"), "refresh_token");
    assert.equal(params.get("client_id"), "cid");
    assert.equal(params.get("client_secret"), "csec");
    assert.equal(params.get("refresh_token"), "rtok");

    const apiCalls = mock.calls.filter((c) => c.url.startsWith(`${BASE}/`));
    assert.equal(apiCalls.length, 2);
    for (const call of apiCalls) assert.equal(call.auth, "Bearer TOK-1");
  } finally {
    mock.restore();
  }
});

test("a 401 forces one re-mint and replays the request", async () => {
  let minted = 0;
  let apiHits = 0;
  const mock = mockFetch((url) => {
    if (url === TOKEN_URL) {
      minted++;
      return okJson({ access_token: `TOK-${minted}`, expires_in: 3600 });
    }
    apiHits++;
    if (apiHits === 1) return new Response('{"error":{"message":"expired"}}', { status: 401 });
    return okJson({ ok: true });
  });
  try {
    const result = await new GoogleSearchConsoleClient(refreshConfig()).listSites();
    assert.deepEqual(result, { ok: true });
    assert.equal(minted, 2, "the 401 must force a second mint");
    const lastApi = mock.calls.filter((c) => c.url.startsWith(`${BASE}/`)).at(-1);
    assert.equal(lastApi?.auth, "Bearer TOK-2");
  } finally {
    mock.restore();
  }
});

test("a persistent 401 throws instead of looping", async () => {
  let apiHits = 0;
  const mock = mockFetch((url) => {
    if (url === TOKEN_URL) return okJson({ access_token: "TOK", expires_in: 3600 });
    apiHits++;
    return new Response('{"error":{"message":"nope","status":"UNAUTHENTICATED"}}', { status: 401 });
  });
  try {
    await assert.rejects(
      () => new GoogleSearchConsoleClient(refreshConfig()).listSites(),
      /HTTP 401: \[UNAUTHENTICATED\] nope/,
    );
    assert.equal(apiHits, 2, "exactly one replay after the forced re-mint");
  } finally {
    mock.restore();
  }
});

test("a failed token exchange surfaces the OAuth error", async () => {
  const mock = mockFetch((url) => {
    if (url === TOKEN_URL) {
      return new Response('{"error":"invalid_grant","error_description":"Token has been revoked."}', {
        status: 400,
      });
    }
    return okJson({ ok: true });
  });
  try {
    await assert.rejects(
      () => new GoogleSearchConsoleClient(refreshConfig()).listSites(),
      /HTTP 400: invalid_grant: Token has been revoked\./,
    );
  } finally {
    mock.restore();
  }
});

// ---- Endpoint mapping & URL encoding ----

test("getSite URL-encodes a domain property (sc-domain:)", async () => {
  const mock = mockFetch(defaultHandler);
  try {
    await new GoogleSearchConsoleClient(staticConfig()).getSite("sc-domain:example.com");
    assert.equal(mock.calls[0].url, `${BASE}/webmasters/v3/sites/sc-domain%3Aexample.com`);
    assert.equal(mock.calls[0].method, "GET");
  } finally {
    mock.restore();
  }
});

test("addSite is a body-less PUT and wraps the empty success response", async () => {
  const mock = mockFetch(() => new Response(null, { status: 204 }));
  try {
    const result = await new GoogleSearchConsoleClient(staticConfig()).addSite("https://example.com/");
    assert.equal(mock.calls[0].url, `${BASE}/webmasters/v3/sites/https%3A%2F%2Fexample.com%2F`);
    assert.equal(mock.calls[0].method, "PUT");
    assert.equal(mock.calls[0].body, undefined, "sites.add takes no request body");
    assert.deepEqual(result, { ok: true, added: "https://example.com/" });
  } finally {
    mock.restore();
  }
});

test("deleteSite is a DELETE and wraps the empty success response", async () => {
  const mock = mockFetch(() => new Response(null, { status: 204 }));
  try {
    const result = await new GoogleSearchConsoleClient(staticConfig()).deleteSite("sc-domain:example.com");
    assert.equal(mock.calls[0].url, `${BASE}/webmasters/v3/sites/sc-domain%3Aexample.com`);
    assert.equal(mock.calls[0].method, "DELETE");
    assert.deepEqual(result, { ok: true, removed: "sc-domain:example.com" });
  } finally {
    mock.restore();
  }
});

test("listSitemaps hits the sitemaps path, with the optional sitemapIndex query", async () => {
  const mock = mockFetch(defaultHandler);
  try {
    const client = new GoogleSearchConsoleClient(staticConfig());
    await client.listSitemaps("https://example.com/");
    assert.equal(mock.calls[0].url, `${BASE}/webmasters/v3/sites/https%3A%2F%2Fexample.com%2F/sitemaps`);
    await client.listSitemaps("https://example.com/", "https://example.com/sitemap_index.xml");
    const url = new URL(mock.calls[1].url);
    assert.equal(url.pathname, "/webmasters/v3/sites/https%3A%2F%2Fexample.com%2F/sitemaps");
    assert.equal(url.searchParams.get("sitemapIndex"), "https://example.com/sitemap_index.xml");
  } finally {
    mock.restore();
  }
});

test("getSitemap URL-encodes both the siteUrl and the feedpath", async () => {
  const mock = mockFetch(defaultHandler);
  try {
    await new GoogleSearchConsoleClient(staticConfig()).getSitemap(
      "sc-domain:example.com",
      "https://example.com/sitemap.xml",
    );
    assert.equal(
      mock.calls[0].url,
      `${BASE}/webmasters/v3/sites/sc-domain%3Aexample.com/sitemaps/https%3A%2F%2Fexample.com%2Fsitemap.xml`,
    );
  } finally {
    mock.restore();
  }
});

test("submitSitemap is a body-less PUT wrapping the empty response; deleteSitemap a DELETE", async () => {
  const mock = mockFetch(() => new Response("", { status: 200 }));
  try {
    const client = new GoogleSearchConsoleClient(staticConfig());
    const submitted = await client.submitSitemap("https://example.com/", "https://example.com/sitemap.xml");
    assert.equal(mock.calls[0].method, "PUT");
    assert.equal(
      mock.calls[0].url,
      `${BASE}/webmasters/v3/sites/https%3A%2F%2Fexample.com%2F/sitemaps/https%3A%2F%2Fexample.com%2Fsitemap.xml`,
    );
    assert.equal(mock.calls[0].body, undefined, "sitemaps.submit takes no request body");
    assert.deepEqual(submitted, {
      ok: true,
      submitted: "https://example.com/sitemap.xml",
      siteUrl: "https://example.com/",
    });

    const deleted = await client.deleteSitemap("https://example.com/", "https://example.com/sitemap.xml");
    assert.equal(mock.calls[1].method, "DELETE");
    assert.deepEqual(deleted, {
      ok: true,
      deleted: "https://example.com/sitemap.xml",
      siteUrl: "https://example.com/",
    });
  } finally {
    mock.restore();
  }
});

test("searchAnalytics POSTs the full body with filters wrapped in one AND group", async () => {
  const mock = mockFetch(defaultHandler);
  try {
    await new GoogleSearchConsoleClient(staticConfig()).searchAnalytics({
      siteUrl: "sc-domain:example.com",
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      dimensions: ["query", "page"],
      searchType: "web",
      filters: [
        { dimension: "country", operator: "equals", expression: "usa" },
        { dimension: "page", operator: "includingRegex", expression: "/blog/.*" },
      ],
      aggregationType: "byPage",
      rowLimit: 500,
      startRow: 1000,
      dataState: "all",
    });
    assert.equal(mock.calls[0].url, `${BASE}/webmasters/v3/sites/sc-domain%3Aexample.com/searchAnalytics/query`);
    assert.equal(mock.calls[0].method, "POST");
    assert.deepEqual(JSON.parse(mock.calls[0].body!), {
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      dimensions: ["query", "page"],
      type: "web",
      dimensionFilterGroups: [
        {
          groupType: "and",
          filters: [
            { dimension: "country", operator: "equals", expression: "usa" },
            { dimension: "page", operator: "includingRegex", expression: "/blog/.*" },
          ],
        },
      ],
      aggregationType: "byPage",
      rowLimit: 500,
      startRow: 1000,
      dataState: "all",
    });
  } finally {
    mock.restore();
  }
});

test("searchAnalytics drops undefined optionals from the body (compact)", async () => {
  const mock = mockFetch(defaultHandler);
  try {
    await new GoogleSearchConsoleClient(staticConfig()).searchAnalytics({
      siteUrl: "https://example.com/",
      startDate: "2026-08-01",
      endDate: "2026-08-07",
    });
    assert.deepEqual(JSON.parse(mock.calls[0].body!), { startDate: "2026-08-01", endDate: "2026-08-07" });
  } finally {
    mock.restore();
  }
});

test("an empty filters array does not produce a dimensionFilterGroups key", async () => {
  const mock = mockFetch(defaultHandler);
  try {
    await new GoogleSearchConsoleClient(staticConfig()).searchAnalytics({
      siteUrl: "https://example.com/",
      startDate: "2026-08-01",
      endDate: "2026-08-07",
      filters: [],
    });
    assert.deepEqual(JSON.parse(mock.calls[0].body!), { startDate: "2026-08-01", endDate: "2026-08-07" });
  } finally {
    mock.restore();
  }
});

test("inspectUrl POSTs the JSON body to the v1 surface", async () => {
  const mock = mockFetch(defaultHandler);
  try {
    await new GoogleSearchConsoleClient(staticConfig()).inspectUrl({
      inspectionUrl: "https://example.com/page",
      siteUrl: "sc-domain:example.com",
      languageCode: "en-US",
    });
    assert.equal(mock.calls[0].url, `${BASE}/v1/urlInspection/index:inspect`);
    assert.equal(mock.calls[0].method, "POST");
    assert.deepEqual(JSON.parse(mock.calls[0].body!), {
      inspectionUrl: "https://example.com/page",
      siteUrl: "sc-domain:example.com",
      languageCode: "en-US",
    });
  } finally {
    mock.restore();
  }
});

// ---- Error surfacing ----

test("the Google error envelope surfaces the first reason", async () => {
  const mock = mockFetch(
    () =>
      new Response(
        JSON.stringify({
          error: {
            code: 403,
            message: "Quota exceeded.",
            errors: [{ domain: "usageLimits", reason: "quotaExceeded", message: "Quota exceeded." }],
          },
        }),
        { status: 403 },
      ),
  );
  try {
    await assert.rejects(
      () => new GoogleSearchConsoleClient(staticConfig()).listSites(),
      /HTTP 403: \[quotaExceeded\] Quota exceeded\./,
    );
  } finally {
    mock.restore();
  }
});

// ---- Retry / timeout / SSRF behavior ----

test("request() retries a 429 for reads and writes alike", async () => {
  for (const run of [
    () => new GoogleSearchConsoleClient(staticConfig({ maxRetries: 3 })).listSites(),
    () => new GoogleSearchConsoleClient(staticConfig({ maxRetries: 3 })).deleteSite("https://example.com/"),
  ]) {
    let n = 0;
    const mock = mockFetch(() => {
      n++;
      if (n === 1) return new Response("slow down", { status: 429 });
      return okJson({ ok: true });
    });
    try {
      assert.deepEqual(await run(), { ok: true });
      assert.equal(n, 2);
    } finally {
      mock.restore();
    }
  }
});

test("request() retries a 5xx only for GET — a mutation is never replayed", async () => {
  let n = 0;
  const mock = mockFetch(() => {
    n++;
    if (n === 1) return new Response("unavailable", { status: 503 });
    return okJson({ ok: true });
  });
  try {
    const result = await new GoogleSearchConsoleClient(staticConfig({ maxRetries: 3 })).listSites();
    assert.deepEqual(result, { ok: true });
    assert.equal(n, 2, "the read is retried");
  } finally {
    mock.restore();
  }

  n = 0;
  const mock2 = mockFetch(() => {
    n++;
    return new Response("unavailable", { status: 503 });
  });
  try {
    await assert.rejects(
      () =>
        new GoogleSearchConsoleClient(staticConfig({ maxRetries: 3 })).submitSitemap(
          "https://example.com/",
          "https://example.com/sitemap.xml",
        ),
      /HTTP 503/,
    );
    assert.equal(n, 1, "a 503 on a mutation must not be replayed");
  } finally {
    mock2.restore();
  }
});

test("request() retries a network error only for GET", async () => {
  let n = 0;
  const mock = mockFetch(() => {
    n++;
    if (n === 1) throw new Error("ECONNRESET");
    return okJson({ ok: true });
  });
  try {
    const result = await new GoogleSearchConsoleClient(staticConfig({ maxRetries: 2 })).listSites();
    assert.deepEqual(result, { ok: true });
    assert.equal(n, 2);
  } finally {
    mock.restore();
  }

  n = 0;
  const mock2 = mockFetch(() => {
    n++;
    throw new Error("ECONNRESET");
  });
  try {
    await assert.rejects(
      () => new GoogleSearchConsoleClient(staticConfig({ maxRetries: 2 })).deleteSite("https://example.com/"),
      /ECONNRESET/,
    );
    assert.equal(n, 1, "a network error on a mutation must not be replayed");
  } finally {
    mock2.restore();
  }
});

test("request() does not retry a 400 and gives up after maxRetries on 429", async () => {
  let n = 0;
  const mock = mockFetch(() => {
    n++;
    return new Response('{"error":{"message":"bad","errors":[{"reason":"invalidParameter"}]}}', { status: 400 });
  });
  try {
    await assert.rejects(
      () => new GoogleSearchConsoleClient(staticConfig({ maxRetries: 3 })).listSites(),
      /HTTP 400: \[invalidParameter\] bad/,
    );
    assert.equal(n, 1);
  } finally {
    mock.restore();
  }

  n = 0;
  const mock2 = mockFetch(() => {
    n++;
    return new Response("slow down", { status: 429 });
  });
  try {
    await assert.rejects(
      () => new GoogleSearchConsoleClient(staticConfig({ maxRetries: 2 })).listSites(),
      /HTTP 429/,
    );
    assert.equal(n, 3); // initial + 2 retries
  } finally {
    mock2.restore();
  }
});

test("request() aborts and reports a timeout when the request hangs", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = ((_url: unknown, init: unknown) =>
    new Promise((_resolve, reject) => {
      const signal = (init as RequestInit).signal as AbortSignal;
      signal.addEventListener("abort", () =>
        reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
      );
    })) as typeof fetch;
  try {
    const client = new GoogleSearchConsoleClient(staticConfig({ timeoutMs: 10, maxRetries: 0 }));
    await client.listSites().then(
      () => assert.fail("must reject"),
      (err) => assert.match(String(err), /timed out after 10ms/),
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("request() rejects an absolute path (SSRF) and never fetches a foreign origin", async () => {
  for (const evil of ["https://evil.example/steal", "http://evil.example/x", "\\\\evil.example/x"]) {
    const mock = mockFetch(() => okJson({}));
    try {
      await assert.rejects(
        () => new GoogleSearchConsoleClient(staticConfig()).request("GET", evil),
        /foreign origin/,
      );
      assert.equal(mock.calls.length, 0, `must not fetch for ${JSON.stringify(evil)}`);
    } finally {
      mock.restore();
    }
  }
});

test("request() still accepts a relative API path with a query string", async () => {
  const mock = mockFetch(defaultHandler);
  try {
    const result = await new GoogleSearchConsoleClient(staticConfig()).request(
      "GET",
      "webmasters/v3/sites/https%3A%2F%2Fexample.com%2F/sitemaps?sitemapIndex=x",
    );
    assert.deepEqual(result, { ok: true });
    assert.equal(mock.calls[0].url, `${BASE}/webmasters/v3/sites/https%3A%2F%2Fexample.com%2F/sitemaps?sitemapIndex=x`);
  } finally {
    mock.restore();
  }
});
