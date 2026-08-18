import type {
  AggregationType,
  DataState,
  Dimension,
  DimensionFilter,
  GoogleSearchConsoleConfig,
  SearchType,
} from "./types.js";
import { GoogleSearchConsoleError } from "./types.js";
import { CredentialsError } from "./config.js";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

/** Google's OAuth2 token endpoint — refresh tokens are exchanged here. */
const TOKEN_URL = "https://oauth2.googleapis.com/token";

/** Normalized inputs for search_analytics. All values are wire values already. */
export interface SearchAnalyticsParams {
  siteUrl: string;
  /** YYYY-MM-DD, Pacific Time. */
  startDate: string;
  /** YYYY-MM-DD, Pacific Time, inclusive. */
  endDate: string;
  dimensions?: Dimension[];
  /** Maps to the body field `type`. */
  searchType?: SearchType;
  /** Wrapped into a single AND dimensionFilterGroups group (the API supports no OR). */
  filters?: DimensionFilter[];
  aggregationType?: AggregationType;
  /** 1..25000; API default 1000. */
  rowLimit?: number;
  /** 0-based pagination offset. */
  startRow?: number;
  dataState?: DataState;
}

/** Normalized inputs for inspect_url. */
export interface InspectUrlParams {
  /** Fully-qualified URL to inspect; must belong to the property. */
  inspectionUrl: string;
  /** The property exactly as registered in Search Console. */
  siteUrl: string;
  /** BCP-47 language of issue messages, e.g. "en-US". */
  languageCode?: string;
}

/**
 * Encodes a property (siteUrl) or sitemap URL (feedpath) as a single path
 * segment. Both are full URLs (or "sc-domain:example.com") embedded in the
 * path, so every reserved character — including "/" and ":" — must be encoded
 * or the API's routing breaks.
 */
function seg(value: string): string {
  return encodeURIComponent(value);
}

export class GoogleSearchConsoleClient {
  private readonly base: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryBaseMs: number;
  /** Cached access token from the refresh flow, with its expiry. */
  private cachedToken?: { value: string; expiresAt: number };
  /** In-flight refresh, deduping concurrent token requests. */
  private refreshInFlight?: Promise<string>;

  constructor(private readonly config: GoogleSearchConsoleConfig) {
    this.base = config.apiBase.endsWith("/") ? config.apiBase : config.apiBase + "/";
    this.timeoutMs = config.timeoutMs ?? 60_000;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryBaseMs = config.retryBaseMs ?? 500;
  }

  private canRefresh(): boolean {
    return Boolean(this.config.refreshToken && this.config.clientId && this.config.clientSecret);
  }

  /**
   * Returns a valid Bearer token. With the refresh triple configured, mints an
   * access token from the refresh token and caches it until shortly before it
   * expires (concurrent callers share one in-flight refresh); otherwise the
   * static GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN is used as-is. With neither
   * configured, throws {@link CredentialsError} BEFORE any fetch — a missing
   * setup must never enter the retry/backoff loop or trigger the 401 re-mint,
   * because no amount of retrying mints credentials.
   */
  private async accessToken(forceRefresh = false): Promise<string> {
    if (!this.canRefresh()) {
      if (!this.config.accessToken) throw new CredentialsError();
      return this.config.accessToken;
    }
    if (!forceRefresh && this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.value;
    }
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.refreshAccessToken().finally(() => {
        this.refreshInFlight = undefined;
      });
    }
    return this.refreshInFlight;
  }

  /** Exchanges the refresh token for a fresh access token at Google's token endpoint. */
  private async refreshAccessToken(): Promise<string> {
    const body = new URLSearchParams({
      client_id: this.config.clientId as string,
      client_secret: this.config.clientSecret as string,
      refresh_token: this.config.refreshToken as string,
      grant_type: "refresh_token",
    }).toString();

    const { res, text } = await this.fetchWithTimeout(
      TOKEN_URL,
      { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body },
      "oauth2 token refresh",
    );

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    if (!res.ok) throw new GoogleSearchConsoleError(res.status, data);

    const token = (data as { access_token?: unknown }).access_token;
    if (typeof token !== "string" || !token) {
      throw new Error("OAuth2 token endpoint returned no access_token.");
    }
    const expiresIn = Number((data as { expires_in?: unknown }).expires_in);
    const ttl = Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600;
    // Refresh 60s ahead of the real expiry so requests never race a dying token.
    this.cachedToken = { value: token, expiresAt: Date.now() + Math.max(ttl - 60, 30) * 1000 };
    return token;
  }

  /** Verifies the OAuth credentials by minting a fresh access token (refresh flow only). */
  async authCheck(): Promise<unknown> {
    if (!this.canRefresh()) {
      throw new Error(
        "authCheck needs the refresh flow (GOOGLE_SEARCH_CONSOLE_CLIENT_ID / _CLIENT_SECRET / _REFRESH_TOKEN); with a static GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN list the sites instead.",
      );
    }
    await this.accessToken(true);
    return { ok: true, auth: "refresh_token" };
  }

  /** Backoff before a retry: honors Retry-After when present, else exponential (capped at 30s). */
  private backoffMs(attempt: number, res?: Response): number {
    const retryAfter = res ? Number(res.headers.get("Retry-After")) : NaN;
    if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(retryAfter, 30) * 1000;
    return Math.min(this.retryBaseMs * 2 ** attempt, 30_000);
  }

  /**
   * fetch with an AbortController timeout. Reads the response body inside the
   * guarded zone so the timeout also covers a slow or drip-feeding body, not
   * just the initial headers, and returns the text alongside the response.
   */
  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    label: string,
  ): Promise<{ res: Response; text: string }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      const text = await res.text();
      return { res, text };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`Request to "${label}" timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Low-level request to a Search Console API path (e.g. "webmasters/v3/sites"
   * or "v1/urlInspection/index:inspect"). Auth is a Bearer token (refreshed
   * transparently; a 401 forces one re-mint + replay). 429 is always retried
   * with backoff; 5xx and network errors/timeouts are retried only for GET —
   * PUT/DELETE here are idempotent by API contract, but a blanket write-replay
   * gate is the line's convention and costs nothing. Successful mutations
   * (sites.add/delete, sitemaps.submit/delete) return an EMPTY body — request()
   * then resolves to undefined; callers wrap it. Any other non-2xx throws a
   * {@link GoogleSearchConsoleError}.
   */
  async request<T = unknown>(
    method: HttpMethod,
    path: string,
    body?: Record<string, unknown>,
    query?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    // Guard method !== "GET" keeps undici from crashing on a GET-with-body.
    const hasBody = body !== undefined && method !== "GET";

    // Resolve the path against the API base, then reject anything that escaped
    // to a foreign origin (an absolute "https://evil/x" or a "\\evil/x" slipped
    // through raw_request) so the Bearer token can never leak to another host.
    const url = new URL(path.replace(/^\//, ""), this.base);
    if (url.origin !== new URL(this.base).origin) {
      throw new Error(`raw_request path must be a relative API path (resolved to foreign origin ${url.origin})`);
    }
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }
    const target = url.toString();

    // Only reads are replayed on ambiguous failures (see the retry gate below).
    const idempotent = method === "GET";
    let refreshedOn401 = false;

    for (let attempt = 0; ; attempt++) {
      const token = await this.accessToken();
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      if (hasBody) headers["Content-Type"] = "application/json";

      let res: Response;
      let text: string;
      try {
        ({ res, text } = await this.fetchWithTimeout(
          target,
          { method, headers, body: hasBody ? JSON.stringify(body) : undefined },
          path,
        ));
      } catch (err) {
        // Network error or timeout: the request may or may not have reached the
        // API, so only reads are retried; writes rethrow immediately.
        if (idempotent && attempt < this.maxRetries) {
          await delay(this.backoffMs(attempt));
          continue;
        }
        throw err;
      }

      // An expired/revoked access token: re-mint once and replay. The request
      // never executed, so this is safe for writes too.
      if (res.status === 401 && this.canRefresh() && !refreshedOn401) {
        refreshedOn401 = true;
        await this.accessToken(true);
        continue;
      }

      // 429 means the request was rejected before executing — safe to retry for
      // any method. 5xx is ambiguous, so it is gated to idempotent requests.
      // 403 quotaExceeded (daily limits) is NOT transient and falls through.
      const transient = res.status === 429 || (idempotent && res.status >= 500 && res.status < 600);
      if (transient && attempt < this.maxRetries) {
        await delay(this.backoffMs(attempt, res));
        continue;
      }

      let data: unknown = undefined;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      if (!res.ok) throw new GoogleSearchConsoleError(res.status, data);
      return data as T;
    }
  }

  // ---- Sites ----

  /** All properties the authenticated account can access, with permission levels. */
  async listSites(): Promise<unknown> {
    return this.request("GET", "webmasters/v3/sites");
  }

  /** One property's entry ({ siteUrl, permissionLevel }). */
  async getSite(siteUrl: string): Promise<unknown> {
    return this.request("GET", `webmasters/v3/sites/${seg(siteUrl)}`);
  }

  /** Adds a property to the account's set (stays unverified). Empty API response. */
  async addSite(siteUrl: string): Promise<unknown> {
    return (await this.request("PUT", `webmasters/v3/sites/${seg(siteUrl)}`)) ?? { ok: true, added: siteUrl };
  }

  /** Unlinks a property from the account (no data is deleted). Empty API response. */
  async deleteSite(siteUrl: string): Promise<unknown> {
    return (await this.request("DELETE", `webmasters/v3/sites/${seg(siteUrl)}`)) ?? { ok: true, removed: siteUrl };
  }

  // ---- Sitemaps ----

  /** Submitted sitemaps for a property, or children of a sitemap index. */
  async listSitemaps(siteUrl: string, sitemapIndex?: string): Promise<unknown> {
    return this.request("GET", `webmasters/v3/sites/${seg(siteUrl)}/sitemaps`, undefined, {
      sitemapIndex,
    });
  }

  /** One submitted sitemap's details (WmxSitemap). */
  async getSitemap(siteUrl: string, feedpath: string): Promise<unknown> {
    return this.request("GET", `webmasters/v3/sites/${seg(siteUrl)}/sitemaps/${seg(feedpath)}`);
  }

  /** Submits (or resubmits) a sitemap. PUT with no request body; empty API response. */
  async submitSitemap(siteUrl: string, feedpath: string): Promise<unknown> {
    return (
      (await this.request("PUT", `webmasters/v3/sites/${seg(siteUrl)}/sitemaps/${seg(feedpath)}`)) ?? {
        ok: true,
        submitted: feedpath,
        siteUrl,
      }
    );
  }

  /** Removes a sitemap from Search Console. Empty API response. */
  async deleteSitemap(siteUrl: string, feedpath: string): Promise<unknown> {
    return (
      (await this.request("DELETE", `webmasters/v3/sites/${seg(siteUrl)}/sitemaps/${seg(feedpath)}`)) ?? {
        ok: true,
        deleted: feedpath,
        siteUrl,
      }
    );
  }

  // ---- Search Analytics ----

  /**
   * Performance query: clicks/impressions/ctr/position grouped by dimensions.
   * The tool vocabulary already matches the wire format, so the body is a
   * straight compact() of the params; the only structural mapping is wrapping
   * flat filters into the single AND dimensionFilterGroups group.
   */
  async searchAnalytics(p: SearchAnalyticsParams): Promise<unknown> {
    return this.request(
      "POST",
      `webmasters/v3/sites/${seg(p.siteUrl)}/searchAnalytics/query`,
      compact({
        startDate: p.startDate,
        endDate: p.endDate,
        dimensions: p.dimensions,
        type: p.searchType,
        dimensionFilterGroups:
          p.filters && p.filters.length > 0
            ? [
                {
                  groupType: "and",
                  filters: p.filters.map((f) => ({
                    dimension: f.dimension,
                    operator: f.operator,
                    expression: f.expression,
                  })),
                },
              ]
            : undefined,
        aggregationType: p.aggregationType,
        rowLimit: p.rowLimit,
        startRow: p.startRow,
        dataState: p.dataState,
      }),
    );
  }

  // ---- URL Inspection ----

  /** Google-index status of one URL (v1 surface; POST with a JSON body, not path params). */
  async inspectUrl(p: InspectUrlParams): Promise<unknown> {
    return this.request(
      "POST",
      "v1/urlInspection/index:inspect",
      compact({
        inspectionUrl: p.inspectionUrl,
        siteUrl: p.siteUrl,
        languageCode: p.languageCode,
      }),
    );
  }
}

/** Drops keys whose value is `undefined` so they are not sent to the API. */
function compact<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
