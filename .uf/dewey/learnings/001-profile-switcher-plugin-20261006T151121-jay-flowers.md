---
tag: 001-profile-switcher-plugin
author: jay-flowers
created_at: 2026-10-06T15:11:21Z
identity: 001-profile-switcher-plugin-20261006T151121-jay-flowers
tier: draft
---

Error messages thrown from filesystem operations in the profile-switcher plugin should not echo file paths or parse content. The fix separated error handling into two paths: `console.error()` retains full debug detail (including the specific path and error message), while `throw new Error()` uses generic sanitized messages like 'Failed to read profile file' or 'Failed to parse JSONC'. This prevents information disclosure through error propagation while preserving debuggability through console logging. This pattern applies to any plugin that handles user-controlled file paths: log the detail, sanitize the throw.
