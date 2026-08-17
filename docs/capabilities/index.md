# Google Search Console MCP capabilities

This catalog contains 12 public pages—one for every registered MCP tool in `mcp-google-search-console`. Each page starts with the user's task, explains the result, and states whether the call changes real data.

Use this catalog to choose a ready-made capability. Full parameter schemas and API response details remain in the [technical reference](../TOOLS.md).

## Properties

- [Add a property](./add-site.md) — Adds a property to the account's Search Console set. **Impact:** changes data.
- [Remove a property](./delete-site.md) — Removes (unlinks) a property from the account's Search Console set. **Impact:** destructive operation.
- [Get one property](./get-site.md) — Returns one property's entry: { siteUrl, permissionLevel }. **Impact:** read-only.
- [List Search Console properties](./list-sites.md) — Lists every Search Console property the authenticated account can access. **Impact:** read-only.

## Sitemaps

- [Delete a sitemap](./delete-sitemap.md) — Removes a sitemap from Search Console. **Impact:** destructive operation.
- [Get one sitemap](./get-sitemap.md) — Returns one submitted sitemap's details (the same WmxSitemap shape as list_sitemaps): errors/warnings counts, isPending, lastSubmitted/lastDownloaded, and per-content-type submitted counts. **Impact:** read-only.
- [List sitemaps](./list-sitemaps.md) — Lists the sitemaps submitted for a property (or, with sitemap_index, the children of a sitemap index file). **Impact:** read-only.
- [Submit a sitemap](./submit-sitemap.md) — Submits (or resubmits) a sitemap for the property. **Impact:** changes data.

## Search analytics

- [Top search queries](./get-top-queries.md) — Convenience wrapper over search_analytics for the most common ask: the top search queries for a property, sorted by clicks descending (the API's default order). **Impact:** read-only.
- [Search Analytics (performance) query](./search-analytics.md) — Runs a Search Analytics (performance) query for a property: clicks, impressions, CTR and average position from Google Search, grouped by the requested dimensions. **Impact:** read-only.

## URL inspection

- [Inspect a URL's index status](./inspect-url.md) — Inspects a URL's status in the Google index (URL Inspection API). **Impact:** read-only.

## Additional API methods

- [Raw Search Console API call](./raw-request.md) — Escape hatch to call any Google Search Console API path directly, for requests the typed tools don't cover. **Impact:** destructive operation.

## For maintainers and publishers

- [MCP capability documentation contract](../CAPABILITY-DOCUMENTATION.md)
- [Technical tool reference](../TOOLS.md)
- [GitHub repository](https://github.com/A1-x-Tech/mcp-google-search-console)
