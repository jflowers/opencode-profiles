# Implementation Plan: Profile Switcher Plugin

**Branch**: `001-profile-switcher-plugin` | **Date**: 2026-10-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-profile-switcher-plugin/spec.md`

## Summary

A TypeScript OpenCode plugin that enables seamless switching between configuration profiles via a `/profile` slash command. The plugin reads `.jsonc` profile files from `~/.config/opencode/profiles/`, presents them in a TUI dialog, and applies the selected profile's model, agent, and provider settings with an automatic instance restart. Profile selection persists across sessions via a marker file.

The plugin follows the existing two-file OpenCode plugin pattern: a server plugin (`index.ts`) that merges profile configuration on startup, and a TUI plugin (`tui.tsx`) that provides the interactive `/profile` command and dialog. This introduces a plugin-local `lib/` subdirectory pattern (vs. the top-level `.opencode/lib/` used for cross-plugin shared code), which is appropriate for plugin-specific logic that should not pollute the shared library namespace.

## Technical Context

**Language/Version**: TypeScript 5.x (Bun runtime)

**Primary Dependencies**: `@opencode-ai/plugin`, `@opencode-ai/plugin/tui`, `@opencode-ai/core/fs`, `zod`. All dependencies are within the `@opencode-ai` ecosystem and are already used by existing plugins (`invoke-agent`, `review-dispatch`). Per Constitution V, each dependency is justified: `@opencode-ai/plugin` provides the plugin framework (no alternative), `@opencode-ai/plugin/tui` provides TUI dialog components (required for `/profile` command), `@opencode-ai/core/fs` provides glob/readJson utilities (could use `node:fs` but the OpenCode API is idiomatic), and `zod` provides runtime schema validation (required for input validation per Constitution V).

**Storage**: Filesystem — profile files (`~/.config/opencode/profiles/*.jsonc`), marker file (`~/.config/opencode/.current-profile`)

**Testing**: vitest 5.x with `@vitest/coverage-v8`

**Target Platform**: OpenCode TUI (Bun runtime), macOS/Linux

**Project Type**: OpenCode plugin (server + TUI)

**Performance Goals**: Profile switch completes in under 3 seconds (SC-005); dialog opens instantly on `/profile` invocation

**Constraints**: Must not crash on missing/malformed profiles; must preserve unspecified config fields; must handle missing profiles directory gracefully

**Scale/Scope**: Single plugin with two files; supports arbitrary number of profile files; one active profile at a time

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Autonomous Collaboration** | PASS | Plugin operates independently; communicates via filesystem artifacts (profile files, marker file). No synchronous inter-agent dependency. |
| **II. Composability First** | PASS | Plugin delivers core value alone (profile switching). No mandatory dependencies on other agents/plugins. |
| **III. Observable Quality** | PASS | Plugin produces machine-parseable output (JSON config merge). Test coverage will back quality claims. |
| **IV. Testability** | PASS | All I/O (filesystem, config) is injectable or mockable. Plugin functions are pure or accept injected dependencies. Coverage strategy defined in plan. |
| **V. Security by Default** | PASS | No new external dependencies beyond existing `@opencode-ai/plugin`. Profile files reference env vars for secrets (`{env:VAR_NAME}`). No inline secrets. File permissions default to restrictive. |

**Gate Result (Pre-Design)**: ALL PASS — proceed to Phase 0.

### Post-Design Re-Evaluation

*Re-checked after Phase 1 design completion.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Autonomous Collaboration** | PASS | Plugin communicates via filesystem artifacts (profile files, marker file). Server and TUI components are independently deployable. No synchronous inter-agent dependency. |
| **II. Composability First** | PASS | Plugin delivers core value alone. No mandatory dependencies on other agents/plugins. Auto-detects profiles directory; operates gracefully when absent. |
| **III. Observable Quality** | PASS | Config merge produces deterministic output. Test coverage strategy defined with 80%+ line coverage target. All error paths produce console logs. |
| **IV. Testability** | PASS | All I/O operations (filesystem, config) are injectable or mockable. Library functions (`lib/profiles.ts`, `lib/marker.ts`, `lib/merge.ts`) are pure or accept injected dependencies. Coverage strategy defined in research.md. |
| **V. Security by Default** | PASS | No new external dependencies beyond the `@opencode-ai` ecosystem. Profile files reference env vars for secrets (`{env:VAR_NAME}`). Zod schema enforces secret format. Marker file created with 0o644 permissions. Marker content validated against path traversal. Input validation via Zod schemas. Error messages sanitized to prevent information leakage. |

**Post-Design Gate Result**: ALL PASS — design is constitution-compliant.

## Project Structure

### Documentation (this feature)

```text
specs/001-profile-switcher-plugin/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
.opencode/plugins/profile-switcher/
├── index.ts             # Server plugin: config merging on startup
├── index.test.ts        # Server plugin tests
├── tui.tsx              # TUI plugin: /profile command and dialog
├── tui.test.tsx         # TUI plugin tests
└── lib/
    ├── schemas.ts       # Zod schemas and TypeScript types
    ├── schemas.test.ts  # Schema validation tests
    ├── profiles.ts      # Profile discovery, parsing, validation
    ├── profiles.test.ts # Profile logic tests
    ├── marker.ts        # Marker file read/write
    ├── marker.test.ts   # Marker file tests
    ├── merge.ts         # Config merge logic
    └── merge.test.ts    # Merge logic tests
```

**Structure Decision**: Single plugin directory under `.opencode/plugins/profile-switcher/` following the existing pattern from `invoke-agent/` and `review-dispatch/`. The plugin exports both a server component (`index.ts`) and a TUI component (`tui.tsx`). Shared logic is extracted into a `lib/` subdirectory for testability and separation of concerns.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations — table intentionally empty.