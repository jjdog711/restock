---
audience: staff
owner: State of Mind Operations + Xylent Studios
last-reviewed: 2026-03-06
script-version: v2.1
status: active
---

# Quick Start (Staff)

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
- If auto-run is installed, still verify the run summary on `Daily Home`

## 4. Review risk first

- Open `No_Reserve_Risk`
- Handle `1 - Critical` rows first

## 5. Work the checklist

- Open `Restock Checklist`
- Follow `First Pull From` then `Then Pull From`
- Enter pulled units in `Pull` and mark `Done`

## 6. Resolve compliance issues

- Open `Missing_Compliance`
- Work rows flagged `MISSING_THC`, `MISSING_EXP`, or `MISSING_BOTH`

## If the checklist is empty

1. Confirm CSV import started at `A6`
2. Re-run `Restock -> Run Daily Update`
3. Tell a manager to check `System_Reference -> LocationReviewQueue`
4. Tell a manager to run `Restock -> Run System Check`

---
_State of Mind Vault Restock System | Built by Xylent Studios | Steward: Justin Michalke | Script v2.1 | Last reviewed: 2026-03-06_
