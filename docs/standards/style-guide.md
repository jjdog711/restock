---
audience: all
owner: Xylent Studios
last-reviewed: 2026-03-06
script-version: v2.1
status: active
---

# Documentation Style Guide

## Required Standards

- File encoding: UTF-8
- Active doc filenames: kebab-case
- Dates: `YYYY-MM-DD`
- Canonical docs entrypoint: `docs/index.md`
- Root README must stay concise and route to docs hub

## Required Metadata Header

Every active non-legacy markdown doc must include:

- `audience`
- `owner`
- `last-reviewed`
- `script-version`
- `status`

## Terminology Source of Truth

Use these exact labels:

- Menu: `Restock`
- Primary action: `Run Daily Update`
- Secondary actions: `Run Checklist Only`, `Run Compliance Only`
- Manager actions: `Run System Check`, `Open Diagnostics`
- Key tabs: `Daily Home`, `No_Reserve_Risk`, `Restock Checklist`, `Missing_Compliance`

## Content Rules

- Staff docs: operational steps only, no hidden-tab editing instructions
- Manager docs: governance, diagnostics, escalation
- Admin docs: deployment, trigger setup, backup/restore
- Developer docs: architecture, contracts, testing
- Agent docs: constrained, implementation-safe read order

## Legacy Handling

- Historical docs live under `docs/reference/legacy/*`
- Add deprecation banner to archived files
- Do not link archived content from staff docs

## Quality Gate

Run before merge:

- `powershell -ExecutionPolicy Bypass -File tools/docs/check-docs.ps1`

Must pass:

- zero broken links in active docs
- zero missing metadata headers in active docs
- zero banned stale phrases in active docs
- alias stubs intact

---
_State of Mind Vault Restock System | Built by Xylent Studios | Steward: Justin Michalke | Script v2.1 | Last reviewed: 2026-03-06_
