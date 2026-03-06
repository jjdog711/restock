---
audience: manager,admin
owner: State of Mind Management + Xylent Studios
last-reviewed: 2026-03-06
script-version: v2.2
status: active
---

# Runbook: FAILED_EXCEPTION

Outcome code: $(System.Collections.Hashtable.outcome)

## Typical Cause

Unhandled runtime exception occurred.

## Immediate Actions

- Capture run_id, stage, and error details from diagnostics.
- Confirm whether checklist/compliance outputs were preserved.
- Attempt one manual rerun after no active lock.
- Escalate immediately to developer if reproducible.

## Escalation Package

Provide to developer:

- run ID
- outcome code and error code
- profile ID
- import signature
- fixture/file used
- screenshots of Home + Diagnostics rows

---
_State of Mind Vault Restock System | Built by Xylent Studios | Steward: Justin Michalke | Script v2.2 | Last reviewed: 2026-03-06_


