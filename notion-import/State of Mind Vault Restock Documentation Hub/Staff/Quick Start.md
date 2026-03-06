# Quick Start (Staff)

> Reviewed: 2026-03-06 | Status: active | Script version: v2.2

Daily workflow stays simple.

## 1. Export from Treez

- Run `Inventory Valuation`
- Export CSV

## 2. Import into the workbook

- Open `Treez Valuation (Raw)`
- Select cell `A6`
- `File -> Import -> Upload`
- Choose `Replace data at selected cell`

## 3. Run the daily pipeline

- Menu: `Restock -> Run Daily Update`
- Wait for completion popup
- If auto-run is installed, still verify the run summary on `Home`
- Routing behavior:
  - Opens `Compliance Alerts` when compliance issues are found
  - Opens `Restock List` when there are no compliance issues

## 4. Review compliance if routed there

- If `Compliance Alerts` opened, resolve flagged rows first

## 5. Review risk

- Open `Backstock Alerts`
- Handle `1 - Critical` rows first

## 6. Work the restock list

- Open `Restock List`
- Follow `First Pull From` then `Then Pull From`
- Enter pulled units in `Pull` and mark `Done`
- If blocked, set status to `Blocked` and choose a reason in `Notes`

## 7. Confirm compliance completion

- Open `Compliance Alerts`
- Work rows flagged `MISSING_THC`, `MISSING_EXP`, or `MISSING_BOTH`

## If the checklist is empty

1. Confirm CSV import started at `A6`
2. Re-run `Restock -> Run Daily Update`
3. Escalate to manager using [Manager Start Here](../Managers/Start Here.md)
4. Manager should run `Restock -> Run System Check`

