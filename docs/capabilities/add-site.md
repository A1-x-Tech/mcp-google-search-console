# Google Search Console: Add a property — MCP tool

**Google Search Console MCP tool:** Adds a property to the account's Search Console set.

Technical name: `add_site`

## What task it solves

> I want to add a property.

Adds a property to the account's Search Console set.

## When to use it

Use this capability when you need “Add a property” without doing the same work manually in the Google Search Console interface. It runs only when an AI client calls it.

## What to provide

- `site_url` — **required**. The property EXACTLY as registered in Search Console. Two formats: URL-prefix — a full URL with scheme and trailing slash, e.g. "https://example.com/" (http/https and www/non-www are different properties), or domain property — "sc-domain:example.com" (no scheme, no slash). A mismatched value returns 403/404; list_sites shows the exact registered values.

## What it returns

Returns compact JSON from the upstream API or a clear MCP tool error. The exact fields depend on the operation and are documented in the technical reference.

## What changes in Google Search Console

The tool changes real Google Search Console data as described above. The server does not promise an automatic rollback.

## Example request

> Add a property in Google Search Console. Ask for any required identifiers that are missing.

## Errors and limitations

The property starts UNVERIFIED (permissionLevel siteUnverifiedUser) and most data calls will return 403 until it is verified — verification happens through the Search Console UI or the separate Site Verification API, not through this API. Success is an empty API response (surfaced as { ok: true, added }). Requires the full webmasters OAuth scope (the readonly scope cannot mutate).

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Remove a property](./delete-site.md) — `delete_site`
- [Get one property](./get-site.md) — `get_site`
- [List Search Console properties](./list-sites.md) — `list_sites`

## Technical details

- **Impact:** changes data
- **Group:** Properties
- **Description source:** `add_site` registration in `src/tools/sites.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
