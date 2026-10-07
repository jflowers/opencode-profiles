# Feature Specification: Profile Switcher Plugin

**Feature Branch**: `001-profile-switcher-plugin`

**Created**: 2026-10-05

**Status**: Draft

**Input**: User description: "Add a profile switcher plugin that enables seamless switching between OpenCode configuration profiles via a /profile slash command, reading .jsonc profile files and applying them with an instance restart."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Switch Configuration Profile via Command (Priority: P1)

A user types `/profile`, selects a configuration profile from a dialog menu, and the system applies the new profile settings — including model assignments and provider configuration — with a brief instance restart that preserves the TUI session.

**Why this priority**: This is the core value proposition. Without profile switching, the plugin provides no utility. Every other story depends on this capability existing.

**Independent Test**: Can be fully tested by creating one `.jsonc` profile file, invoking `/profile`, selecting it from the dialog, and verifying the active model and agent settings change after the restart. Delivers the fundamental ability to change configurations at runtime.

**Acceptance Scenarios**:

1. **Given** multiple `.jsonc` profile files exist in the profiles directory and the user has an active OpenCode session, **When** the user types `/profile`, **Then** a dialog menu appears listing all available profiles by name with the currently active profile indicated.
2. **Given** the profile selection dialog is open, **When** the user selects a profile different from the current one, **Then** the selected profile is saved as the new active profile, the configuration is updated, and the instance restarts automatically with the new settings applied.
3. **Given** the selected profile includes model overrides for specific agents, **When** the profile is applied, **Then** the specified agents use the profile-defined models while unlisted agents retain their defaults.
4. **Given** the selected profile includes provider configuration, **When** the profile is applied, **Then** the provider settings (e.g., API keys) are available for model access in the new session.

---

### User Story 2 - Create and Manage Profile Files (Priority: P2)

A user creates `.jsonc` profile files in a standard directory, each containing model, agent, and provider settings. New profiles become immediately available in the `/profile` command without requiring additional registration steps.

**Why this priority**: Users need to define the profiles before they can switch between them. However, profile creation happens less frequently than profile switching, making it a P2.

**Independent Test**: Can be fully tested by creating a new `.jsonc` file in the profiles directory, verifying it appears in the `/profile` dialog, and confirming its settings apply correctly when selected.

**Acceptance Scenarios**:

1. **Given** the profiles directory exists, **When** a user creates a new `.jsonc` file containing valid model, agent, and provider settings, **Then** the profile appears in the `/profile` dialog on the next invocation.
2. **Given** a profile file is deleted or renamed to a non-`.jsonc` extension, **When** the user invokes `/profile`, **Then** that profile no longer appears in the selection dialog.
3. **Given** a profile file contains only a `model` field (no agent overrides), **When** the profile is selected, **Then** only the default model changes while agent-specific models remain unchanged.

---

### User Story 3 - Profile Persistence Across Sessions (Priority: P3)

When a user selects a profile, that selection persists across OpenCode session restarts. The next time the user launches OpenCode, the previously selected profile is automatically applied.

**Why this priority**: Enhances the workflow by removing the need to re-select a profile on every session start. Lower priority because the core switching capability works without persistence.

**Independent Test**: Can be fully tested by selecting a profile via `/profile`, closing OpenCode completely, relaunching, and verifying the same profile settings are active.

**Acceptance Scenarios**:

1. **Given** a user has selected a profile in a previous session, **When** OpenCode is launched again, **Then** the previously selected profile's configuration is automatically applied.
2. **Given** the persistent marker file references a profile that no longer exists, **When** OpenCode is launched, **Then** the system starts with default configuration and does not crash.

---

### Edge Cases

- What happens when no `.jsonc` files exist in the profiles directory? The `/profile` dialog should display an empty state or a helpful message indicating no profiles are available.
- What happens when a profile file contains malformed JSON? The system should skip or report the malformed profile gracefully without crashing the entire plugin.
- What happens when the user selects the already-active profile? The system should either no-op or indicate that the profile is already active without unnecessary restart.
- What happens when the profiles directory doesn't exist yet? The plugin should handle the missing directory gracefully without errors.
- What happens when a profile overrides only a subset of configuration fields? Only the specified fields should change; unspecified settings should retain their existing values.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a `/profile` slash command that opens a dialog displaying all available configuration profiles.
- **FR-002**: System MUST discover profiles by scanning `*.jsonc` files from a designated profiles directory (`~/.config/opencode/profiles/`).
- **FR-003**: System MUST display the currently active profile with a visual indicator in the profile selection dialog.
- **FR-004**: System MUST persist the user's profile selection to a marker file (`~/.config/opencode/.current-profile`) so it survives session restarts.
- **FR-005**: System MUST merge the selected profile's configuration into the active OpenCode configuration, including model, small_model, agent-specific model overrides, and provider settings.
- **FR-006**: System MUST trigger an automatic instance restart when a profile is switched, completing within 3 seconds to minimize disruption.
- **FR-007**: System MUST handle missing or malformed profile files gracefully — skipping invalid files and logging errors without crashing.
- **FR-008**: System MUST handle a missing profiles directory gracefully — operating with no profiles available rather than failing.
- **FR-009**: System MUST preserve unspecified configuration fields when applying a profile — only fields defined in the profile file are overridden.
- **FR-010**: System MUST accept profile files using the same JSONC format and structure as OpenCode configuration files (the `opencode.json` schema, with JSONC extensions for comments and trailing commas).

### Key Entities

- **Profile File**: A `.jsonc` file in the profiles directory containing optional `model`, `small_model`, `agent` (per-agent model overrides), and `provider` settings. Named by the user to identify the configuration (e.g., `anthropic.jsonc`, `openai.jsonc`).
- **Profile Marker**: A persistent file (`~/.config/opencode/.current-profile`) storing the name of the currently active profile. Survives session restarts.
- **Profile Selection Dialog**: A TUI dialog component presenting profile names, descriptions, and current-selection status to the user for interactive switching.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can switch between configuration profiles in under 10 seconds from invoking `/profile` to the instance restart completing.
- **SC-002**: Profile selection persists across session restarts — the previously selected profile is applied on relaunch with zero observed failures in the test suite.
- **SC-003**: Adding or removing a profile file makes it appear or disappear from the selection dialog within one invocation of `/profile`.
- **SC-004**: 95% of profile switching operations succeed without errors, including cases with partial configurations.
- **SC-005**: The instance restart caused by profile switching completes in under 3 seconds so users experience minimal workflow interruption.

## Assumptions

- The profiles directory (`~/.config/opencode/profiles/`) is manually created and managed by the user; the plugin does not create or manage profile files.
- Profile files follow the same JSONC format as OpenCode configuration — users are expected to author them correctly using the `opencode.json` schema with JSONC extensions.
- The TUI remains connected during the brief instance restart, as described in the design guide.
- The plugin operates within the existing OpenCode plugin system and can access standard configuration and filesystem capabilities.
- Profile names are derived from the filename without the `.jsonc` extension. Only files directly in the profiles directory (non-recursive) are discovered. Two profiles with different filenames but the same base name are considered distinct; if a collision occurs (e.g., from subdirectory files), the first discovered wins and a warning is logged.
- Provider secrets (API keys) in profile files reference environment variables (`{env:VAR_NAME}`) rather than containing inline secrets.