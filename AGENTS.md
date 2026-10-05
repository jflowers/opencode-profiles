# AGENTS.md

## Project Overview

OpenCode configuration profiles for [Jay Flowers](https://github.com/jflowers) — a personal configuration hub for the opencode AI coding assistant. This repository defines the agents, commands, skills, plugins, and governance that shape every opencode session.

- **Type**: opencode configuration profiles
- **Platform**: Node.js / TypeScript (opencode plugins)
- **License**: Apache 2.0
- **Repository**: `github.com/jflowers/opencode-profiles`
- **Mission**: Provide a composable, constitution-governed agent swarm for AI-assisted software engineering

## Build & Test Commands

This project has no CI workflows or Makefile. The TypeScript plugins in `.opencode/` use vitest.

```bash
# Run plugin tests
cd .opencode && npx vitest run

# Run with coverage
cd .opencode && npx vitest run --coverage
```

Agents, skills, and commands are Markdown files with no build step. Validation is manual:
configuration files are loaded by opencode at runtime; invalid files produce
startup errors.

## Project Structure

```text
opencode-profiles/
├── .opencode/          # OpenCode configuration root
│   ├── agents/         # Agent definition files (18 agents)
│   ├── commands/       # Slash command definitions (39 commands)
│   ├── plugins/        # TypeScript plugins (invoke-agent, review-dispatch)
│   ├── skills/         # Skill instruction files (15 skills)
│   ├── uf/             # Unbound Force tooling
│   │   └── packs/      # Convention packs (13 packs)
│   ├── lib/            # Shared library code
│   └── references/     # Reference documentation
├── .specify/           # Speckit specification framework
│   ├── memory/         # Project constitution and governance
│   ├── scripts/        # Speckit automation scripts
│   ├── templates/      # Spec artifact templates
│   └── workflows/      # Speckit workflow definitions
├── .uf/                # Unbound Force configuration
│   ├── dewey/          # Dewey knowledge graph config
│   ├── replicator/     # Replicator swarm config
│   └── schemas/        # UF schema definitions
├── docs/               # Project documentation
├── openspec/           # OpenSpec specification framework
│   ├── changes/        # Active change proposals
│   ├── schemas/        # Spec schema templates
│   └── specs/          # Published specifications
├── LICENSE             # Apache 2.0 license
└── opencode.json       # OpenCode MCP and plugin configuration
```

## Coding Conventions

### Agent and Skill Files

- Agents live in `.opencode/agents/` as Markdown files with YAML frontmatter.
  Follow the `systemPrompt` / `tools` / `model` structure defined by opencode.
- Skills live in `.opencode/skills/` with a `SKILL.md` entrypoint.
  Skill names use kebab-case directories matching the skill's `name` field.
- Commands in `.opencode/commands/` use DCP `<protect>` tags to mark
  execution-critical sections (guardrails, checklists, mandatory gates)
  that MUST survive context pruning.

### Plugins (TypeScript)

- Plugins live in `.opencode/plugins/<name>/index.ts`.
- Use `@opencode-ai/plugin` and `zod` for schemas.
- Follow existing plugin signatures: export a default function returning
  `{ config }` for server plugins or `{ tui }` for TUI plugins.

### Spec Writing

- Use RFC 2119 language: MUST, SHOULD, MAY.
- Prefer Given/When/Then scenarios for behavioral specs.
- Number requirements as FR-NNN (functional) and NFR-NNN (non-functional).
- Keep spec line length under 72 characters for readability.

## Testing Conventions

- **Framework**: vitest 5.x for TypeScript plugins
- **Coverage**: `@vitest/coverage-v8` for V8-based coverage
- **Test location**: colocate tests with plugins in `.opencode/plugins/`
- **Isolation**: use vitest's default isolation; no shared mutable state
  between test files

## Behavioral Rules

These rules are non-negotiable. Violations are CRITICAL severity.

- **Gatekeeping**: MUST NOT modify quality/governance gates
  (coverage thresholds, CRAP scores, severity definitions,
  CI flags, agent settings, constitution MUST rules, review
  limits, workflow markers). Stop and report instead.
- **Phase boundaries**: MUST NOT cross workflow phase boundaries.
  Spec phases: spec artifacts only. Implement: source code.
  Review: fixes only. Violation = process error, stop immediately.
- **CI parity**: MUST replicate CI checks locally before marking
  tasks complete. Derive commands from `.github/workflows/`.
- **Review council**: MUST run `/uf.review-council` before PR
  submission. Resolve all REQUEST CHANGES. No code changes
  between APPROVE and PR. Exempt: constitution amendments,
  docs-only, emergency hotfixes.
- **Branch protection**: MUST NOT commit directly to `main`.
  All changes via feature branches and PRs.
- **Documentation gate**: Before marking a task complete,
  assess documentation impact: `CHANGELOG.md` for change
  entries, `AGENTS.md` for structural updates (project
  structure, conventions, build commands), `README.md` for
  description changes.
- **Documentation gate**: MUST file a documentation issue
  against the current repo for user-facing changes before
  PR merge. Exempt: internal refactoring, test-only,
  CI-only, spec artifacts.
- **Zero-waste**: No orphaned specs, unused standards, or
  aspirational documents that do not map to actionable work.

### PR Review Commands

| Command | When | Scope |
|---------|------|-------|
| `/uf.review-council` | Pre-PR (local) | 5+ Divisor agents |
| `/uf.review-pr [N]` | Post-PR (GitHub) | Single agent, CI analysis |

## Specification Workflow

All non-trivial changes MUST be preceded by a spec workflow.

| Tier | Tool | When | Artifacts |
|------|------|------|-----------|
| Strategic | Speckit | >= 3 stories, cross-repo | `specs/NNN-*/` |
| Tactical | OpenSpec | < 3 stories, single-repo | `openspec/changes/*/` |

Pipeline: `constitution → specify → clarify → plan → tasks →
analyze → checklist → implement`

**Ordering**: Constitution before specs. Spec before plan. Plan
before tasks. Tasks before implementation. Spec artifacts MUST
be committed/pushed before implementation begins.

**Branches**: Speckit: `NNN-<name>`. OpenSpec: `opsx/<name>`.

**Task bookkeeping**: Mark checkboxes `[x]` immediately on
completion. `[P]` marks parallel-eligible tasks.

**When in doubt**: Start with OpenSpec. Escalate to Speckit if
scope grows beyond 3 stories or crosses repo boundaries.

**What requires a spec**: New features, refactoring that changes
signatures, test additions across multiple functions, agent
changes, CI changes, data model changes.

**Exempt**: Constitution amendments, typo fixes, emergency
hotfixes (retroactively documented).

## Knowledge Retrieval

Prefer Dewey MCP tools over grep/glob/read for cross-repo
context and architectural patterns.

| Intent | Tool |
|--------|------|
| Conceptual | `dewey_semantic_search` |
| Keyword | `dewey_search` |
| Navigation | `dewey_traverse`, `dewey_get_page` |
| Discovery | `dewey_find_connections`, `dewey_similar` |

**Fallback**: Use Read/Grep/Glob when Dewey is unavailable,
for exact string matching, known file paths, or non-Markdown
content (Go source, JSON, YAML).

## Convention Packs

This repository uses convention packs scaffolded by
unbound-force. Agents MUST read the applicable pack(s)
before writing or reviewing code.

- `.opencode/uf/packs/ci-custom.md`
- `.opencode/uf/packs/ci.md`
- `.opencode/uf/packs/content-custom.md`
- `.opencode/uf/packs/content.md`
- `.opencode/uf/packs/default-custom.md`
- `.opencode/uf/packs/default.md`
- `.opencode/uf/packs/go-custom.md`
- `.opencode/uf/packs/go.md`
- `.opencode/uf/packs/python-custom.md`
- `.opencode/uf/packs/python.md`
- `.opencode/uf/packs/severity.md`
- `.opencode/uf/packs/typescript-custom.md`
- `.opencode/uf/packs/typescript.md`

## Architecture

This project follows a plugin-based composition model where
opencode loads configuration, agents, skills, and plugins from
declarative files. The architecture separates concerns into:

- **Agent layer**: Autonomous review and task agents (Divisor,
  Gaze, Forge) defined as Markdown prompts with tool access.
- **Command layer**: Slash commands that orchestrate multi-step
  workflows (spec, review, forge).
- **Plugin layer**: TypeScript plugins extending opencode's
  runtime behavior (invoke-agent dispatch, review dispatch).
- **Governance layer**: Constitution-driven rules enforced by
  behavioral guards and pre-flight checks.

Agents communicate through artifacts (review reports, spec files)
rather than synchronous calls, following the constitution's
Autonomous Collaboration principle.
