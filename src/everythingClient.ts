import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  EverythingProcessedItem,
  EverythingRawResponse,
  EverythingSearchInput
} from "./types.js";
import { buildSearchQuery } from "./queryBuilder.js";

const FILETIME_EPOCH_DIFF = 11644473600000n; // ms between 1601-01-01 and 1970-01-01
const FILETIME_TICKS_PER_MS = 10000n;

export function filetimeToISO(filetime: string | number | undefined): string | undefined {
  if (filetime === undefined || filetime === null) return undefined;
  try {
    const ft = BigInt(String(filetime));
    const ms = ft / FILETIME_TICKS_PER_MS - FILETIME_EPOCH_DIFF;
    return new Date(Number(ms)).toISOString();
  } catch {
    return String(filetime);
  }
}

export function formatBytes(bytes: number | string | undefined): string {
  if (bytes === undefined || bytes === null) return "0 B";
  const b = Number(bytes);
  if (isNaN(b)) return String(bytes);
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function tryReadEverythingIniPort(): number | null {
  const possiblePaths = [
    "D:\\Everything\\Everything.ini",
    "C:\\Program Files\\Everything\\Everything.ini",
    join(process.env.APPDATA || "", "Everything", "Everything.ini"),
    join(process.env.LOCALAPPDATA || "", "Everything", "Everything.ini")
  ];

  for (const iniPath of possiblePaths) {
    if (existsSync(iniPath)) {
      try {
        const text = readFileSync(iniPath, "utf8");
        const match = text.match(/^\s*http_server_port\s*=\s*(\d+)/m);
        if (match) {
          const port = parseInt(match[1], 10);
          if (port > 0 && port < 65536) return port;
        }
      } catch {}
    }
  }
  return null;
}

export class EverythingClient {
  private explicitBaseUrl?: string;
  private resolvedBaseUrl?: string;

  constructor(baseUrl?: string) {
    this.explicitBaseUrl = baseUrl || process.env.EVERYTHING_BASE_URL;
  }

  public async getBaseUrl(): Promise<string> {
    if (this.resolvedBaseUrl) return this.resolvedBaseUrl;

    if (this.explicitBaseUrl) {
      this.resolvedBaseUrl = this.explicitBaseUrl.replace(/\/$/, "");
      return this.resolvedBaseUrl;
    }

    const detectedPort = tryReadEverythingIniPort();
    const candidatePorts = [
      detectedPort,
      8011,
      80,
      8080,
      54321
    ].filter((p): p is number => typeof p === "number");

    // Probe candidate ports
    for (const port of Array.from(new Set(candidatePorts))) {
      const url = `http://127.0.0.1:${port}`;
      try {
        const res = await fetch(`${url}/?search=Everything.exe&json=1&count=1`, {
          signal: AbortSignal.timeout(600)
        });
        if (res.ok) {
          this.resolvedBaseUrl = url;
          return url;
        }
      } catch {}
    }

    // Fallback default
    this.resolvedBaseUrl = "http://127.0.0.1:8011";
    return this.resolvedBaseUrl;
  }

  public async search(input: EverythingSearchInput): Promise<{
    totalResults: number;
    items: EverythingProcessedItem[];
    executedQuery: string;
    durationMs: number;
  }> {
    const startTime = Date.now();
    const baseUrl = await this.getBaseUrl();
    const { query, matchPath } = buildSearchQuery(input);

    const url = new URL(`${baseUrl}/`);
    url.searchParams.set("json", "1");
    url.searchParams.set("search", query);
    url.searchParams.set("count", String(input.count ?? 100));
    url.searchParams.set("offset", String(input.offset ?? 0));
    url.searchParams.set("path_column", "1");
    url.searchParams.set("size_column", "1");
    url.searchParams.set("date_modified_column", "1");

    if (matchPath) url.searchParams.set("matchpath", "1");
    if (input.match_case) url.searchParams.set("case", "1");
    if (input.whole_word) url.searchParams.set("wholeword", "1");
    if (input.regex) url.searchParams.set("regex", "1");

    if (input.sort) {
      url.searchParams.set("sort", input.sort);
      url.searchParams.set("ascending", input.ascending === false ? "0" : "1");
    }

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(
        `Everything HTTP server returned status ${response.status}: ${response.statusText}. Please verify Everything is running and HTTP Server is enabled.`
      );
    }

    const rawData = (await response.json()) as EverythingRawResponse;
    const durationMs = Date.now() - startTime;

    const items: EverythingProcessedItem[] = (rawData.results || []).map((r) => {
      // Correctly join path and name, handling trailing slash
      let fullPath = r.name;
      if (r.path) {
        fullPath = r.path.endsWith("\\") ? `${r.path}${r.name}` : `${r.path}\\${r.name}`;
      }
      return {
        fullPath,
        type: r.type || "file",
        size: r.size !== undefined ? Number(r.size) : undefined,
        dateModified: filetimeToISO(r.date_modified)
      };
    });

    return {
      totalResults: rawData.totalResults ?? items.length,
      items,
      executedQuery: query,
      durationMs
    };
  }

  public async checkHealth(): Promise<{
    reachable: boolean;
    baseUrl: string;
    totalIndexed?: number;
    latencyMs: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      const baseUrl = await this.getBaseUrl();
      const res = await fetch(`${baseUrl}/?search=&json=1&count=1`, {
        signal: AbortSignal.timeout(3000)
      });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        const data = (await res.json()) as EverythingRawResponse;
        return {
          reachable: true,
          baseUrl,
          totalIndexed: data.totalResults,
          latencyMs
        };
      }
      return {
        reachable: false,
        baseUrl,
        latencyMs,
        error: `HTTP ${res.status}: ${res.statusText}`
      };
    } catch (err: any) {
      return {
        reachable: false,
        baseUrl: this.resolvedBaseUrl || "unknown",
        latencyMs: Date.now() - start,
        error: err?.message || String(err)
      };
    }
  }
}
