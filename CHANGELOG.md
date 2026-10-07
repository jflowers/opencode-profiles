# Changelog

## [unreleased] — profile-switcher plugin

### Added
- `.opencode/plugins/profile-switcher/` — server and TUI plugin for
  switching between opencode configuration profiles at runtime.
- `/profile` slash command (TUI) that discovers profiles in
  `~/.config/opencode/profiles/`, presents a selection dialog, and
  writes the choice to a marker file.
- Server-side config merge on startup: reads the marker file,
  loads the corresponding `*.jsonc` profile, and shallow-merges
  `model`, `small_model`, `agent`, and `provider` into the active
  opencode configuration.
- Profile files use JSONC format (supports `//` and `/* */`
  comments).
- Input validation: profile names restricted to alphanumeric +
  hyphen/underscore; path confinement via `realpath`; `__proto__`
  key filtering on merge.
- `specs/001-profile-switcher-plugin/` — full Speckit specification
  (spec, plan, tasks, data model, contracts, quickstart).
