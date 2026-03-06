---
audience: manager,admin
owner: State of Mind Management + Xylent Studios
last-reviewed: 2026-03-06
script-version: v2.2
status: active
---

# Runbook: BLOCKED_PREFLIGHT

Outcome code: `BLOCKED_PREFLIGHT`

## Typical Cause

Preflight detected profile/location coverage collapse or reserve path failure.

## Immediate Actions

- Check active profile on Home.
- Review System_Reference -> LocationProfileMap for missing reserve mappings.
- Review LocationReviewQueue for newly discovered locations.
- Update map, then rerun Run Daily Update.

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


