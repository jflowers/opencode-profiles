# Contract: `/profile` Slash Command

**Feature**: Profile Switcher Plugin | **Version**: 1.0.0

## Overview

The `/profile` slash command is the primary user-facing interface of the profile switcher plugin. It opens a dialog displaying all available configuration profiles and allows the user to select one for activation.

## Command Registration

```typescript
// Registered via api.keymap.registerLayer in the TUI plugin
{
  name: "profile.switch",
  title: "Switch profile",
  category: "Config",
  slashName: "profile",
  // run: () => { ... }
}
```

## Dialog Contract

### Input

The dialog is opened by typing `/profile` in the OpenCode TUI. No arguments are accepted.

### Display

The dialog presents a `DialogSelect` component with:

| Property | Value |
|----------|-------|
| `title` | `"Select Profile"` |
| `options` | Array of profile options (see below) |

Each option has:

| Property | Type | Description |
|----------|------|-------------|
| `title` | `string` | Profile name (filename without `.jsonc`) |
| `value` | `string` | Profile name (used as selection value) |
| `description` | `string` | Human-readable description (e.g., `"Applies {name} configuration"`) |
| `current` | `boolean` | `true` if this is the currently active profile |

### Empty State

When no `.jsonc` files exist in the profiles directory, the dialog displays a message: `"No profiles available. Create .jsonc files in ~/.config/opencode/profiles/"`.

### Selection Behavior

| Scenario | Behavior |
|----------|----------|
| User selects a different profile | Save marker file → trigger config update → show success toast → instance restarts |
| User selects the already-active profile | No-op (dialog closes without changes) |
| User dismisses dialog (Escape) | No changes made |

### Output (on selection)

1. **Marker file written**: `~/.config/opencode/.current-profile` updated with the selected profile name
2. **Config update triggered**: `api.client.config.update({})` called
3. **Toast notification**: Success message displayed (`"Profile switched to {name}"`)
4. **Instance restart**: OpenCode restarts with new config (TUI session preserved)

### Error Handling

| Error | Behavior |
|-------|----------|
| Marker file write fails | Error toast: `"Failed to save profile selection"` |
| Config update fails | Error toast: `"Failed to apply profile"` |
| Profile directory missing | Dialog shows empty state message |
| Profile file malformed | Profile excluded from dialog (logged to console) |

## Filesystem Contract

### Reads

| Path | Purpose | When |
|------|---------|------|
| `~/.config/opencode/profiles/*.jsonc` | Discover available profiles | On each `/profile` invocation |
| `~/.config/opencode/.current-profile` | Read current profile name | On each `/profile` invocation |

### Writes

| Path | Purpose | When |
|------|---------|------|
| `~/.config/opencode/.current-profile` | Persist selected profile name | On profile selection |

The marker file MUST be created with restrictive permissions (0o644) per Constitution V.

## Dependencies

- `@opencode-ai/plugin/tui` — `TuiPlugin`, `TuiPluginApi` types
- `@opencode-ai/core/fs` — `glob` function for file discovery
- `path` — `join` for path construction
- `Bun` — `Bun.file()`, `Bun.write()` for marker I/O