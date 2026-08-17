# Google Search Console: Get one property — MCP tool

**Google Search Console MCP tool:** Returns one property's entry: { siteUrl, permissionLevel }.

Technical name: `get_site`

## What task it solves

> I want to get one property.

Returns one property's entry: { siteUrl, permissionLevel }.

## When to use it

Use this capability when you need “Get one property” without doing the same work manually in the Google Search Console interface. It runs only when an AI client calls it.

## What to provide

- `site_url` — **required**. The property EXACTLY as registered in Search Console. Two formats: URL-prefix — a full URL with scheme and trailing slash, e.g. "https://example.com/" (http/https and www/non-www are different properties), or domain property — "sc-domain:example.com" (no scheme, no slash). A mismatched value returns 403/404; list_sites shows the exact registered values.

## What it returns

Returns one property's entry: { siteUrl, permissionLevel }.

## What changes in Google Search Console

The tool reads Google Search Console data and does not change it.

## Example request

> Get one property in Google Search Console. Ask for any required identifiers that are missing.

## Errors and limitations

A 404 means the value does not match any registered property — check the exact format (trailing slash, scheme, sc-domain: prefix) against list_sites output.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Add a property](./add-site.md) — `add_site`
- [Remove a property](./delete-site.md) — `delete_site`
- [List Search Console properties](./list-sites.md) — `list_sites`

## Technical details

- **Impact:** read-only
- **Group:** Properties
- **Description source:** `get_site` registration in `src/tools/sites.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
