# Agent Quickstart

> Reviewed: 2026-03-06 | Status: active | Script version: v2.2

This is the AI coding entrypoint for the current multi-profile system.

## Read Order

1. [Architecture](../Developers/Architecture.md)
2. [Code Map](../Developers/Code Map.md)
3. [Manager Confidence Pack](../Managers/Start Here.md)
4. [Manager Operations Guide](../Managers/Operations Guide.md)
5. [Reference Index](../Reference/Reference Index.md)

## Non-Negotiables

- Keep staff workflow simple: import, run daily update, review risk/checklist/compliance
- Preserve safety defaults:
  - unknown locations => `IGNORE` + queue
  - guardrail blocks preserve last good outputs
- Preserve run outcomes and diagnostics semantics
- Avoid introducing fixed-column assumptions where alias/header resolution exists

## Common Change Areas

- Profile behavior: `System_Reference` readers/resolvers/sync
- Checklist behavior: `refreshChecklist` + rule application path
- Compliance behavior: `runComplianceCheck` + config aliases/token sets
- UX/menu behavior: `onOpen`, workspace and checklist view menus

## Test Expectations Before Handoff

- Manual `Run Daily Update` passes
- `Run System Check` passes
- Albany and Latham fixtures remain within expected baseline ranges
- No regression in run outcome semantics or diagnostics logging

## Historical Archive

Legacy v1 specs and prior agent docs are in:

- `docs/reference/legacy/v1/specs`
- `docs/reference/legacy/v1/agent`

Treat archived docs as historical context only.

