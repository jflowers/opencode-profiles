# OpenCode Profile Switcher

OpenCode plugin for seamless switching between configuration profiles via a
`/profile` slash command. Store multiple OpenCode configurations as `.jsonc`
files — switch between them instantly with a TUI dialog and automatic
instance restart.

## Installation

```bash
opencode plugin add @jflowers/opencode-profile-switcher@latest
```

This installs the package and adds it to your global OpenCode config.

## Quick Start

```bash
# 1. Create the profiles directory
mkdir -p ~/.config/opencode/profiles

# 2. Create a profile file
cat > ~/.config/opencode/profiles/anthropic.jsonc << 'EOF'
{
  "model": "anthropic/claude-sonnet-4-6",
  "small_model": "anthropic/claude-haiku-4-5",
  "agent": {
    "build": { "model": "anthropic/claude-haiku-4-5" }
  }
}
EOF

# 3. Launch OpenCode and type /profile
```

## How It Works

The plugin has two components:

### Server Plugin (`index.ts`)

On OpenCode startup, the server plugin reads the `.current-profile` marker
file, loads the referenced profile, and merges its settings into the active
configuration. If the marker is missing or the profile doesn't exist, the
default configuration is used without errors.

### TUI Plugin (`tui.tsx`)

Registers the `/profile` slash command. When invoked:
1. Discovers all `.jsonc` files in `~/.config/opencode/profiles/`
2. Displays them in a selection dialog with the current profile indicated
3. On selection, writes the marker file and triggers a config reload
4. If the selected profile is already active, the dialog closes with no-op

## Profile File Format

Profile files use the same JSONC format as OpenCode configuration files
(`opencode.json`), supporting comments and trailing commas.

```jsonc
{
  // Default model for all agents
  "model": "anthropic/claude-sonnet-4-6",

  // Model for lightweight tasks
  "small_model": "anthropic/claude-haiku-4-5",

  // Per-agent model overrides
  "agent": {
    "build": { "model": "anthropic/claude-haiku-4-5" },
    "plan": { "model": "anthropic/claude-sonnet-4-6" }
  },

  // Provider configuration
  "provider": {
    "anthropic": {
      "options": {
        "apiKey": "{env:ANTHROPIC_API_KEY}"
      }
    }
  }
}
```

### Field Semantics

- **`model`** — Default model for all agents. String matching the OpenCode
  model format (`provider/model-id`).
- **`small_model`** — Model used for lightweight tasks. String matching the
  OpenCode model format.
- **`agent`** — Per-agent model overrides. Keys are agent names, values are
  objects with an optional `model` field. Only specified agents are
  overridden; unlisted agents retain their defaults.
- **`provider`** — Provider configuration. Keys are provider names, values
  include an `options` object where values reference environment variables
  via `{env:VAR_NAME}` syntax.

### Merge Behavior

When a profile is applied, only fields present in the profile file are
overridden. Fields absent from the profile are left unchanged. This uses
shallow field-level merging:

- `model` and `small_model` — direct override
- `agent` — shallow-merge per-agent entries; other agents preserved
- `provider` — shallow-merge per-provider entries; other providers preserved

## Files

| Path | Description |
|---|---|
| `~/.config/opencode/profiles/*.jsonc` | User-managed profile files |
| `~/.config/opencode/.current-profile` | Marker file storing active profile name |

The plugin does not create or manage profile files. Users create and edit
`.jsonc` files in the profiles directory manually.

## Edge Cases

| Scenario | Behavior |
|---|---|
| No profile files exist | Dialog shows "No profiles available" message |
| Profiles directory missing | Dialog shows a warning toast with the expected path |
| Malformed JSON profile | Profile is silently skipped; error logged to console |
| Marker references deleted profile | Starts with default config; no crash |
| Selecting already-active profile | Dialog closes without changes |
| Profile with partial fields | Only specified fields are overridden |

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Type check
npm run typecheck

# Build for distribution
npm run build

# Dev mode (from an OpenCode project)
opencode plugin dev
```

## License

Apache-2.0