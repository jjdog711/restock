---
audience: manager,admin
owner: State of Mind Management + Xylent Studios
last-reviewed: 2026-03-06
script-version: v2.1
status: active
---

# Runbook: SKIPPED_LOCKED

Outcome code: $(System.Collections.Hashtable.outcome)

## Typical Cause

Another run currently holds the document lock.

## Immediate Actions

- Wait for current run to finish.
- Avoid repeated manual clicks during active run.
- If frequent, inspect trigger churn and run durations in System_Diagnostics.
- If persistent, temporarily disable auto-run and test manual flow.

## Escalation Package

Provide to developer:

- run ID
- outcome code and error code
- profile ID
- import signature
- fixture/file used
- screenshots of Daily Home + Diagnostics rows

---
_State of Mind Vault Restock System | Built by Xylent Studios | Steward: Justin Michalke | Script v2.1 | Last reviewed: 2026-03-06_
