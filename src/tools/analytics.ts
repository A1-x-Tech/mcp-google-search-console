import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GoogleSearchConsoleClient } from "../client.js";
import type { DimensionFilter } from "../types.js";
import { fail, ok, READ_ONLY, siteUrlSchema, ymdDate } from "./util.js";

export function registerAnalyticsTools(server: McpServer, client: GoogleSearchConsoleClient): void {
  server.registerTool(
    "search_analytics",
    {
      title: "Search Analytics (performance) query",
      annotations: READ_ONLY,
      description:
        "Runs a Search Analytics (performance) query for a property: clicks, impressions, CTR and average position from Google Search, grouped by the requested dimensions. Each returned row has keys[] (one value per requested dimension, in the same order) plus clicks, impressions, ctr (a FRACTION 0..1, not a percent) and position; rows are sorted by clicks descending. With no dimensions you get one totals row for the range. Dates are calendar dates in Pacific Time and end_date is INCLUSIVE; final data lags ~2-3 days behind (use data_state \"all\" for fresh, still-changing rows). Pagination: there is no page token — repeat with start_row increased by row_limit until a response comes back with no rows. When grouping by query/page some anonymized long-tail data is never returned, so summed rows will not match a dimensionless totals query. Quota: 1,200 queries/minute per site and per user.",
      inputSchema: {
        site_url: siteUrlSchema(),
        start_date: ymdDate().describe("First date of the range, YYYY-MM-DD, Pacific Time."),
        end_date: ymdDate().describe("Last date of the range, YYYY-MM-DD, Pacific Time, inclusive."),
        dimensions: z
          .array(z.enum(["date", "query", "page", "country", "device", "searchAppearance", "hour"]))
          .optional()
          .describe(
            'How to group rows; keys[] in each row follows this order. "country" values are ISO 3166-1 alpha-3 codes, "device" is DESKTOP/MOBILE/TABLET, "hour" requires data_state "hourly_all". Omit for one totals row.',
          ),
        search_type: z
          .enum(["web", "image", "video", "news", "discover", "googleNews"])
          .optional()
          .describe(
            'Which search surface to report: "web" (default), "image", "video", "news" (News tab of search), "discover" (Discover feed), "googleNews" (news.google.com and the app). discover/googleNews support a reduced dimension set — an unsupported combination returns the API\'s 400 verbatim.',
          ),
        filters: z
          .array(
            z.object({
              dimension: z
                .enum(["query", "page", "country", "device", "searchAppearance"])
                .describe("Which dimension this filter tests (need not be in the grouping dimensions)."),
              operator: z
                .enum(["equals", "notEquals", "contains", "notContains", "includingRegex", "excludingRegex"])
                .describe("Comparison operator; the regex operators use RE2 syntax (an invalid regex returns a 400)."),
              expression: z.string().describe("The value or RE2 pattern to match against."),
            }),
          )
          .optional()
          .describe(
            "Row filters, ALL combined with AND — the API has no OR across filters (run separate queries instead).",
          ),
        aggregation_type: z
          .enum(["auto", "byPage", "byProperty", "byNewsShowcasePanel"])
          .optional()
          .describe(
            'How metrics are aggregated: "auto" (default) lets the API decide, "byPage"/"byProperty" force it, "byNewsShowcasePanel" is for News Showcase. Affects how clicks/impressions are counted, not which rows exist.',
          ),
        row_limit: z
          .number()
          .int()
          .min(1)
          .max(25000)
          .optional()
          .describe("Max rows to return (1..25000; API default 1000)."),
        start_row: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("0-based row offset for pagination (default 0). A response with no rows means the end."),
        data_state: z
          .enum(["final", "all", "hourly_all"])
          .optional()
          .describe(
            '"final" (default) — only finalized data; "all" — include fresh data still subject to change; "hourly_all" — required when grouping by hour (recent data only).',
          ),
      },
    },
    async ({
      site_url,
      start_date,
      end_date,
      dimensions,
      search_type,
      filters,
      aggregation_type,
      row_limit,
      start_row,
      data_state,
    }) => {
      try {
        return ok(
          await client.searchAnalytics({
            siteUrl: site_url,
            startDate: start_date,
            endDate: end_date,
            dimensions,
            searchType: search_type,
            filters,
            aggregationType: aggregation_type,
            rowLimit: row_limit,
            startRow: start_row,
            dataState: data_state,
          }),
        );
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "get_top_queries",
    {
      title: "Top search queries",
      annotations: READ_ONLY,
      description:
        "Convenience wrapper over search_analytics for the most common ask: the top search queries for a property, sorted by clicks descending (the API's default order). Each row has keys[0] = the query string plus clicks, impressions, ctr (a FRACTION 0..1) and position. Dates are calendar dates in Pacific Time, end_date inclusive; final data lags ~2-3 days. Anonymized long-tail queries are never returned. Same endpoint and quota as search_analytics — use search_analytics directly for other dimensions, pagination, fresh data or regex filters.",
      inputSchema: {
        site_url: siteUrlSchema(),
        start_date: ymdDate().describe("First date of the range, YYYY-MM-DD, Pacific Time."),
        end_date: ymdDate().describe("Last date of the range, YYYY-MM-DD, Pacific Time, inclusive."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(25000)
          .optional()
          .describe("How many top queries to return (1..25000; default 100)."),
        page_filter: z
          .string()
          .optional()
          .describe('Only count traffic to pages whose URL CONTAINS this substring, e.g. "/blog/".'),
        country: z
          .string()
          .optional()
          .describe('Only count traffic from this country — ISO 3166-1 alpha-3 code, e.g. "usa".'),
        device: z
          .enum(["DESKTOP", "MOBILE", "TABLET"])
          .optional()
          .describe("Only count traffic from this device class."),
      },
    },
    async ({ site_url, start_date, end_date, limit, page_filter, country, device }) => {
      try {
        const filters: DimensionFilter[] = [];
        if (page_filter) filters.push({ dimension: "page", operator: "contains", expression: page_filter });
        if (country) filters.push({ dimension: "country", operator: "equals", expression: country });
        if (device) filters.push({ dimension: "device", operator: "equals", expression: device });
        return ok(
          await client.searchAnalytics({
            siteUrl: site_url,
            startDate: start_date,
            endDate: end_date,
            dimensions: ["query"],
            filters: filters.length > 0 ? filters : undefined,
            rowLimit: limit ?? 100,
          }),
        );
      } catch (e) {
        return fail(e);
      }
    },
  );
}
