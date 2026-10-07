import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { ProfileFileSchema, type ProfileFile, type ProfileOption } from "./schemas.js";
import { getErrorMessage } from "./errors.js";

// ── JSONC comment stripping ──────────────────────────────────────────
// Strips // line comments and /* */ block comments from JSONC text
// before passing to JSON.parse. Handles strings (does not strip
// comment-like sequences inside quoted strings).

/**
 * Strips single-line (//) and block (/* *​/) comments from JSONC text.
 * Uses a simple state machine that tracks whether the current position
 * is inside a double-quoted string to avoid stripping comment-like
 * sequences within string values.
 */
function stripJsonComments(text: string): string {
  const result: string[] = [];
  let i = 0;
  let inString = false;
  let inSingleLineComment = false;
  let inBlockComment = false;

  while (i < text.length) {
    if (inSingleLineComment) {
      if (text[i] === "\n") {
        inSingleLineComment = false;
        result.push(text[i]);
      }
      i++;
      continue;
    }

    if (inBlockComment) {
      if (text[i] === "*" && text[i + 1] === "/") {
        inBlockComment = false;
        i += 2;
      } else {
        i++;
      }
      continue;
    }

    if (inString) {
      if (text[i] === "\\") {
        // Escape sequence — skip the next character
        result.push(text[i]);
        i++;
        if (i < text.length) {
          result.push(text[i]);
        }
      } else if (text[i] === '"') {
        inString = false;
        result.push(text[i]);
      } else {
        result.push(text[i]);
      }
      i++;
      continue;
    }

    // Not in string, not in comment
    if (text[i] === '"') {
      inString = true;
      result.push(text[i]);
      i++;
    } else if (text[i] === "/" && text[i + 1] === "/") {
      inSingleLineComment = true;
      i += 2;
    } else if (text[i] === "/" && text[i + 1] === "*") {
      inBlockComment = true;
      i += 2;
    } else {
      result.push(text[i]);
      i++;
    }
  }

  return result.join("");
}

// ── Profile loading ──────────────────────────────────────────────────

/**
 * Reads and parses a single JSONC profile file.
 *
 * @param path - Absolute path to the .jsonc profile file.
 * @returns The parsed profile, validated against ProfileFileSchema.
 * @throws If the file cannot be read or the JSON is invalid.
 */
export async function loadProfile(path: string): Promise<ProfileFile> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error: unknown) {
    console.error(`Profile plugin: Failed to read profile file: ${getErrorMessage(error)}`);
    throw new Error(`Profile plugin: Failed to read profile file`);
  }

  const stripped = stripJsonComments(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch (error: unknown) {
    console.error(`Profile plugin: Failed to parse JSONC: ${getErrorMessage(error)}`);
    throw new Error(`Profile plugin: Failed to parse JSONC`);
  }

  const result = ProfileFileSchema.safeParse(parsed);
  if (!result.success) {
    console.error(`Profile plugin: Invalid profile schema — fields do not match expected shape`);
    throw new Error(`Profile plugin: Invalid profile schema`);
  }

  return result.data;
}

// ── Non-throwing profile load ─────────────────────────────────────────

/**
 * Reads and parses a single JSONC profile file, returning null on failure.
 *
 * Unlike {@link loadProfile}, this function does not throw. It returns
 * null for any error condition (missing file, invalid JSON, schema
 * mismatch), making it suitable for discovery loops where invalid
 * profiles should be silently skipped.
 *
 * @param path - Absolute path to the .jsonc profile file.
 * @returns The parsed profile, or null if the file cannot be loaded.
 */
export async function tryLoadProfile(path: string): Promise<ProfileFile | null> {
  try {
    return await loadProfile(path);
  } catch {
    // loadProfile already logs via console.error — just swallow
    return null;
  }
}

// ── Profile discovery ────────────────────────────────────────────────

/**
 * Discovers all valid .jsonc profile files in the given directory.
 *
 * Each .jsonc file is loaded and validated via {@link tryLoadProfile}.
 * Files that fail to parse or do not match the expected schema are
 * silently skipped (logged via console.error by loadProfile).
 *
 * @param profilesDir - Absolute path to the profiles directory.
 * @returns An array of ProfileOption objects, one per valid profile.
 *   Returns an empty array if the directory does not exist.
 */
export async function discoverProfiles(profilesDir: string): Promise<ProfileOption[]> {
  let entries: string[];
  try {
    entries = await readdir(profilesDir);
  } catch (error: unknown) {
    const errnoError = error as { code?: string };
    if (errnoError.code === "ENOENT") {
      return [];
    }
    console.error(`Profile plugin: Failed to list profiles directory: ${getErrorMessage(error)}`);
    return [];
  }

  const jsoncFiles = entries.filter((entry) => extname(entry) === ".jsonc");

  const options: ProfileOption[] = [];
  for (const filename of jsoncFiles) {
    const name = filename.slice(0, -".jsonc".length);
    const path = join(profilesDir, filename);

    // Validate the profile file — skip silently if invalid.
    const profile = await tryLoadProfile(path);
    if (!profile) {
      continue;
    }

    options.push({
      name,
      path,
      isCurrent: false, // caller sets this based on marker
    });
  }

  return options;
}