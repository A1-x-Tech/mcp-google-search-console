# Google Search Console: Remove a property — MCP tool

**Google Search Console MCP tool:** Removes (unlinks) a property from the account's Search Console set.

Technical name: `delete_site`

## What task it solves

> I want to remove a property.

Removes (unlinks) a property from the account's Search Console set.

## When to use it

Use this capability when you need “Remove a property” without doing the same work manually in the Google Search Console interface. It runs only when an AI client calls it.

## What to provide

- `site_url` — **required**. The property EXACTLY as registered in Search Console. Two formats: URL-prefix — a full URL with scheme and trailing slash, e.g. "https://example.com/" (http/https and www/non-www are different properties), or domain property — "sc-domain:example.com" (no scheme, no slash). A mismatched value returns 403/404; list_sites shows the exact registered values.

## What it returns

Returns compact JSON from the upstream API or a clear MCP tool error. The exact fields depend on the operation and are documented in the technical reference.

## What changes in Google Search Console

The source marks the entire “Remove a property” call as destructive. The exact effect depends on the selected action and is described below; review the parameters and reversibility before calling it.

## Example request

> Remove a property in Google Search Console. Ask for any required identifiers that are missing. Show me the exact change and wait for confirmation first.

## Errors and limitations

No data is deleted and other owners keep their access — this only removes the property from THIS account's list; it can be re-added later. Success is an empty API response (surfaced as { ok: true, removed }). Requires the full webmasters OAuth scope.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Add a property](./add-site.md) — `add_site`
- [Get one property](./get-site.md) — `get_site`
- [List Search Console properties](./list-sites.md) — `list_sites`

## Technical details

- **Impact:** destructive operation
- **Group:** Properties
- **Description source:** `delete_site` registration in `src/tools/sites.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
