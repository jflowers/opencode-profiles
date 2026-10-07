# Contract: Config Merge Hook

**Feature**: Profile Switcher Plugin | **Version**: 1.0.0

## Overview

The server plugin provides a `config` hook that merges the active profile's settings into the OpenCode configuration on startup. This hook runs every time OpenCode loads its configuration, including after a profile switch triggers a restart.

## Hook Registration

```typescript
// Exported from index.ts as a PluginModule
export default {
  id: "profile-switcher",
  server: async (input) => {
    return {
      config: (cfg) => {
        // Merge profile into cfg
      },
    };
  },
} satisfies PluginModule;
```

## Config Hook Contract

### Input

The `config` hook receives the mutable OpenCode configuration object (`cfg`). The hook modifies this object in place.

### Processing

1. Read the marker file at `~/.config/opencode/.current-profile`
2. If marker is empty or missing → no-op (return without changes)
3. Validate marker content (reject path traversal characters like `../`, only allow safe characters: alphanumeric, hyphens, underscores)
4. Construct profile path: `~/.config/opencode/profiles/{marker}.jsonc`
5. Read and parse the profile file
6. If profile file is missing or malformed → log error, no-op
7. Merge profile fields into `cfg` (see merge rules below)

### Merge Rules

Only fields explicitly present in the profile file are overridden:

| Profile Field | Config Target | Merge Behavior |
|---------------|---------------|----------------|
| `model` | `cfg.model` | Replace if present |
| `small_model` | `cfg.small_model` | Replace if present |
| `agent.{name}.model` | `cfg.agent.{name}.model` | Replace per-agent if present; other agents unchanged |
| `provider.{name}` | `cfg.provider.{name}` | Merge at provider level if present |

**Key principle**: Unspecified fields are never touched. If a profile only sets `model`, only `cfg.model` changes — everything else stays as-is.

### Output

The modified `cfg` object. No return value — the hook mutates the config object in place.

### Error Handling

| Error | Behavior |
|-------|----------|
| Marker file missing | No-op (default config unchanged) |
| Marker references non-existent profile | Log error, no-op (default config unchanged) — per US3 Scenario 2 |
| Profile file contains malformed JSON | Log error, skip (default config unchanged) — per FR-007 |
| Profile file read error (permissions, etc.) | Log error, no-op |
| Profiles directory missing | No-op (default config unchanged) — per FR-008 |

All errors are logged via `console.error()` with the prefix `"Profile plugin:"`. Error messages MUST NOT include profile file contents or full filesystem paths beyond the profile name, to prevent information leakage.

## Filesystem Contract

### Reads

| Path | Purpose | When |
|------|---------|------|
| `~/.config/opencode/.current-profile` | Read active profile name | On every config load |
| `~/.config/opencode/profiles/{name}.jsonc` | Read profile configuration | On every config load (if marker exists) |

### Writes

None. The server plugin never writes to the filesystem.

## Dependencies

- `@opencode-ai/plugin` — `Plugin` type
- `@opencode-ai/core/fs` — `readJson` function for profile parsing
- `path` — `join` for path construction
- `Bun` — `Bun.file().textSync()` for marker reading