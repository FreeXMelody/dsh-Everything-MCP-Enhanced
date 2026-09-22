import { EverythingSearchInput } from "./types.js";

export const DEFAULT_NOISE_PATTERNS = [
  "node_modules",
  ".git",
  ".venv",
  "venv",
  "__pycache__",
  "dist",
  "build",
  ".npm-cache",
  "site-packages"
];

export interface BuiltQuery {
  query: string;
  matchPath: boolean;
}

export function buildSearchQuery(input: EverythingSearchInput): BuiltQuery {
  const parts: string[] = [];
  let matchPath = input.match_path ?? false;

  // 1. Path parameter handling
  if (input.path && input.path.trim()) {
    let p = input.path.trim().replace(/\//g, "\\");
    // Normalize "C:" or "C" -> "C:\\"
    if (/^[a-zA-Z]:?$/.test(p)) {
      p = p.endsWith(":") ? `${p}\\` : `${p}:\\`;
    }
    // Quote path if it contains spaces and isn't already quoted
    if (p.includes(" ") && !p.startsWith('"')) {
      p = `"${p}"`;
    }
    parts.push(p);
    matchPath = true;
  }

  // 2. Core query
  parts.push(input.query.trim());

  // 3. Preset noise exclusions
  if (input.exclude_noise !== false) {
    for (const noise of DEFAULT_NOISE_PATTERNS) {
      parts.push(`!path:${noise}`);
    }
  }

  // 4. Custom exclusions
  if (input.exclude) {
    const customList = Array.isArray(input.exclude) ? input.exclude : [input.exclude];
    for (const item of customList) {
      const trimmed = item.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith(".")) {
        parts.push(`!ext:${trimmed.slice(1)}`);
      } else {
        parts.push(`!path:${trimmed}`);
      }
    }
  }

  return {
    query: parts.join(" "),
    matchPath
  };
}
