# Data Model: Profile Switcher Plugin

**Feature**: Profile Switcher Plugin | **Date**: 2026-10-05

## Entities

### 1. Profile File

A `.jsonc` file in `~/.config/opencode/profiles/` containing configuration overrides.

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | `string` | No | Default model identifier (e.g., `"provider/model-id@variant"`) |
| `small_model` | `string` | No | Small/fast model identifier for lightweight tasks |
| `agent` | `Record<string, { model?: string }>` | No | Per-agent model overrides. Keys are agent names, values contain optional `model` field |
| `provider` | `Record<string, { options?: Record<string, string> }>` | No | Provider configuration (API keys, endpoints). Values reference env vars via `{env:VAR_NAME}` |

**Validation Rules**:
- File must have `.jsonc` extension (FR-002)
- File must contain valid JSONC (FR-007: malformed files are skipped)
- `model` and `small_model` must be non-empty strings if present
- `agent` keys must be non-empty strings; values must be objects with optional `model` string
- `provider` values must be objects; secrets must use `{env:VAR_NAME}` references, not inline values. The Zod schema SHOULD enforce this with a regex refinement on provider option values (e.g., `z.string().regex(/^\{env:[A-Z_][A-Z0-9_]*\}$/)` or a custom refinement) to prevent accidental inline secrets.

**Identity**: Profile name is the filename without the `.jsonc` extension (e.g., `anthropic.jsonc` → `"anthropic"`). Two profiles with different filenames but the same base name are distinct (Assumption).

**State**: Stateless — profiles are read-only files managed by the user. The plugin never writes to profile files.

### 2. Profile Marker

A persistent file at `~/.config/opencode/.current-profile` storing the name of the currently active profile.

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `profileName` | `string` | Yes | The name of the active profile (filename without `.jsonc`) |

**Validation Rules**:
- File contains a single line with the profile name (FR-004). The marker value MUST be validated to contain only safe characters (alphanumeric, hyphens, underscores) before use in path construction, to prevent path traversal attacks.
- If the referenced profile no longer exists, the system starts with default config (US3, Scenario 2)
- If the file is missing or empty, no profile is active (default config)

**State Transitions**:

```text
[No Marker] ──(user selects profile)──> [Marker: "anthropic"]
[Marker: "anthropic"] ──(user selects "openai")──> [Marker: "openai"]
[Marker: "anthropic"] ──(profile file deleted)──> [Marker: "anthropic" but profile missing → default config on restart]
```

### 3. Profile Selection Dialog

A TUI component presenting available profiles for interactive selection.

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `profiles` | `ProfileOption[]` | Yes | List of available profiles for display |
| `currentProfile` | `string \| null` | Yes | Name of the currently active profile (for visual indicator) |

**ProfileOption**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Profile display name (filename without `.jsonc`) |
| `path` | `string` | Yes | Full filesystem path to the profile file |
| `isCurrent` | `boolean` | Yes | Whether this profile is currently active |

**Validation Rules**:
- Dialog must display an empty state message when no profiles exist (Edge Case)
- Currently active profile must have a visual indicator (FR-003)
- Selecting the already-active profile should no-op (Edge Case)

### 4. Merged Configuration

The result of applying a profile's overrides to the active OpenCode configuration.

**Fields**: Same as the OpenCode configuration schema (`opencode.json`) — `model`, `small_model`, `agent`, `provider`, plus any other OpenCode config fields.

**Merge Rules** (FR-009):
- Only fields explicitly defined in the profile file are overridden
- Unspecified fields retain their existing values from the base config
- `agent` sub-keys are merged individually: only agents listed in the profile get overrides
- `provider` settings are merged at the provider level

## Entity Relationships

```text
Profile File (1..*) ──(discovered by)──> Profile Discovery
Profile Marker (0..1) ──(references)──> Profile File (0..1)
Profile Selection Dialog ──(displays)──> Profile File (1..*)
Profile Selection Dialog ──(writes)──> Profile Marker
Profile Marker ──(read by)──> Config Merge ──(produces)──> Merged Configuration
Profile File ──(read by)──> Config Merge
```

## Schema Definitions (Zod)

```typescript
// Profile file content schema
const ProfileFileSchema = z.object({
  model: z.string().optional(),
  small_model: z.string().optional(),
  agent: z.record(z.string(), z.object({
    model: z.string().optional(),
  })).optional(),
  provider: z.record(z.string(), z.object({
    options: z.record(z.string(), z.string()).optional(),
  })).optional(),
}).strict();

// Profile option for dialog display
const ProfileOptionSchema = z.object({
  name: z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/, "Profile name must contain only alphanumeric characters, hyphens, and underscores"),
  path: z.string().min(1),
  isCurrent: z.boolean(),
});
```