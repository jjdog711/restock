---
audience: manager,admin
owner: State of Mind Management + Xylent Studios
last-reviewed: 2026-03-06
script-version: v2.2
status: active
---

# Runbook: SKIPPED_DUPLICATE

Outcome code: $(System.Collections.Hashtable.outcome)

## Typical Cause

Auto-trigger fired with an unchanged import signature.

## Immediate Actions

- No action needed if last success is recent.
- If a fresh import should have run, verify import replaced raw range at A6.
- Check signature-related fields in diagnostics for unexpected stability.
- Manual Run Daily Update can be used to force execution.

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


