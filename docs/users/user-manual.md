---
audience: staff
owner: State of Mind Operations + Xylent Studios
last-reviewed: 2026-03-06
script-version: v2.2
status: active
---

# User Manual

This manual is for daily staff operation. No hidden-tab edits are required.

## Daily Flow

1. Import Treez CSV to `Treez Valuation (Raw)!A6`
2. Open `Home`
3. Run `Restock -> Run Daily Update`
4. If routed to `Compliance Alerts`, resolve compliance issues first
5. Review `Backstock Alerts`
6. Work `Restock List`
7. Confirm `Compliance Alerts` is clear or assigned

## What `Run Daily Update` Does

1. Resolves active profile (`ALBANY` or `LATHAM`)
2. Runs schema + preflight safety gates
3. Syncs location roles for the active profile
4. Refreshes checklist and no-reserve risk view
5. Runs THC/expiration compliance audit
6. Logs run health and outcomes
7. Routes to `Compliance Alerts` when flagged, otherwise `Restock List`

## Tabs You Use

- `Home`
- `Treez Valuation (Raw)`
- `Backstock Alerts`
- `Restock List`
- `Compliance Alerts`

## Checklist View Options

- `Restock -> Checklist View -> Priority Order`
- `Restock -> Checklist View -> Location Wave`

Use `Priority Order` as default. Use `Location Wave` when you want fewer location switches.

## Store Profile Notes

### Albany

- Profile ID: `ALBANY`
- License: `OCM-RETL-26-000470-D1`
- Core pickup location: `SALES FLOOR`

### Latham

- Profile ID: `LATHAM`
- License: `OCM-CAURD-24-000178-D1`
- Core pickup location: `SALES FLOOR`

Profile resolution is automatic unless an admin sets a profile override.

## Compliance Flags

- `MISSING_THC`: processed row missing valid THC/potency value
- `MISSING_EXP`: processed row missing parseable expiration
- `MISSING_BOTH`: both values missing

## Common Issues

### Auto-run did not run

- Escalate to manager using [Manager Start Here](../managers/start-here.md)

### Run shows `BLOCKED_*`

- Do not manually edit hidden tabs
- Escalate through [Manager Start Here](../managers/start-here.md)

### Unknown location impact

- Unmapped locations default to `IGNORE`
- Manager reviews queue at `System_Reference -> LocationReviewQueue`

---
_State of Mind Vault Restock System | Built by Xylent Studios | Steward: Justin Michalke | Script v2.2 | Last reviewed: 2026-03-06_

