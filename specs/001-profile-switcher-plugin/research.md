# Research: Profile Switcher Plugin

**Feature**: Profile Switcher Plugin | **Date**: 2026-10-05

## Research Tasks

### 1. OpenCode Plugin Architecture

**Decision**: Two-file plugin pattern (server + TUI) following existing project conventions.

**Rationale**: The existing `invoke-agent` and `review-dispatch` plugins in `.opencode/plugins/` use a single `index.ts` that exports a `PluginModule` with `{ id, server }`. The profile switcher requires both server-side config merging (on startup) and TUI interaction (the `/profile` dialog). The reference implementation in `docs/PROFILE_PLUGIN_GUIDE` confirms this two-file pattern:
- `index.ts` — server plugin exporting `{ config }` for config merging
- `tui.tsx` — TUI plugin exporting `{ tui }` for the `/profile` command

**Alternatives considered**:
- Single-file plugin combining both concerns: rejected because OpenCode's plugin system separates server and TUI concerns, and the existing project follows this separation.
- External CLI tool: rejected because the spec requires a `/profile` slash command within the TUI.

### 2. Profile File Format

**Decision**: Profile files use the same JSONC format as `opencode.jsonc`, supporting `model`, `small_model`, `agent` (per-agent model overrides), and `provider` fields.

**Rationale**: FR-010 requires profile files to use the same format as OpenCode configuration. The in-repository design guide (`docs/PROFILE_PLUGIN_GUIDE.md`) confirms the format:
```jsonc
{
  "model": "provider/model-id@variant",
  "small_model": "provider/model-id@variant",
  "agent": {
    "agentName": { "model": "provider/model-id" }
  },
  "provider": {
    "providerName": {
      "options": { "apiKey": "{env:VAR_NAME}" }
    }
  }
}
```

**Alternatives considered**:
- YAML profiles: rejected because FR-010 requires JSONC format matching `opencode.jsonc`.
- TOML profiles: rejected for same reason.

### 3. Config Merging Strategy

**Decision**: Shallow merge — only fields explicitly defined in the profile file override the active config. Unspecified fields retain their existing values.

**Rationale**: FR-009 requires preserving unspecified configuration fields. The reference implementation demonstrates this pattern: check each field for existence before assigning. This is a shallow merge at the top-level keys (`model`, `small_model`, `agent`, `provider`), with a deeper merge for `agent` sub-keys.

**Alternatives considered**:
- Deep merge of all nested objects: rejected because it could unintentionally carry over stale nested defaults. Shallow merge is simpler and matches the spec requirement.
- Full config replacement: rejected because FR-009 explicitly requires preserving unspecified fields.

### 4. Instance Restart Mechanism

**Decision**: Use `api.client.config.update({})` to trigger a config reload/restart after saving the profile marker.

**Rationale**: The in-repository design guide (`docs/PROFILE_PLUGIN_GUIDE.md`) uses this pattern. Note: the reference guide does not include provider merge logic; the implementation must extend it per FR-005. The TUI plugin saves the marker file, then calls `api.client.config.update({})` which triggers OpenCode to re-read configuration (including the server plugin's `config` hook, which reads the marker and applies the profile). The restart is handled by OpenCode's runtime.

**Alternatives considered**:
- Direct process restart via `Bun.spawn`: rejected because it would break the TUI session. The OpenCode API provides a managed restart.
- File watcher-based reload: rejected as overly complex; the explicit `config.update()` call is simpler and more predictable.

### 5. TUI Dialog Pattern

**Decision**: Use `api.ui.DialogSelect` component for the profile selection dialog.

**Rationale**: The in-repository design guide (`docs/PROFILE_PLUGIN_GUIDE.md`) uses `DialogSelect` with `title`, `options` (array of `{ title, value, description, current }`), and `onSelect` callback. This is the standard OpenCode TUI pattern for selection dialogs. The `current` flag indicates the active profile.

**Alternatives considered**:
- Custom dialog component: rejected because `DialogSelect` is the standard OpenCode pattern and provides the needed functionality.
- Command palette approach: rejected because a dialog with profile descriptions is more user-friendly.

### 6. Filesystem Access Patterns

**Decision**: Use `@opencode-ai/core/fs` for `glob` and `readJson`, and `Bun.file`/`Bun.write` for marker file I/O.

**Rationale**: The in-repository design guide (`docs/PROFILE_PLUGIN_GUIDE.md`) uses these exact APIs. `glob` discovers `*.jsonc` files in the profiles directory. `Bun.file().textSync()` reads the marker. `Bun.write()` persists the selection. The existing `invoke-agent` plugin uses `node:fs/promises` for file I/O, but the reference guide uses Bun-native APIs which are simpler for this use case.

**Alternatives considered**:
- `node:fs/promises` for all I/O: viable but Bun-native APIs are simpler for synchronous marker reads.
- `fs.readFileSync`: rejected because Bun APIs are the idiomatic choice for OpenCode plugins.

### 7. Error Handling Strategy

**Decision**: Graceful degradation — skip malformed profiles, handle missing directory, log errors without crashing.

**Rationale**: FR-007 and FR-008 require this. The in-repository design guide (`docs/PROFILE_PLUGIN_GUIDE.md`) wraps profile loading in try/catch and logs errors to console. Error messages MUST NOT include profile file contents or full paths beyond the profile name, to prevent information leakage. For the TUI plugin, missing profiles result in an empty dialog with a helpful message. For the server plugin, a missing marker or malformed profile results in a no-op (default config unchanged).

**Alternatives considered**:
- Strict validation with user-facing errors: rejected because it would block OpenCode startup if a profile is malformed.
- Silent failure without logging: rejected because it makes debugging impossible.

### 8. Testing Strategy

**Decision**: vitest 5.x with `@vitest/coverage-v8`, following existing project conventions. Test files co-located with source files.

**Rationale**: AGENTS.md specifies vitest 5.x and `@vitest/coverage-v8`. Existing plugins use this setup. The testing strategy follows the TypeScript convention pack (TC-001 through TC-008):
- Unit tests for profile parsing, config merging, marker I/O
- Mocked filesystem for all I/O operations (TC-002)
- Error path coverage for malformed files, missing directories, missing markers (TC-003)
- Independent tests with no shared mutable state (TC-005)

**Coverage targets**: 80%+ line coverage, 100% branch coverage for error paths.

### 9. Profile Discovery

**Decision**: Scan `~/.config/opencode/profiles/` for `*.jsonc` files on each `/profile` invocation. Profile names derived from filenames minus `.jsonc` extension.

**Rationale**: FR-002 requires scanning the profiles directory. SC-003 requires new profiles to appear within one invocation. Dynamic scanning on each invocation (rather than caching) ensures immediate availability. The in-repository design guide (`docs/PROFILE_PLUGIN_GUIDE.md`) uses `glob(join(PROFILES_DIR, "*.jsonc"))` (non-recursive) and derives names via `f.split("/").pop()!.replace(/\.jsonc$/, "")`.

**Alternatives considered**:
- Cached profile list with manual refresh: rejected because SC-003 requires immediate availability.
- File watcher for real-time updates: rejected as overly complex; scanning on invocation is sufficient.

### 10. Marker File Persistence

**Decision**: Store the active profile name as plain text in `~/.config/opencode/.current-profile`. Read on startup, write on selection.

**Rationale**: FR-004 requires persistence. A simple text file is the simplest persistent storage mechanism. The in-repository design guide (`docs/PROFILE_PLUGIN_GUIDE.md`) uses `Bun.file(PROFILE_MARKER).textSync().trim()` for reading and `Bun.write(PROFILE_MARKER, item.value)` for writing. The marker file MUST be created with restrictive permissions (0o644) per Constitution V.

**Alternatives considered**:
- JSON marker file: rejected as unnecessarily complex for a single string value.
- Environment variable: rejected because it doesn't survive session restarts.
- OpenCode's built-in state storage: rejected because the reference guide uses filesystem persistence and it's simpler.

## Resolved Unknowns

All NEEDS CLARIFICATION items from Technical Context have been resolved through research:

| Unknown | Resolution |
|---------|------------|
| Plugin architecture | Two-file pattern: server (`index.ts`) + TUI (`tui.tsx`) |
| Config merge strategy | Shallow merge, field-by-field override |
| Instance restart | `api.client.config.update({})` via OpenCode API |
| TUI dialog component | `DialogSelect` from `api.ui` |
| Filesystem APIs | `@opencode-ai/core/fs` for glob/readJson, Bun for marker I/O |
| Error handling | Try/catch with console.error logging, graceful degradation |
| Testing framework | vitest 5.x with `@vitest/coverage-v8` |
| Profile discovery | Dynamic glob scan on each invocation |
| Marker persistence | Plain text file read/write with Bun APIs |