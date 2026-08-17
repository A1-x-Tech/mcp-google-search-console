# Google Search Console: List Search Console properties — MCP tool

**Google Search Console MCP tool:** Lists every Search Console property the authenticated account can access.

Technical name: `list_sites`

## What task it solves

> I want to list Search Console properties.

Lists every Search Console property the authenticated account can access.

## When to use it

Use this capability when you need “List Search Console properties” without doing the same work manually in the Google Search Console interface. It runs only when an AI client calls it.

## What to provide

No parameters are required.

## What it returns

Returns { siteEntry: [{ siteUrl, permissionLevel }] } where siteUrl is either a URL-prefix property ("https://example.com/") or a domain property ("sc-domain:example.com"), and permissionLevel is siteOwner, siteFullUser, siteRestrictedUser or siteUnverifiedUser.

## What changes in Google Search Console

The tool reads Google Search Console data and does not change it.

## Example request

> List Search Console properties in Google Search Console. Ask for any required identifiers that are missing.

## Errors and limitations

Call this FIRST: every other tool needs the siteUrl exactly as returned here — a near-match (missing trailing slash, wrong scheme, www vs non-www) is a different property and returns 403/404.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Add a property](./add-site.md) — `add_site`
- [Remove a property](./delete-site.md) — `delete_site`
- [Get one property](./get-site.md) — `get_site`

## Technical details

- **Impact:** read-only
- **Group:** Properties
- **Description source:** `list_sites` registration in `src/tools/sites.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
