---
audience: manager
owner: State of Mind Management + Xylent Studios
last-reviewed: 2026-03-06
script-version: v2.2
status: active
---

# Manager FAQ

## Use This Page

Read this first for objections and edge-case concerns.

## 1) If the system is wrong, who is accountable?

Manager remains accountable for final execution. The system provides explainable recommendations and explicit failure states.

## 2) Can I override recommendations?

Yes. Use manager controls and configuration updates. See [When to Override](when-to-override.md).

## 3) How do I know why a row appears?

Decision path is traceable to profile mapping, inventory data, and configured rules. See [How Decisions Are Made](how-decisions-are-made.md).

## 4) What if locations change in Treez?

Unmapped locations default to `IGNORE` and enter `LocationReviewQueue` so you can map them safely.

## 5) What if the run fails?

Check `Home` outcome, open diagnostics, then follow the matching [Runbook](../runbooks/index.md).

## 6) Does this replace manager judgment?

No. It reduces manual scanning and improves consistency; manager judgment remains the final control.

## 7) Will this slow the team down?

For normal runs, it reduces decision time by surfacing priorities and pull paths directly.

## 8) How do we prevent bad output from bad imports?

Guardrails block schema/preflight failures and preserve last good views rather than writing unsafe updates.

## 9) Can staff operate without touching hidden tabs?

Yes. Staff workflow remains import, run, review risk/checklist/compliance.

## 10) Where do I go for deep operations detail?

Use [Operations Guide](operations-guide.md) as optional deep dive.

---
_State of Mind Vault Restock System | Built by Xylent Studios | Steward: Justin Michalke | Script v2.2 | Last reviewed: 2026-03-06_


