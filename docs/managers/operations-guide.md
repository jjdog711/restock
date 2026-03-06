---
audience: manager
owner: State of Mind Management + Xylent Studios
last-reviewed: 2026-03-06
script-version: v2.2
status: active
---

# Manager Operations Guide

## Use This Page

Optional deep dive. Read this after:

1. [Start Here](start-here.md)
2. [How Decisions Are Made](how-decisions-are-made.md)
3. [When to Override](when-to-override.md)

## Daily Manager Checklist

1. Confirm staff imported CSV to `Treez Valuation (Raw)!A6`
2. Confirm `Run Daily Update` completed
3. Review `Home` run summary and health block
4. Confirm run landed on `Compliance Alerts` when flagged, otherwise `Restock List`
5. Review `Backstock Alerts` and `Compliance Alerts`
6. Review unknown-location queue if warnings exist

## Quick Stocking Controls

Manager controls live on `Restock Settings` (top-right panel).

- `Checklist View`: `PRIORITY` or `LOCATION_WAVE`
- `Policy Preset`: `Balanced (Recommended)`, `Conservative`, `Aggressive`, `Custom`
- `Global Pull Cap`: hard cap used in recommended pull formula:
  `MIN(shortfall, reserve, pull cap)`
- `Restock Status` model on checklist: `To Pull`, `In Progress`, `Done`, `Blocked`

Usage guidance:

1. Use presets for stable daily operations.
2. Use `Custom` only when you intentionally manage rule thresholds row-by-row.
3. Keep threshold order valid in active rules: `Target >= Warning >= Critical`.
4. For blocked rows, use checklist `Notes` dropdown reasons before free-text notes.

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

## Communication Support

- [Cutover Brief Script](cutover-brief-script.md)
- [Cutover Week Check-Ins](cutover-week-checkins.md)
- [Manager FAQ](faq.md)

---
_State of Mind Vault Restock System | Built by Xylent Studios | Steward: Justin Michalke | Script v2.2 | Last reviewed: 2026-03-06_

