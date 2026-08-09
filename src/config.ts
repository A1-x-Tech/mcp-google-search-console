import type { GoogleSearchConsoleConfig } from "./types.js";

/** Default Google Search Console API host (serves both webmasters/v3 and v1). */
const DEFAULT_BASE = "https://searchconsole.googleapis.com";

/**
 * A missing or malformed environment variable. Thrown instead of exiting on the
 * spot so index.ts can report the drop-off before the process dies; `reason` is
 * the machine-readable code that ships with that ping (never a variable's value).
 */
export class ConfigError extends Error {
  readonly reason: string;

  constructor(message: string, reason: string) {
    super(message);
    this.name = "ConfigError";
    this.reason = reason;
  }
}

function die(message: string, reason: string): never {
  throw new ConfigError(message, reason);
}

/**
 * Builds the client config from environment variables, throwing ConfigError if
 * the credentials are missing or incomplete.
 *
 *   GOOGLE_SEARCH_CONSOLE_CLIENT_ID      OAuth2 client id      (refresh flow, recommended)
 *   GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET  OAuth2 client secret  (refresh flow)
 *   GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN  OAuth2 refresh token  (refresh flow)
 *   GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN   static access token (alternative; expires in ~1h)
 *   GOOGLE_SEARCH_CONSOLE_API_BASE       API root override (default https://searchconsole.googleapis.com)
 *   GOOGLE_SEARCH_CONSOLE_TIMEOUT_MS     per-request timeout (default 60000)
 *   GOOGLE_SEARCH_CONSOLE_MAX_RETRIES    retries on transient errors (default 3)
 */
export function loadConfig(): GoogleSearchConsoleConfig {
  const clientId = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN;
  const accessToken = process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN;

  const oauthProvided = [clientId, clientSecret, refreshToken].filter(Boolean).length;
  if (oauthProvided > 0 && oauthProvided < 3) {
    die(
      "GOOGLE_SEARCH_CONSOLE_CLIENT_ID, GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET and GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN must be set together (OAuth2 refresh flow).",
      "incomplete_oauth_config",
    );
  }
  if (oauthProvided === 0 && !accessToken) {
    die(
      "Google OAuth credentials are required: set GOOGLE_SEARCH_CONSOLE_CLIENT_ID + GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET + GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN (recommended), or GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN with a short-lived access token.",
      "missing_credentials",
    );
  }

  const timeoutMs = Number(process.env.GOOGLE_SEARCH_CONSOLE_TIMEOUT_MS);
  const maxRetries = Number(process.env.GOOGLE_SEARCH_CONSOLE_MAX_RETRIES);

  return {
    clientId,
    clientSecret,
    refreshToken,
    accessToken,
    apiBase: process.env.GOOGLE_SEARCH_CONSOLE_API_BASE || DEFAULT_BASE,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 60_000,
    maxRetries: Number.isFinite(maxRetries) && maxRetries >= 0 ? maxRetries : 3,
  };
}
