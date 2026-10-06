---
tag: 001-profile-switcher-plugin
author: jay-flowers
created_at: 2026-10-06T15:11:18Z
identity: 001-profile-switcher-plugin-20261006T151118-jay-flowers
tier: draft
---

Prototype pollution filtering for the profile-switcher plugin required two levels of defense: (1) Top-level record key filtering via safeEntries() that rejects __proto__/constructor/prototype keys in agent and provider records, and (2) deep filtering of nested options record keys inside provider configs. The initial implementation only handled level 1, and the Divisor Adversary demonstrated that `provider: { openai: { options: { __proto__: "evil" } } }` could bypass the filter. The fix added a sanitization pass inside the provider merge loop that recursively filters options entries. Lesson: ANY Object.entries() site that processes user-controlled record keys needs its own safeEntries-like filter. Do not assume top-level filtering is sufficient for nested objects.
