# How Decisions Are Made

> Reviewed: 2026-03-06 | Status: active | Script version: v2.2

## Use This Page

Read this after Start Here. This explains logic in plain language.

System recommends; manager decides.

## Checklist Decision Logic

For each run, the engine:

1. Resolves active store profile (`ALBANY` or `LATHAM`).
2. Syncs location roles for that profile.
3. Applies safety checks (schema and preflight).
4. Builds restock candidates from sellable inventory.
5. Applies stocking rules to calculate urgency and pull quantity.
6. Sorts checklist by `Priority Order` or `Location Wave`.

Important controls:

- Unknown locations default to `IGNORE` and get queued.
- If reserve coverage collapses, preflight blocks output changes.
- If schema is broken, run blocks before mutating checklist/compliance.

## Compliance Decision Logic

For processed rows only, the engine checks:

- THC/potency present in any configured THC alias column.
- Expiration present and parseable.

Flags:

- `MISSING_THC`
- `MISSING_EXP`
- `MISSING_BOTH`

Processed logic is profile-configurable and supports status/location fallback.

## Example 1: Normal Checklist Row

Input state:

- Product has low floor quantity.
- Reserve exists in mapped reserve locations.
- No schema or preflight issue.

Result:

- Product appears in `Restock List`.
- Pull quantity and source locations are shown.
- Manager can approve as-is or adjust execution priority.

## Example 2: No Reserve Risk

Input state:

- Product below target.
- Reserve quantity is zero.

Result:

- Product appears in `Backstock Alerts`.
- Manager treats this as reorder/transfer or mapping issue.
- This prevents false confidence from a normal checklist-only view.

## Example 3: Compliance Flag

Input state:

- Item qualifies as processed.
- THC value is blank/zero-like or expiration is blank/unparseable.

Result:

- Row appears in `Compliance Alerts` with exact flag.
- Manager assigns correction workflow and tracks closure.

## What This Means Operationally

- You get faster triage with retained manager authority.
- You can explain every recommendation using profile, mapping, and rule/config context.
- Failures are explicit (`BLOCKED_*`, `FAILED_*`) and routed to runbooks.

## Next Step

- Use [When to Override](When to Override.md) for action boundaries.
- Use [Operations Guide](Operations Guide.md) for deep controls.

