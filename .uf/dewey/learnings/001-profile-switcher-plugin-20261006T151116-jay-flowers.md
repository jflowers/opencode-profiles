---
tag: 001-profile-switcher-plugin
author: jay-flowers
created_at: 2026-10-06T15:11:16Z
identity: 001-profile-switcher-plugin-20261006T151116-jay-flowers
tier: draft
---

The Divisor Architect flagged that the plugin's Zod v4 schemas used `agents`/`providers` (plural) and `isActive` while the data-model.md contract specified `agent`/`provider` (singular) and `isCurrent`. This caused a schema-data-model misalignment that had to be corrected across schemas.ts, merge.ts, tui.tsx, profiles.ts, and all test files. Lesson: Zod schema field names must be validated against the data model contract before implementation begins. The data-model.md is the source of truth, not the schemas implementation. A pre-implementation validation step comparing the Zod schema exports against the data model's field list would catch this class of error.
