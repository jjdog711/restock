# Quick Reference Card

> Reviewed: 2026-03-06 | Status: active | Script version: v2.2

Print this for the vault station.

## Daily Import (3 minutes)

1. Treez: `Reports -> Inventory Valuation -> Export CSV`
2. Sheet: `Treez Valuation (Raw)` and click `A6`
3. `File -> Import -> Upload -> Replace data at selected cell`
4. `Restock -> Run Daily Update`
5. Review `Backstock Alerts`
6. Work `Restock List`

## Priority Levels

- `1 - Critical`: restock now
- `2 - Soon`: restock today
- `3 - Low`: restock as time allows

## Checklist Rules

- Pull from `First Pull From` before `Then Pull From`
- Enter pulled units in `Pull`
- If blocked, set status to `Blocked` and pick a `Notes` reason
- Mark `Done` when complete

## Compliance Rules

- Review `Compliance Alerts` every run
- Escalate `MISSING_BOTH` immediately

## Common Help Path

- Empty checklist: recheck import cell (`A6`) and rerun daily update
- Wrong profile: escalate to manager/admin
- Unknown location: tell manager to review queue

