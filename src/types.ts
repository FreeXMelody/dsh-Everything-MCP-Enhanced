import { z } from "zod";

export const SortFieldSchema = z.enum(["name", "path", "date_modified", "size"]);
export type SortField = z.infer<typeof SortFieldSchema>;

export const OutputFormatSchema = z.enum(["compact", "detailed"]);
export type OutputFormat = z.infer<typeof OutputFormatSchema>;

export const EverythingSearchInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe("Search expression, filename keywords, or wildcards (e.g. '*.ps1', 'config')."),
  path: z
    .string()
    .optional()
    .describe(
      "Optional drive or folder path to scope the search into (e.g. 'D:\\' or 'C:\\Projects')."
    ),
  exclude_noise: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      "Whether to automatically exclude noise dependencies (node_modules, .git, .venv, etc.). Default is true."
    ),
  exclude: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe("Optional extra keyword or pattern to exclude (e.g. ['dist', '.cache'])."),
  count: z
    .number()
    .int()
    .min(1)
    .max(5000)
    .optional()
    .default(100)
    .describe("Maximum number of results to return. Default is 100, max is 5000."),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .describe("Pagination offset (0-indexed). Default is 0."),
  format: OutputFormatSchema.optional()
    .default("compact")
    .describe(
      "Output format. 'compact' returns 1 line per file path (token-optimized); 'detailed' returns file size and modified dates. Default is 'compact'."
    ),
  sort: SortFieldSchema.optional().describe("Sort by field: 'name', 'path', 'date_modified', or 'size'."),
  ascending: z.boolean().optional().default(true).describe("Sort ascending when true, descending when false."),
  match_case: z.boolean().optional().default(false).describe("Case sensitive search."),
  whole_word: z.boolean().optional().default(false).describe("Match whole words only."),
  match_path: z.boolean().optional().default(false).describe("Match search query against full path."),
  regex: z.boolean().optional().default(false).describe("Treat query as a regular expression.")
});

export type EverythingSearchInput = z.infer<typeof EverythingSearchInputSchema>;

export interface EverythingRawResultItem {
  type: "file" | "folder";
  name: string;
  path: string;
  size?: number | string;
  date_modified?: string | number;
}

export interface EverythingRawResponse {
  totalResults: number;
  results: EverythingRawResultItem[];
}

export interface EverythingProcessedItem {
  fullPath: string;
  type: "file" | "folder";
  size?: number;
  dateModified?: string;
}
