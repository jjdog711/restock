---
audience: manager
owner: State of Mind Management + Xylent Studios
last-reviewed: 2026-03-06
script-version: v2.2
status: active
---

# Manager Start Here

## Use This Page

Read this first. If you only read one manager page, read this one.

## What This Gives You

You keep operational control while the system handles repetitive scanning and triage.

- System role: generate recommendations from current data and policy config.
- Manager role: approve, override, and escalate when needed.
- Escalation role: runbooks and diagnostics guide failure handling.

## What Changed

- Daily restock and compliance are generated in one run.
- Unknown locations are safely ignored by default and queued for review.
- Guardrails block unsafe runs instead of writing bad output.

## What Stayed the Same

- Inventory manager still decides what to execute on the floor.
- Staff still import CSV and run the same daily workflow.
- Overrides remain allowed through manager actions and config changes.

## Daily Manager Checks (5 minutes)

1. Confirm run status is `COMPLETE` on `Home`.
2. Confirm post-run landing behavior:
   - `Compliance Alerts` opens when issues exist.
   - `Restock List` opens when compliance is clean.
3. Review `Backstock Alerts` for immediate shortages.
4. Review `Compliance Alerts` for THC/expiration gaps.
5. Check unknown-location queue count for new mapping needs.
6. Open `Restock Settings` to confirm `Policy Preset`, `Global Pull Cap`, and `Checklist View` are correct.
7. If run outcome is `BLOCKED_*` or `FAILED_*`, open diagnostics and use runbooks.

## When To Trust vs Verify

Trust the output when:

- Run outcome is `SUCCESS`.
- No schema/preflight block occurred.
- Unknown queue is stable or expected.

Verify before acting when:

- Outcome is any `BLOCKED_*` or `FAILED_*`.
- New locations appeared unexpectedly.
- Counts change sharply without a known business reason.

## Escalation Path

- Start with [When to Override](when-to-override.md)
- Then use [Runbooks](../runbooks/index.md)
- For deeper controls and governance, use [Operations Guide](operations-guide.md)

---
_State of Mind Vault Restock System | Built by Xylent Studios | Steward: Justin Michalke | Script v2.2 | Last reviewed: 2026-03-06_

