---
audience: manager
owner: State of Mind Management + Xylent Studios
last-reviewed: 2026-03-06
script-version: v2.1
status: active
---

# Manager Operations Guide

Use this guide for governance, diagnostics, and escalation.

## Daily Manager Checklist

1. Confirm staff imported CSV to `Treez Valuation (Raw)!A6`
2. Confirm `Run Daily Update` completed
3. Review `Daily Home` run summary and health block
4. Review `No_Reserve_Risk` and `Missing_Compliance`
5. Review unknown-location queue if warnings exist

## Profile Governance

Source-of-truth: `System_Reference -> StoreProfiles` and `LocationProfileMap`.

Seed profiles:

- `ALBANY -> OCM-RETL-26-000470-D1`
- `LATHAM -> OCM-CAURD-24-000178-D1`

Resolution order:

1. `profile_override=TRUE`
2. Dominant `Receiving License` in raw data
3. `is_default=TRUE`

## Unknown Location Queue Flow

Queue table: `System_Reference -> LocationReviewQueue`

1. Review `NEW` or `OPEN` rows
2. Decide role (`PICK SHELF`, `RESERVE`, `IGNORE`)
3. Add/update mapping in `LocationProfileMap`
4. Mark queue row `CLOSED` with notes
5. Re-run `Run Daily Update`

Safety behavior:

- Unmapped locations default to `IGNORE`
- Queue is deduped by `(profile_id, location_name)` with rolling `seen_count`

## Diagnostics Interpretation

Primary table: `System_Diagnostics -> Run_Journal`

Outcomes:

- `SUCCESS`: pipeline completed
- `BLOCKED_SCHEMA`: required raw/config schema missing
- `BLOCKED_PREFLIGHT`: reserve/profile safety gate failed
- `SKIPPED_LOCKED`: another run held lock
- `SKIPPED_DUPLICATE`: auto-trigger duplicate signature
- `FAILED_STAGE_CHECKLIST`: checklist stage failed
- `FAILED_STAGE_COMPLIANCE`: compliance stage failed
- `FAILED_EXCEPTION`: unhandled exception

Use menu:

- `Restock -> Run System Check`
- `Restock -> Open Diagnostics`

## Escalation Playbook

- `BLOCKED_SCHEMA`: verify header row, alias mapping, and config contracts
- `BLOCKED_PREFLIGHT`: verify profile mapping and reserve coverage
- `FAILED_*`: capture run ID and stage, then escalate to dev/admin
- repeated `SKIPPED_LOCKED`: inspect trigger frequency and run duration

Runbook links:

- [Blocked Schema](../runbooks/blocked-schema.md)
- [Blocked Preflight](../runbooks/blocked-preflight.md)
- [Skipped Locked](../runbooks/skipped-locked.md)
- [Skipped Duplicate](../runbooks/skipped-duplicate.md)
- [Failed Stage Checklist](../runbooks/failed-stage-checklist.md)
- [Failed Stage Compliance](../runbooks/failed-stage-compliance.md)
- [Failed Exception](../runbooks/failed-exception.md)

---
_State of Mind Vault Restock System | Built by Xylent Studios | Steward: Justin Michalke | Script v2.1 | Last reviewed: 2026-03-06_
