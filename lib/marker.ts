import {
  readFile,
  writeFile,
  realpath,
} from "node:fs/promises";
import { join, sep } from "node:path";
import { getErrorMessage } from "./errors.js";
import { PROFILE_NAME_PATTERN } from "./schemas.js";

export async function readMarker(markerPath: string): Promise<string | null> {
  try {
    const text = await readFile(markerPath, "utf8");
    const name = text.trim();
    if (!name) {
      return null;
    }

    if (!PROFILE_NAME_PATTERN.test(name)) {
      console.error(
        `Profile plugin: Invalid profile name in marker file: "${name}" contains unsafe characters`,
      );
      return null;
    }

    return name;
  } catch (error: unknown) {
    const errnoError = error as { code?: string };
    if (errnoError.code === "ENOENT") {
      return null;
    }
    console.error(`Profile plugin: Failed to read marker file: ${getErrorMessage(error)}`);
    return null;
  }
}

export async function writeMarker(markerPath: string, profileName: string): Promise<void> {
  if (!PROFILE_NAME_PATTERN.test(profileName)) {
    throw new Error(
      `Profile plugin: Invalid profile name "${profileName}" — only alphanumeric, hyphen, and underscore allowed`,
    );
  }

  try {
    await writeFile(markerPath, profileName, { encoding: "utf8", mode: 0o644 });
  } catch (error: unknown) {
    console.error(`Profile plugin: Failed to write marker file: ${getErrorMessage(error)}`);
    throw new Error(`Profile plugin: Failed to write marker file`);
  }
}

export async function resolveProfilePath(profilesDir: string, profileName: string): Promise<string> {
  if (!PROFILE_NAME_PATTERN.test(profileName)) {
    throw new Error(
      `Profile plugin: Invalid profile name "${profileName}"`,
    );
  }

  const resolvedDir = await realpath(profilesDir).catch(() => {
    throw new Error(`Profile plugin: Profiles directory does not exist`);
  });

  const candidatePath = join(resolvedDir, `${profileName}.jsonc`);

  let resolvedPath: string;
  try {
    resolvedPath = await realpath(candidatePath);
  } catch {
    throw new Error(`Profile plugin: Profile "${profileName}" not found`);
  }

  if (!resolvedPath.startsWith(resolvedDir + sep)) {
    throw new Error(
      `Profile plugin: Profile "${profileName}" resolves outside the profiles directory`,
    );
  }

  return resolvedPath;
}
