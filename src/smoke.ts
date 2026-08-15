import { ConfigError, CredentialsError, loadConfig } from "./config.js";
import { GoogleSearchConsoleClient } from "./client.js";

/**
 * Live READ-ONLY smoke check: lists the account's Search Console properties
 * (sites.list — the cheapest read the API has). Exercises the OAuth refresh
 * flow for real; nothing is written.
 */
async function main(): Promise<void> {
  const client = new GoogleSearchConsoleClient(loadConfig());
  const result = (await client.listSites()) as {
    siteEntry?: Array<{ siteUrl?: string; permissionLevel?: string }>;
  };
  const sites = result?.siteEntry ?? [];
  console.log(
    JSON.stringify(
      {
        sites: sites.length,
        entries: sites.map((s) => ({ siteUrl: s.siteUrl, permissionLevel: s.permissionLevel })),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  // Missing or malformed credentials are a user error, not a bug: no stack.
  const userError = err instanceof ConfigError || err instanceof CredentialsError;
  console.error("smoke failed:", userError ? err.message : err);
  process.exit(1);
});
