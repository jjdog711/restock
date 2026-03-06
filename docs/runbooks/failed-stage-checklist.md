---
audience: manager,admin
owner: State of Mind Management + Xylent Studios
last-reviewed: 2026-03-06
script-version: v2.1
status: active
---

# Runbook: FAILED_STAGE_CHECKLIST

Outcome code: $(System.Collections.Hashtable.outcome)

## Typical Cause

Checklist stage failed after preflight.

## Immediate Actions

- Open diagnostics and capture run_id and error_code.
- Validate Restock Settings structure and checklist schema contract.
- Run Run Checklist Only to isolate stage behavior.
- Escalate to developer with fixture used and run_id.

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
