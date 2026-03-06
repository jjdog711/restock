---
audience: staff
owner: State of Mind Operations + Xylent Studios
last-reviewed: 2026-03-06
script-version: v2.1
status: active
---

# Quick Reference Card

Print this for the vault station.

## Daily Import (3 minutes)

1. Treez: `Reports -> Inventory Valuation -> Export CSV`
2. Sheet: `Treez Valuation (Raw)` and click `A6`
3. `File -> Import -> Upload -> Replace data at selected cell`
4. `Restock -> Run Daily Update`
5. Review `No_Reserve_Risk`
6. Work `Restock Checklist`

## Priority Levels

- `1 - Critical`: restock now
- `2 - Soon`: restock today
- `3 - Low`: restock as time allows

## Checklist Rules

- Pull from `First Pull From` before `Then Pull From`
- Enter pulled units in `Pull`
- Mark `Done` when complete

## Compliance Rules

- Review `Missing_Compliance` every run
- Escalate `MISSING_BOTH` immediately

## Common Help Path

- Empty checklist: recheck import cell (`A6`) and rerun daily update
- Wrong profile: escalate to manager/admin
- Unknown location: tell manager to review queue

---
_State of Mind Vault Restock System | Built by Xylent Studios | Steward: Justin Michalke | Script v2.1 | Last reviewed: 2026-03-06_
