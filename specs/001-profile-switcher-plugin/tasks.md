# Tasks: Profile Switcher Plugin

**Input**: Design documents from `/specs/001-profile-switcher-plugin/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Test tasks are included — the implementation plan explicitly lists test files and the constitution mandates testability with 80%+ line coverage.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Plugin root**: `.opencode/plugins/profile-switcher/`
- **Library modules**: `.opencode/plugins/profile-switcher/lib/`
- **Tests**: Co-located with source files (`*.test.ts`, `*.test.tsx`)
- **Profile files (user data)**: `~/.config/opencode/profiles/*.jsonc`
- **Marker file**: `~/.config/opencode/.current-profile`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create plugin directory structure at `.opencode/plugins/profile-switcher/` with `lib/` subdirectory

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core library modules that both server and TUI plugins depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 [P] Create Zod schemas and TypeScript types for profile file content, profile options, and marker data in `.opencode/plugins/profile-switcher/lib/schemas.ts`
- [x] T003 [P] Test Zod schemas (valid/invalid profiles, edge cases) in `.opencode/plugins/profile-switcher/lib/schemas.test.ts`
- [x] T004 [P] Implement profile discovery (glob `*.jsonc` from profiles directory) and JSONC parsing in `.opencode/plugins/profile-switcher/lib/profiles.ts`
- [x] T005 [P] Test profile discovery and parsing (existing profiles, empty directory, missing directory) in `.opencode/plugins/profile-switcher/lib/profiles.test.ts`
- [x] T006 [P] Implement marker file read/write using Bun APIs in `.opencode/plugins/profile-switcher/lib/marker.ts`
- [x] T007 [P] Test marker file I/O (read existing, read missing, write, overwrite) in `.opencode/plugins/profile-switcher/lib/marker.test.ts`
- [x] T008 Implement config merge logic (shallow merge per FR-009: only override fields present in profile) in `.opencode/plugins/profile-switcher/lib/merge.ts`
- [x] T009 Test config merge logic (full profile, partial profile, agent sub-key merge, provider merge) in `.opencode/plugins/profile-switcher/lib/merge.test.ts`

**Checkpoint**: Foundation ready — all library modules are implemented and tested. User story implementation can now begin.

---

## Phase 3: User Story 1 - Switch Configuration Profile via Command (Priority: P1) 🎯 MVP

**Goal**: User types `/profile`, selects a profile from a dialog, and the system applies the new settings with an automatic instance restart. This is the core value proposition.

**Independent Test**: Create one `.jsonc` profile file, invoke `/profile`, select it from the dialog, and verify the active model and agent settings change after the restart.

### Implementation for User Story 1

- [x] T010 [US1] Implement server plugin config hook in `.opencode/plugins/profile-switcher/index.ts` — reads marker file on startup, loads referenced profile, merges into config per the config-merge contract. This is the initial implementation covering the happy path (marker present, profile exists).
- [x] T011 [US1] Test server plugin config hook (marker present, marker missing, profile applies correctly) in `.opencode/plugins/profile-switcher/index.test.ts`
- [x] T012 [US1] Implement TUI plugin `/profile` command and `DialogSelect` dialog in `.opencode/plugins/profile-switcher/tui.tsx` — discovers profiles, displays with current indicator, handles selection per the profile-command contract. Includes no-op behavior when selecting the already-active profile (dialog closes without changes).
- [x] T013 [US1] Test TUI plugin (dialog displays profiles, selection triggers marker write and config update, success toast, already-active profile no-op, config update round-trip completes within 3 seconds per SC-005) in `.opencode/plugins/profile-switcher/tui.test.tsx`

**Checkpoint**: At this point, User Story 1 should be fully functional — users can switch profiles via `/profile` command. This is the MVP.

---

## Phase 4: User Story 2 - Create and Manage Profile Files (Priority: P2)

**Goal**: Users can create `.jsonc` profile files that become immediately available in the `/profile` dialog. Malformed files are skipped gracefully. Empty states are handled.

**Independent Test**: Create a new `.jsonc` file in the profiles directory, verify it appears in the `/profile` dialog, and confirm its settings apply correctly when selected.

### Implementation for User Story 2

- [x] T014 [US2] Add malformed profile JSON handling with graceful skip and console error logging in `.opencode/plugins/profile-switcher/lib/profiles.ts` (FR-007)
- [x] T015 [US2] Test malformed profile handling (invalid JSON, valid JSON but wrong schema, mixed valid/invalid profiles) in `.opencode/plugins/profile-switcher/lib/profiles.test.ts`
- [x] T016 [US2] Add empty state message ("No profiles available") and missing profiles directory handling in `.opencode/plugins/profile-switcher/tui.tsx` (FR-008, Edge Cases)
- [x] T017 [US2] Test empty state and missing directory handling in `.opencode/plugins/profile-switcher/tui.test.tsx`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work — profiles are discoverable, manageable, and edge cases are handled gracefully.

---

## Phase 5: User Story 3 - Profile Persistence Across Sessions (Priority: P3)

**Goal**: Profile selection persists across OpenCode session restarts. The previously selected profile is automatically applied on relaunch. Missing profiles degrade gracefully.

**Independent Test**: Select a profile via `/profile`, close OpenCode completely, relaunch, and verify the same profile settings are active.

### Implementation for User Story 3

- [x] T018 [US3] Implement graceful degradation for missing profile in `.opencode/plugins/profile-switcher/index.ts` — when marker references a non-existent profile, log error and start with default config (US3 Scenario 2, FR-007). Builds on T010's happy-path startup flow.
- [x] T019 [US3] Test startup restoration (marker present with valid profile, marker present with deleted profile → default config, no marker → default config) in `.opencode/plugins/profile-switcher/index.test.ts`
- [x] T020 [US3] Test graceful degradation for missing profile (marker references deleted file, marker references renamed file) in `.opencode/plugins/profile-switcher/index.test.ts`
- [x] T021 [US3] Test marker file content validation (reject path traversal characters like `../`, ensure only safe characters in profile names) in `.opencode/plugins/profile-switcher/lib/marker.test.ts`

**Checkpoint**: All user stories should now be independently functional — profile switching, file management, and persistence all work.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation, coverage verification, and cleanup

- [x] T022 [P] Run quickstart.md validation scenarios (Scenario 1-5) and verify all pass
- [x] T023 Run full test suite with coverage: `cd .opencode && npx vitest run --coverage` — verify 80%+ line coverage for profile-switcher plugin files
- [x] T024 [P] Code cleanup and refactoring — remove dead code, ensure consistent error message prefix ("Profile plugin:"), verify all exported symbols have documentation comments

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion
- **User Story 2 (Phase 4)**: Depends on Foundational phase completion — builds on US1's TUI plugin
- **User Story 3 (Phase 5)**: Depends on Foundational phase completion — builds on US1's server plugin
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — No dependencies on other stories. Delivers core `/profile` switching.
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) — Extends `profiles.ts` and `tui.tsx` from US1 with edge case handling. Independently testable.
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) — Extends `index.ts` from US1 with persistence behavior. Independently testable.

### Within Each Phase

- Library modules before plugin files (Phase 2 before Phase 3)
- Schemas before merge logic (T002 before T008)
- Implementation before tests within each module (or TDD: tests first, then implementation)
- Core implementation before edge case handling

### Parallel Opportunities

- All Phase 2 tasks marked [P] can run in parallel (schemas, profiles, marker — different files)
- T002+T003 (schemas + tests) can run in parallel with T004+T005 (profiles + tests) and T006+T007 (marker + tests)
- T008 (merge) depends on T002 (schemas) — sequential
- US1 tasks T010+T011 (server) and T012+T013 (TUI) can run in parallel (different files)
- US2 and US3 can run in parallel with each other (different files, different concerns)
- All Polish tasks marked [P] can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch all independent library modules together:
Task: "Create Zod schemas in .opencode/plugins/profile-switcher/lib/schemas.ts"
Task: "Implement profile discovery in .opencode/plugins/profile-switcher/lib/profiles.ts"
Task: "Implement marker file I/O in .opencode/plugins/profile-switcher/lib/marker.ts"

# Then (after schemas complete):
Task: "Implement config merge in .opencode/plugins/profile-switcher/lib/merge.ts"
```

## Parallel Example: User Story 1

```bash
# Server and TUI plugins can be built in parallel:
Task: "Implement server plugin config hook in .opencode/plugins/profile-switcher/index.ts"
Task: "Implement TUI plugin /profile command in .opencode/plugins/profile-switcher/tui.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test `/profile` switching with real profile files
5. Deploy/demo if ready — this delivers the core value proposition

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (profile management)
4. Add User Story 3 → Test independently → Deploy/Demo (persistence)
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (server + TUI plugins)
   - Developer B: User Story 2 (edge cases in profiles.ts + tui.tsx)
   - Developer C: User Story 3 (persistence in index.ts)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Profile files live at `~/.config/opencode/profiles/*.jsonc` (user-managed, not created by plugin)
- Marker file lives at `~/.config/opencode/.current-profile` (plain text, single line)
- Error messages use `"Profile plugin:"` prefix for console logging
- All filesystem I/O must be mockable for testing (use dependency injection or Bun API mocking)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently

<!-- spec-review: passed -->
<!-- code-review: passed -->