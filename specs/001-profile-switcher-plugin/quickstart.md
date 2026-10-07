# Quickstart: Profile Switcher Plugin

**Feature**: Profile Switcher Plugin | **Date**: 2026-10-05

## Prerequisites

- OpenCode installed and configured
- Bun runtime (used by OpenCode plugins)
- Node.js 20+ (for vitest test runner)

## Setup

### 1. Create the profiles directory

```bash
mkdir -p ~/.config/opencode/profiles
```

### 2. Create a sample profile

Create `~/.config/opencode/profiles/anthropic.jsonc`:

```jsonc
{
  "model": "anthropic/claude-sonnet-4-6",
  "small_model": "anthropic/claude-haiku-4-5",
  "agent": {
    "build": { "model": "anthropic/claude-haiku-4-5" },
    "plan": { "model": "anthropic/claude-sonnet-4-6" }
  }
}
```

Create `~/.config/opencode/profiles/openai.jsonc`:

```jsonc
{
  "model": "openai/gpt-4o",
  "small_model": "openai/gpt-4o-mini"
}
```

### 3. Run the tests

```bash
cd .opencode && npx vitest run
```

Expected: All profile-switcher tests pass with 80%+ coverage.

## Validation Scenarios

### Scenario 1: Basic Profile Switching (US1)

**Steps**:
1. Start OpenCode with the profile switcher plugin installed
2. Type `/profile`
3. Verify the dialog shows both `anthropic` and `openai` profiles
4. Verify the currently active profile has a visual indicator (or none if first use)
5. Select `anthropic`
6. Verify a success toast appears: `"Profile switched to anthropic"`
7. Verify the instance restarts and the active model matches the `anthropic` profile

**Expected**: Profile switch completes in under 3 seconds. TUI session is preserved.

### Scenario 2: Profile Persistence (US3)

**Steps**:
1. Select `openai` profile via `/profile`
2. Close OpenCode completely
3. Relaunch OpenCode
4. Verify the active model matches the `openai` profile (no need to re-select)

**Expected**: Profile selection survives session restart.

### Scenario 3: Partial Configuration (US2, Scenario 3)

**Steps**:
1. Create a profile with only `model` set (no agent overrides):
   ```jsonc
   { "model": "anthropic/claude-haiku-4-5" }
   ```
2. Select this profile via `/profile`
3. Verify only the default model changes; agent-specific models remain unchanged

**Expected**: Only specified fields are overridden (FR-009).

### Scenario 4: Edge Cases

**Missing profiles directory**:
```bash
mv ~/.config/opencode/profiles ~/.config/opencode/profiles.bak
```
- Type `/profile` → dialog shows "No profiles available" message
- No crash or error

**Malformed profile**:
```bash
echo "not valid json" > ~/.config/opencode/profiles/broken.jsonc
```
- Type `/profile` → `broken` profile is excluded from dialog
- Other profiles still appear normally
- Console shows error log

**Selecting already-active profile**:
- Type `/profile`, select the currently active profile
- Dialog closes without restart or toast

**Deleted profile with persistent marker**:
```bash
echo "deleted-profile" > ~/.config/opencode/.current-profile
```
- Relaunch OpenCode → starts with default config (no crash)

### Scenario 5: Running Tests with Coverage

```bash
cd .opencode && npx vitest run --coverage
```

**Expected**: Coverage report shows 80%+ line coverage for profile-switcher plugin files.

## File Locations

| Artifact | Path |
|----------|------|
| Server plugin | `.opencode/plugins/profile-switcher/index.ts` |
| TUI plugin | `.opencode/plugins/profile-switcher/tui.tsx` |
| Profile library | `.opencode/plugins/profile-switcher/lib/*.ts` |
| Tests | `.opencode/plugins/profile-switcher/*.test.ts` |
| Profile files | `~/.config/opencode/profiles/*.jsonc` |
| Marker file | `~/.config/opencode/.current-profile` |

## References

- [Profile Command Contract](./contracts/profile-command.md)
- [Config Merge Contract](./contracts/config-merge.md)
- [Data Model](./data-model.md)
- [Research Decisions](./research.md)
- [Feature Specification](./spec.md)