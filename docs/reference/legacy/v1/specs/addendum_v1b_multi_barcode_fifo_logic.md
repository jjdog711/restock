> [!WARNING]
> Historical Archive Notice
> 
> Scope: historical v1 material only.
> This file is preserved for traceability and is not authoritative for the current implementation.
> Current docs start at `docs/index.md`.
# Addendum v1b – Multi-Barcode & FIFO Tie-Break Logic

This addendum refines how the vault restock system handles **products with multiple barcodes and/or multiple acceptance dates**, especially when there is already mixed inventory on the `SALES FLOOR`.

If anything in the main v1 spec conflicts with this file, **this addendum wins**.

---

## 1. Concept: one product, multiple barcodes

Some products at State of Mind:
- Are conceptually the **same product** (same Brand + Product Name + Size + Product Type, same `External ID`),
- But appear in inventory with **multiple barcodes** (packaging changes, relabels, vendor issues, etc.).

For the restock system:

- We treat this as **one product** for:
  - Target pick-shelf quantity
  - Pick Shelf Qty
  - Reserve Qty
  - Urgency and whether it appears on the checklist

- We still track that multiple barcodes exist and:
  - Prefer pulls that match the most common barcode on `SALES FLOOR`, **as long as FIFO is not violated**.
  - Flag “mixed barcode” situations via the `Barcode Match` QC field.

The grouping key for the engine is:

> **Primary**: `External ID` (Treez product ID)  
> **Fallback (rare)**: `Brand + Product Name + Size + Product Type` if `External ID` is missing

All rows sharing a product’s `External ID` are treated as a single logical product in the engine, even if their `Inventory Barcodes` differ.

---

## 2. Determining the primary shelf barcode

When there are multiple barcodes in play for a given product, we need a **primary** barcode to prefer when there’s a tie on dates.

### 2.1 When there is inventory on SALES FLOOR

If there is at least one `PICK SHELF` row (i.e. `Location = SALES FLOOR`) with a non-blank barcode in `Inventory Barcodes`:

1. Parse `Inventory Barcodes` for each SALES FLOOR row into one or more individual barcodes (e.g. splitting on commas if needed).
2. Count how many units per barcode on SALES FLOOR:
   - For each unique barcode value, sum `Available` quantities across rows that include that barcode.

3. Choose the **Primary Shelf Barcode** as:
   - The barcode with the **highest total Pick Shelf Qty** across SALES FLOOR rows.

4. If there is a tie for highest shelf quantity between barcodes:
   - Optionally break ties by the **oldest Date Inventory Received** among the tied barcodes.
   - If still tied, use a deterministic rule (e.g. lexicographically smallest barcode string).

### 2.2 When there is no inventory on SALES FLOOR

If the product is not yet present on SALES FLOOR (all stock is in RESERVE):

- There is no “current shelf” barcode to match.
- You may still define a primary barcode for tie-breaking within RESERVE by choosing, for example:
  - The barcode whose RESERVE lot has the **oldest Date Inventory Received**, or
  - If tied, the barcode with the **smallest total RESERVE quantity** (clear small outlier lots first).

In either case, **FIFO by date remains the top priority** (see next section).

---

## 3. Sorting RESERVE rows for pull planning

When the system decides how to restock a product, it needs to choose **which RESERVE locations** to pull from.

### 3.1 Core principle

**FIFO by date is always the primary rule.**  
Barcode matching is a **secondary tiebreaker** used only when dates are equal, not a replacement for FIFO.

In other words:

- We do **not** skip an older RESERVE lot just because its barcode doesn’t match the dominant barcode on the shelf.
- If a RESERVE lot is older than the lots that match the dominant shelf barcode, we pull from the older lot first to maintain true FIFO.

### 3.2 Sorting key

For each RESERVE row of a product, derive:

- `ReceiveDate` – from `Date Inventory Received`.
- `MatchesPrimaryShelfBarcode` –
  - `0` if the row’s `Inventory Barcodes` contain the **Primary Shelf Barcode**.
  - `1` if not (including blank/other codes).
- `LocationQty` – units available at that location (`Available`).
- `LocationName` – Treez location label.

Then sort all RESERVE rows by the following multi-key, in order:

1. `ReceiveDate` ascending (oldest first)  
2. `MatchesPrimaryShelfBarcode` ascending (0 before 1)  
3. `LocationQty` ascending (smaller stashes first)  
4. `LocationName` ascending (stable, deterministic tie-breaker)

This guarantees:

- **Oldest inventory always wins** (strict FIFO).
- Among lots with the **same date**, we prefer:
  - The barcode that matches the dominant shelf barcode.
  - And within that, smaller stashes first to clear out partial locations.

### 3.3 Applying to First Pull / Then Pull

After sorting RESERVE rows with the key above:

1. Set `Needed = Recommended Pull Qty`.
2. Iterate through the sorted list:
   - For the first row with `LocationQty > 0`:
     - `PrimaryAmount = min(Needed, LocationQty)`
     - This row becomes `First Pull From`:
       - e.g. `"3 from BIN 1 (oldest 10/10/2025, barcode 1234)"`
     - Decrease `Needed` by `PrimaryAmount`.
   - If `Needed > 0`, move to the next row:
     - `SecondaryAmount = min(Needed, LocationQty)`
     - This row becomes `Then Pull From`:
       - e.g. `"2 from BACK SHELF 1 (next 10/20/2025, barcode 5678)"`
     - Decrease `Needed` accordingly.

3. Stop after you have either:
   - Fulfilled `Needed`, or
   - Run out of RESERVE rows.

This sorted order must be used consistently for both `First Pull From` and `Then Pull From`.

---

## 4. Barcode Match QC field

For each product (grouped by `External ID`), collect:

- `AllBarcodes = UNIQUE(non-blank barcodes parsed from Inventory Barcodes across pick and reserve rows).`

Then set the `Barcode Match` QC field on `Restock Checklist` as:

- `OK ✅` – if `len(AllBarcodes) <= 1`.
- `Check ⚠️` – if `len(AllBarcodes) > 1`.

The QC field does **not** change how counts and targets are computed.  
It signals to human staff that the product is currently stored under multiple barcodes and may require verification in Treez if that’s not intentional.

---

## 5. Example: FIFO beats barcode match

(See file for full example; unchanged from prior version.)

---

## 6. Summary

- We treat *conceptually identical* SKUs as one product in the engine, keyed by `External ID`, even if there are multiple barcodes.
- We still track all barcodes and prefer pulls that keep the shelf consistent **when dates are equal**.
- **FIFO by Date Inventory Received always comes first.**  
  - Barcode matching and “clear smaller stashes first” are **secondary tie-breakers**, not replacements for FIFO.
- Mixed-barcode situations are surfaced via `Barcode Match = Check ⚠️` for human awareness.

Any implementation of restock pull-planning logic should be checked against this addendum and updated test cases.

