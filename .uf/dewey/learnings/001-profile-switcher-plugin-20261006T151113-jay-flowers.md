---
tag: 001-profile-switcher-plugin
author: jay-flowers
created_at: 2026-10-06T15:11:13Z
identity: 001-profile-switcher-plugin-20261006T151113-jay-flowers
tier: draft
---

When validating profile names for marker-based profile switching, using a denylist pattern like /^[._]|[&|;$\n\r\\]/ was found to be trivially bypassable by the Divisor Adversary. The fix switched to an allowlist pattern /^[A-Za-z0-9_-]+$/ that constrains profile names to a known-safe character set. Allowlists are always more robust than denylists for security validation because they eliminate unknown-unknown bypasses. Combined with realpath-based path confinement (fs.realpath to verify resolved paths stay within the expected profiles directory), this creates defense-in-depth against path traversal and name injection attacks.
