import type { ProfileFile } from "./schemas.js";

/**
 * Minimal representation of an OpenCode configuration object.
 * Only the fields that profiles can override are typed; the config
 * may contain additional fields that are preserved as-is.
 */
export interface OpenCodeConfig {
  model?: string;
  small_model?: string;
  agent?: Record<string, { model?: string }>;
  provider?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Merges a profile into a base OpenCode configuration using shallow
 * field-level overrides. Only fields present in the profile are applied;
 * fields absent in the profile are left unchanged in the base config.
 *
 * Merge rules:
 * - `model` and `small_model`: direct override if present in profile.
 * - `agent`: shallow-merge per-agent entries — only specific agent
 *   model overrides from the profile are applied; other agent entries
 *   in the base config are preserved.
 * - `provider`: shallow-merge per-provider entries — profile provider
 *   configs override base provider configs for matching keys.
 *
 * @param baseConfig - The current OpenCode configuration.
 * @param profile - The profile to merge into the configuration.
 * @returns A new configuration object with profile overrides applied.
 */
const UNSAFE_KEY_PATTERN = /^(__proto__|constructor|prototype)$/;
const UNSAFE_KEY_WARNING = "Profile plugin: Skipped unsafe record key";

/**
 * Returns this record's entries, filtering out unsafe prototype-pollution keys.
 *
 * @returns Safe key-value pairs, or an empty array if the record is undefined.
 */
function safeEntries(record: Record<string, unknown> | undefined): [string, unknown][] {
  if (!record) return [];
  return Object.entries(record).filter(([key]) => {
    if (UNSAFE_KEY_PATTERN.test(key)) {
      console.error(`${UNSAFE_KEY_WARNING} "${key}"`);
      return false;
    }
    return true;
  });
}

export function mergeConfig(baseConfig: OpenCodeConfig, profile: ProfileFile): OpenCodeConfig {
  // Start with a shallow copy of the base config so we don't mutate the original.
  const merged: OpenCodeConfig = { ...baseConfig };

  // ── Top-level scalar fields ──────────────────────────────────────
  if (profile.model !== undefined) {
    merged.model = profile.model;
  }
  if (profile.small_model !== undefined) {
    merged.small_model = profile.small_model;
  }

  // ── Agents: shallow-merge per-agent entries ──────────────────────
  if (profile.agent !== undefined) {
    const baseAgents = baseConfig.agent ?? {};
    const mergedAgents: Record<string, { model?: string }> = { ...baseAgents };
    for (const [agentName, agentEntry] of safeEntries(profile.agent)) {
      mergedAgents[agentName] = {
        ...baseAgents[agentName],
        ...(agentEntry as Record<string, unknown>),
      };
    }
    merged.agent = mergedAgents;
  }

  // ── Providers: shallow-merge per-provider entries ────────────────
  if (profile.provider !== undefined) {
    const baseProviders = (baseConfig.provider ?? {}) as Record<string, unknown>;
    const mergedProviders: Record<string, unknown> = { ...baseProviders };
    for (const [providerName, providerConfig] of safeEntries(profile.provider)) {
      const config = providerConfig as Record<string, unknown>;
      const sanitized: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(config)) {
        if (UNSAFE_KEY_PATTERN.test(k)) {
          console.error(`${UNSAFE_KEY_WARNING} "${k}"`);
          continue;
        }
        if (k === "options" && v && typeof v === "object" && !Array.isArray(v)) {
          const opts: Record<string, unknown> = {};
          for (const [ok] of Object.entries(v as Record<string, unknown>)) {
            if (UNSAFE_KEY_PATTERN.test(ok)) {
              console.error(`${UNSAFE_KEY_WARNING} "options.${ok}"`);
              continue;
            }
            opts[ok] = (v as Record<string, unknown>)[ok];
          }
          sanitized[k] = opts;
        } else {
          sanitized[k] = v;
        }
      }
      mergedProviders[providerName] = {
        ...(baseProviders[providerName] as Record<string, unknown> | undefined),
        ...sanitized,
      };
    }
    merged.provider = mergedProviders;
  }

  return merged;
}