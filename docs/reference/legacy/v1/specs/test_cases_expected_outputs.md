> [!WARNING]
> Historical Archive Notice
> 
> Scope: historical v1 material only.
> This file is preserved for traceability and is not authoritative for the current implementation.
> Current docs start at `docs/index.md`.
# Test Cases & Expected Outputs – Vault Restock System (v1a)

Use these scenarios to verify formulas and logic.  
They are **conceptual** but should be easy to recreate in a small test sheet.

Each scenario describes:
- Input rows (simplified)
- Expected behavior on `Restock Checklist`.

---

## Case 1 – No restock needed

**Input**

- Product: Flower 3.5g
- Product Type: FLOWER
- Size: `3.5 G`
- Location: `SALES FLOOR`
- Pick Shelf Qty: 6
- Reserve Qty: 10 (in various RESERVE locations)
- Rule: Target=6, Warning=4, Critical=2

**Expected**

- Product **does not appear** on `Restock Checklist`.
- Because `Pick Shelf Qty >= Target Pick Qty`.

---

## Case 2 – Simple restock from single RESERVE location

**Input**

- Product: Flower 3.5g
- Location: `SALES FLOOR` (Pick Shelf) with 2 units
- Location: `BIN 1` (RESERVE) with 10 units, received 10/10/2025
- Rule: Target=6, Warning=4, Critical=2

**Expected**

- Shortfall = 6 - 2 = 4
- Recommended Pull Qty = 4 (Reserve has enough)
- Urgency:
  - Pick Shelf Qty (2) ≤ Critical (2) → `Urgency = Critical`
- On `Restock Checklist`:
  - `Recommended Pull Qty = 4`
  - `First Pull From = "4 from BIN 1 (oldest 10/10/2025)"`
  - `Then Pull From` = blank

---

## Case 3 – Multi-location RESERVE (First + Then)

**Input**

- Product: Flower 3.5g
- `SALES FLOOR`: 1 unit
- `BIN 1`: 3 units, received 10/10/2025
- `BACK SHELF 1`: 5 units, received 10/20/2025
- Rule: Target=6, Warning=4, Critical=2

**Expected**

- Shortfall = 6 - 1 = 5
- Reserve Qty = 3 + 5 = 8
- Recommended Pull Qty = 5
- Urgency:
  - Pick Shelf Qty (1) ≤ Critical (2) → `Critical`
- On `Restock Checklist`:
  - `Recommended Pull Qty = 5`
  - `First Pull From = "3 from BIN 1 (oldest 10/10/2025)"`
  - `Then Pull From = "2 from BACK SHELF 1 (next oldest 10/20/2025)"`

---

## Case 4 – No RESERVE

**Input**

- Product: Cartridge 1g
- `SALES FLOOR`: 1 unit
- No RESERVE rows
- Rule: Target=4, Warning=2, Critical=1

**Expected**

- Shortfall = 4 - 1 = 3
- Reserve Qty = 0
- Recommended Pull Qty = 0
- Urgency:
  - Pick Shelf Qty (1) ≤ Critical (1) → `Critical`
- On `Restock Checklist`:
  - Product **appears** (because Pick Shelf Qty < Target).
  - `Recommended Pull Qty = 0`
  - `First Pull From` / `Then Pull From` blank.
  - Staff will likely set `Restock Status = "No Backstock"`.

---

## Case 5 – MERCH excluded

**Input**

- Product: Rolling Tray
- Product Type: MERCH
- Inventory Type: ADULT
- Location: any
- Available: 10

**Expected**

- This product **never appears** on `Restock Checklist` in v1.
- MERCH is excluded from the engine.

---

## Case 6 – Conflicting barcodes (QC)

**Input**

Two raw rows for what appears to be the same product (same Brand, Product Name, Size) but:

- Row A: Product Barcodes = `1111111111111`
- Row B: Product Barcodes = `2222222222222`
- Both in RESERVE locations.

**Expected**

- Combined into one product row in the engine (via fallback identity).
- `Barcode Match = "Check ⚠️"` on the checklist row.
- Product still appears if it needs restocking.
- Human should verify in Treez before pulling.

---

## Case 7 – Brand-specific override

**Input**

- Product A: Sluggerz PR Pack
  - Brand: SLUGGERZ
  - Product Type: PREROLL
  - Pack Style: Pack
  - `SALES FLOOR`: 3 units
  - Reserve: 20 units
- Product B: OtherBrand PR Pack
  - Brand: OTHERBRAND
  - Product Type: PREROLL
  - Pack Style: Pack
  - `SALES FLOOR`: 3 units
  - Reserve: 20 units

**Rules**

- `Preroll – Pack`: Target=4, Warning=3, Critical=1
- `Sluggerz – PR Packs`: Target=6, Warning=4, Critical=2

**Expected**

- Product A (Sluggerz):
  - Uses brand rule: Target=6.
  - Shortfall = 6 - 3 = 3 → Recommended Pull = 3.
- Product B (OtherBrand):
  - Uses generic rule: Target=4.
  - Shortfall = 4 - 3 = 1 → Recommended Pull = 1.

Brand-specific overrides take precedence over generic rules.

---

## Case 8 – HELD inventory (always ignored in v1)

**Input**

- Product: Flower 3.5g
- `SALES FLOOR`: 0 units
- `HELD`: 20 units
- Rule: Target=6, Warning=4, Critical=2

**Expected**

- HELD inventory is **always ignored** in v1.
- Pick Shelf Qty = 0
- Reserve Qty (eligible) = 0
- Product may appear on checklist as a "no backstock" item (Pick Shelf Qty < Target, Reserve Qty = 0).
- Staff would mark `Restock Status = "No Backstock"`.

**Note:** HELD inventory must be moved to a sellable location in Treez before it can be considered for restocking.

---

## Case 10 – Unknown location

**Input**

- Product: Flower 3.5g
- One row in location `MYSTERY SHELF` (not present in `Location Roles`).
- Available: 10 units.
- Product otherwise eligible (ADULT + FLOWER).

**Expected**

- Because `MYSTERY SHELF` is not mapped in `Location Roles`, it is treated as **ignored**.
- This row does not contribute to Pick Shelf Qty or Reserve Qty.
- A debug entry may be logged in `Data Exceptions` with reason `UNKNOWN_LOCATION_ROLE`.

Unmapped locations must not silently influence the restock logic.


---

## Case 11 – FIFO beats barcode match when barcodes differ

This case verifies that **FIFO by Date Inventory Received** takes priority over barcode matching to the dominant shelf barcode.

**Input**

- Product: Flower 3.5g

**SALES FLOOR (pick shelf)**

- Row 1: Barcode `B`, Date Received `2025-12-05`, Qty = 8  
- Row 2: Barcode `A`, Date Received `2025-12-10`, Qty = 2  

→ Primary Shelf Barcode = `B` (highest shelf quantity).

**RESERVE**

- BIN 1: Barcode `A`, Date Received `2025-11-01`, Qty = 10  
- BIN 2: Barcode `B`, Date Received `2025-11-15`, Qty = 10  

Assume the stocking rule says:

- Target = 6, Warning = 4, Critical = 2

Current Pick Shelf Qty = 10 (8 of B + 2 of A).  
For the sake of the example, imagine Pick Shelf Qty is lower and we need to pull 6 units (e.g. different starting quantities but same relative dates and barcodes).

**Expected behavior**

- Among RESERVE rows, `BIN 1` (barcode A, 2025-11-01) is **older** than `BIN 2` (barcode B, 2025-11-15).
- FIFO requires we pull from `BIN 1` first, even though its barcode is **not** the dominant shelf barcode.

On `Restock Checklist` after applying the sorted RESERVE order:

- `First Pull From = "6 from BIN 1 (oldest 11/01/2025, barcode A)"`
- `Then Pull From` = blank (if 6 units covers the shortfall).

`Barcode Match` for this product should be `Check ⚠️` to signal the mixed-barcode situation, but FIFO remains the controlling factor in which lot we pull from first.

