---
tag: 001-profile-switcher-plugin
author: jay-flowers
created_at: 2026-10-06T15:11:19Z
identity: 001-profile-switcher-plugin-20261006T151119-jay-flowers
tier: draft
---

The Divisor Guard flagged that FR-006 (profile switching restarts the session) was not fully implemented. The fix added `api.client.config.update({})` after the marker write in tui.tsx's profile selection handler, triggering a config reload/restart. This is a classic spec-to-implementation drift: the feature "worked" (profile file was written) but the spec requirement for session restart was not met. The Guard agent is specifically designed to catch this class of gap by comparing the implemented behavior against the functional requirements in the spec. Always have the guard review the implementation against FRs, not just code quality.
