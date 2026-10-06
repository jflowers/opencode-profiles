import type { PluginInput } from "@opencode-ai/plugin";

import { readMarker, resolveProfilePath } from "./lib/marker.js";
import { loadProfile } from "./lib/profiles.js";
import { mergeConfig, type OpenCodeConfig } from "./lib/merge.js";
import { PROFILES_DIR, MARKER_PATH } from "./lib/paths.js";

// ── Server plugin ────────────────────────────────────────────────────

/**
 * Profile Switcher server plugin.
 *
 * Reads the active profile marker on startup and merges the selected
 * profile into the OpenCode configuration via the `config` hook.
 *
 * @param _input - Plugin input (unused — no client or worktree needed).
 * @returns Hooks containing the `config` mutation hook.
 */
export default async function profileSwitcher(
  _input: PluginInput,
): Promise<{ config: (config: Record<string, unknown>) => Promise<void> }> {
  return {
    config: async (config: Record<string, unknown>): Promise<void> => {
      // 1. Read the marker file to determine the active profile.
      const markerName = await readMarker(MARKER_PATH);
      if (markerName === null) {
        // No active profile — leave config unchanged.
        return;
      }

      // 2. Resolve and validate the profile path.
      let profilePath: string;
      try {
        profilePath = await resolveProfilePath(PROFILES_DIR, markerName);
      } catch {
        console.error(
          `Profile plugin: Failed to resolve profile "${markerName}"`,
        );
        return;
      }

      // 3. Load and validate the profile file.
      let profile;
      try {
        profile = await loadProfile(profilePath);
      } catch {
        console.error(
          `Profile plugin: Failed to load profile "${markerName}"`,
        );
        return;
      }

      // 4. Merge the profile into the config in-place.
      // mergeConfig returns a new object, so we mutate the input config
      // by copying the merged fields back.
      const merged = mergeConfig(config as OpenCodeConfig, profile);
      Object.assign(config, merged);
    },
  };
}