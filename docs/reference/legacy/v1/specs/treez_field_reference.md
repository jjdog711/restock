> [!WARNING]
> Historical Archive Notice
> 
> Scope: historical v1 material only.
> This file is preserved for traceability and is not authoritative for the current implementation.
> Current docs start at `docs/index.md`.
# Treez Field Reference – Vault Restock System (v1d – METRC Update)

This document explains the **Treez Inventory Valuation** fields that matter for the vault restock system, and how they are used.

For full behavior, see:
- `docs/state_of_mind_vault_restock_system_v1_spec.md`
- `docs/addendum_v1a_locations_and_held_logic.md`
- `docs/addendum_v1b_multi_barcode_fifo_logic.md`

---

## 1. Core product identity fields

At State of Mind, the **canonical product identity** for the restock system is:

> `External ID` (Treez product ID)

This is a 1:1 identifier for a product (Brand + Product Name + Size + Product Type), regardless of location, batch, or barcode.

Other identity-related fields are used as display or fallback fields, but **External ID is the primary product key** in this system.

| Treez Column        | Used? | Purpose in Restock System                                      |
|---------------------|-------|-----------------------------------------------------------------|
| `External ID`       | Yes   | **Primary Product Key**. Groups rows into one logical product. |
| `Brand`             | Yes   | Display on checklist; filter in Brand-specific rules; part of fallback identity. |
| `Product Name`      | Yes   | Display; part of fallback identity; helps Pack Style parsing.   |
| `Product Type`      | Yes   | Drives inclusion (cannabis vs MERCH) and stocking rules.        |
| `Subtype`           | Yes   | Optional rule filter (e.g. infused vs non-infused).             |
| `Size`              | Yes   | Used to distinguish 3.5g vs 14g vs 28g, etc.; rule matching.    |
| `Classification`    | Yes   | Display-only (Indica/Sativa/Hybrid/CBD) on checklist.           |
| `Product Barcodes`  | Optional | May contain product-level barcodes; not always populated in this export. |
| `Inventory Barcodes`| Yes   | Contains one or more barcodes/identifiers for inventory units in this row. Used for barcode matching and QC, not as the primary product key. |

**Fallback identity (only if `External ID` is missing):**

If an export row ever arrives with a missing `External ID` (rare), the system may fall back to a “concept key” based on:

> `ConceptKey = Brand + Product Name + Size + Product Type`

This is used purely as a backup to avoid dropping products when an ID is missing.

**Product Types included in v1:**

- `FLOWER`
- `PREROLL`
- `CARTRIDGE`
- `EDIBLE`
- `EXTRACT`
- `BEVERAGE`
- `TINCTURE`
- `TOPICAL`
- `PILL`

**Product Types excluded in v1:**

- `MERCH` (never appears on the Restock Checklist).

---

## 2. Inventory & location fields

| Treez Column                | Used? | Purpose                                                       |
|----------------------------|-------|---------------------------------------------------------------|
| `Available`                | Yes   | Count of units in that row; used for all quantity math.       |
| `Location`                 | Yes   | Mapped to `PICK SHELF` / `RESERVE` / `IGNORE` in Settings.    |
| `Inventory Type`           | Yes   | Filter: we only use rows where `Inventory Type = ADULT`.      |

**Location mapping summary (v1):**

- `SALES FLOOR` → `PICK SHELF`
- Known vault storage (bins, shelves, fridge bins, etc.) → `RESERVE`
- Special/problem locations (quarantine, returns, HELD, etc.) → `IGNORE`.

Unmapped locations default to **ignored** until explicitly configured in `Restock Settings → Location Roles`.

---

## 3. Date & time fields

| Treez Column                    | Used? | Purpose                                                         |
|--------------------------------|-------|-----------------------------------------------------------------|
| `Date of Inventory Valuation`  | Yes   | Displayed in Restock Checklist header (report date).           |
| `Time of Inventory Valuation`  | Yes   | Displayed in Restock Checklist header (report time).           |
| `Date Inventory Received`      | Yes   | Used to rank RESERVE locations by age (oldest first).          |
| `Time Inventory Received`      | Optional | Can be used as tie-breaker if needed; not required in v1.  |
### HELD location handling (v1)

In v1, **HELD inventory is always treated as IGNORE**. The Treez export does not currently include a release/available date column, so there is no mechanism to determine when HELD inventory becomes sellable.

Products in HELD locations must be moved to a sellable location in Treez before they will appear on the Restock Checklist.

---

## 4. Batch / lot fields

> **Note (December 2025):** Column names changed due to NY state METRC integration.
> - `Ext Batch ID` is now `State Tracking ID` (METRC tracking number)
> - `Treez Batch` is now `Batch`
> - New columns added: `Harvest Batch`, `Production Batch #`

| Treez Column         | Used? | Purpose                                                       |
|----------------------|-------|---------------------------------------------------------------|
| `Batch`              | Optional | Identifies a specific Treez batch/lot; useful for audit/QC but not used as product key. (Formerly `Treez Batch`) |
| `State Tracking ID`  | Optional | METRC tracking ID for compliance; not used as product key. (Formerly `Ext Batch ID`) |
| `Harvest Batch`      | Optional | Harvest batch identifier for traceability; not required in v1 logic. |
| `Production Batch #` | Optional | Production batch number for traceability; not required in v1 logic. |
| `Harvest Date`       | Optional | May correlate with batch; not required in v1 logic.          |
| `Packaged Date`      | Optional | May correlate with batch; not required in v1 logic.          |

Notes:

- The restock system operates at the **product level** (`External ID`), not the batch level.
- FIFO is driven by `Date Inventory Received`, which usually correlates with batch, but we do not split the restock checklist by batch.
- Batch fields can be surfaced on debug tabs (`Data Exceptions`) or in future enhancements if more granular control is needed.

---

## 5. Fields explicitly *not* used in v1

These exist in the Treez export but are **ignored** by the vault restock logic in v1:

- Pricing fields (`Unit Cost`, `Unit Price`, `Total Cost`, `Potential Gross Sales`, etc.)
- Lab result fields (`Thc Lab Result`, `Cbd Lab Result`, etc.)
- Terpene fields, potency totals, etc.

They may still be present in `Treez Valuation (Raw)` for reference, but the engine does not depend on them.

---

## 6. Summary

- **Primary product identity** = `External ID` (Treez product ID).
- **Fallback identity** (rare) = Brand + Product Name + Size + Product Type.
- **Barcodes** (`Inventory Barcodes`, optionally `Product Barcodes`) are used for:
  - Matching the most common shelf barcode when dates tie.
  - Detecting mixed-barcode situations for QC (`Barcode Match` field).
- **Batch IDs** (`Batch`, `State Tracking ID`) are not used as product keys in v1; they are optional metadata for compliance/traceability.

FIFO behavior is driven by `Date Inventory Received` for RESERVE locations, with barcode matching used as a secondary tie-breaker only when dates are equal.

