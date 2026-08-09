/**
 * The server talks to the Google Search Console API
 * (https://searchconsole.googleapis.com), which serves two surfaces on one
 * host: webmasters/v3 (sites, sitemaps, searchanalytics) and v1
 * (urlInspection). Auth is Google OAuth 2.0: a Bearer access token, minted on
 * demand from a refresh token via https://oauth2.googleapis.com/token (or a
 * static short-lived access token, mostly for testing). An API key is never
 * enough — every method operates on the caller's verified properties.
 */

/**
 * Search Analytics grouping dimensions (wire values, passed through).
 * `hour` only works with dataState "hourly_all".
 */
export type Dimension = "date" | "query" | "page" | "country" | "device" | "searchAppearance" | "hour";

/** Dimensions a row filter can test (wire values, passed through). */
export type FilterDimension = "query" | "page" | "country" | "device" | "searchAppearance";

/** Row-filter operators (wire values; the regex operators use RE2 syntax). */
export type FilterOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "notContains"
  | "includingRegex"
  | "excludingRegex";

/** Search surface for a Search Analytics query (wire values for body field `type`). */
export type SearchType = "web" | "image" | "video" | "news" | "discover" | "googleNews";

/** Search Analytics aggregation (wire values, passed through). */
export type AggregationType = "auto" | "byPage" | "byProperty" | "byNewsShowcasePanel";

/** Data freshness selector (wire values). "hourly_all" is required for the hour dimension. */
export type DataState = "final" | "all" | "hourly_all";

/** One row filter; filters within a group are always combined with AND. */
export interface DimensionFilter {
  dimension: FilterDimension;
  operator: FilterOperator;
  expression: string;
}

export interface GoogleSearchConsoleConfig {
  /** OAuth2 client id (refresh flow). */
  clientId?: string;
  /** OAuth2 client secret (refresh flow). Treated as a secret. */
  clientSecret?: string;
  /** OAuth2 refresh token, exchanged for access tokens. Treated as a secret. */
  refreshToken?: string;
  /** Static access token (short-lived, ~1h). Used only when the refresh triple is absent. Treated as a secret. */
  accessToken?: string;
  /** API root. Defaults to https://searchconsole.googleapis.com. */
  apiBase: string;
  /** Per-request timeout in milliseconds. Defaults to 60_000. */
  timeoutMs?: number;
  /** Max retries for transient errors (429 always; 5xx/network for reads). Defaults to 3. */
  maxRetries?: number;
  /** Base backoff in milliseconds, doubled each retry. Defaults to 500. */
  retryBaseMs?: number;
}

/**
 * Google APIs report failures as a non-2xx HTTP status with a JSON envelope —
 * for this API `{ error: { code, message, errors: [{ reason, ... }] } }`; the
 * OAuth token endpoint uses `{ error, error_description }`. The parsed body is
 * kept alongside the status and a short readable message is derived, surfacing
 * the first machine-readable `reason` (e.g. quotaExceeded, forbidden).
 */
export class GoogleSearchConsoleError extends Error {
  readonly status: number;
  readonly body?: unknown;

  constructor(status: number, body: unknown) {
    super(`HTTP ${status}: ${formatErrorBody(body)}`);
    this.name = "GoogleSearchConsoleError";
    this.status = status;
    this.body = body;
  }
}

/** Turns a parsed Google API error body into a short, readable message. */
function formatErrorBody(body: unknown): string {
  if (body == null) return "(no body)";
  if (typeof body === "string") return body.slice(0, 500);
  if (typeof body !== "object") return String(body);
  const obj = body as Record<string, unknown>;

  // OAuth token endpoint style: { error: "invalid_grant", error_description: "..." }
  if (typeof obj.error === "string") {
    const description = typeof obj.error_description === "string" ? `: ${obj.error_description}` : "";
    return `${obj.error}${description}`.slice(0, 500);
  }

  // Google API envelope: { error: { code, message, errors: [{ reason, ... }], status? } }
  const err = (typeof obj.error === "object" && obj.error !== null ? obj.error : obj) as Record<string, unknown>;
  if (typeof err.message === "string") {
    const first = Array.isArray(err.errors) ? (err.errors[0] as Record<string, unknown> | undefined) : undefined;
    const reason =
      typeof first?.reason === "string" ? first.reason : typeof err.status === "string" ? err.status : undefined;
    const tag = reason ? `[${reason}] ` : "";
    return `${tag}${err.message}`.slice(0, 500);
  }

  return JSON.stringify(obj).slice(0, 500);
}
