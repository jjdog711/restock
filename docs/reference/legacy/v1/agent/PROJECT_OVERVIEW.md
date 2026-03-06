> [!WARNING]
> Historical Archive Notice
> 
> Scope: historical v1 material only.
> This file is preserved for traceability and is not authoritative for the current implementation.
> Current docs start at `docs/index.md`.
# State of Mind – Vault Restock System
_A Google Sheets–based restock checklist for Treez valuation exports_

## 1. Context & Problem

State of Mind is a licensed adult-use cannabis dispensary in Latham, NY.  
All cannabis inventory is stored in a secure vault/back room; customers never touch product directly. Budtenders and vault staff pull units from vault shelves to fulfill orders.

Today, staff export a **Treez Inventory Valuation** report and then manually hack it into a restock list. This process is:

- Slow and repetitive
- Easy to break with small changes to the export or formulas
- Weak on FIFO and barcode awareness
- Hard to audit or explain to managers

We want a small but **studio-grade** system that replaces ad-hoc spreadsheets with a clear, documented restock workflow.

---

## 2. What This System Does (Goals)

The Vault Restock System is a **Google Sheets–based tool** that:

1. **Ingests Treez valuation exports**
   - Staff export a standard Inventory Valuation report from Treez.
   - They paste it into a `Treez Valuation (Raw)` sheet (no manual edits required).

2. **Transforms it via an internal engine**
   - A hidden `Restock Engine (Internal)` sheet:
     - Filters to relevant cannabis inventory.
     - Applies State of Mind–specific location roles (PICK SHELF / RESERVE / IGNORE).
     - Applies stocking rules by product type/size/brand/product.
     - Enforces FIFO (oldest `Date Inventory Received` first).
     - Handles multi-barcode products with safe tie-break logic.
     - Plans pulls from RESERVE locations.

3. **Outputs a clean Restock Checklist**
   - Staff-facing `Restock Checklist` tab shows, per product:
     - Current pick-shelf quantity.
     - Reserve quantity.
     - Target pick-shelf quantity.
     - Recommended quantity to pull.
     - Where to pull from (`First Pull From` / `Then Pull From`).
     - Urgency (critical/soon/low), visually highlighted.
   - It includes simple manual fields:
     - `Units Pulled`
     - `Restock Status`
     - `Done` checkbox
     - `Notes`

The goal is that a vault staff member can use the sheet daily without touching formulas or understanding Treez internals.

---

## 3. What This System Is *Not* (Non-Goals for v1)

For v1, this system is **intentionally limited**. It is **not**:

- A reorder or purchasing system
  - It does not compute vendor order quantities or generate POs.
- A replacement for Treez inventory or compliance reporting
  - It reads Treez data; it does not try to replicate Treez.
- A full batch-level compliance tool
  - It uses `Date Inventory Received` and basic QC (barcodes) but does not manage regulatory batch traceability.
- A multi-store, multi-license inventory system
  - It is scoped to one store (State of Mind) and one Treez valuation export at a time.

Future versions may add reorder suggestions or batch-level views, but v1 is focused on **daily vault restocking only**.

---

## 4. High-Level Workflow

Daily usage is designed to be simple:

1. **Export from Treez**
   - Run the standard Inventory Valuation report.
   - Save as CSV.

2. **Paste into Google Sheets**
   - Open the Vault Restock Sheet.
   - Go to `Treez Valuation (Raw)`.
   - Follow the instructions at the top (e.g. clear old data region, paste new CSV starting at row 6).

3. **Use the Restock Checklist**
   - Go to `Restock Checklist`.
   - Sort or filter by `Urgency` or `Brand` as needed.
   - For each row:
     - Read `Recommended Pull Qty`.
     - Use `First Pull From` (and `Then Pull From` if needed) to pull from backstock.
     - Fill in `Units Pulled`, `Restock Status`, and check `Done` when finished.

4. **Review Exceptions (if needed)**
   - If something seems off, check `Data Exceptions` to see if any rows were excluded (e.g. unknown locations, missing IDs).

Diagrammatically:

```text
Treez → Treez Valuation (Raw) → Restock Engine (Internal) → Restock Checklist
                                 ↑                       ↓
                          Restock Settings         Data Exceptions
```

---

## 5. Key Design Decisions

These are the most important design choices in v1:

1. **Product Identity**
   - Primary product key: `External ID` (Treez product ID).
   - All rows sharing an `External ID` are treated as the same product for restocking.
   - `Product Name` is treated as a **display/menu title** only, not a structured identity field.

2. **Scope of Products**
   - Only `Inventory Type = ADULT` is included.
   - Included `Product Type`s: `FLOWER`, `PREROLL`, `CARTRIDGE`, `EDIBLE`, `EXTRACT`, `BEVERAGE`, `TINCTURE`, `TOPICAL`, `PILL`.
   - `Product Type = MERCH` is always excluded from the Restock Checklist.

3. **Location Roles**
   - `SALES FLOOR` is the **only** pick-shelf (`PICK SHELF`) location in v1.
   - Vault bins/shelves (e.g. BIN 1, FRIDGE 2) are mapped to `RESERVE` when configured.
   - Problem / quarantine / return locations (POS RETURN, QUARANTINE, etc.) are mapped to `IGNORE`.
   - `HELD` is always treated as `IGNORE` in v1. Products must be moved to a sellable location in Treez before they appear on the checklist.
   - Any unmapped location defaults to `IGNORE` until explicitly configured.

4. **FIFO + Barcode Behavior**
   - FIFO is **primary**: older `Date Inventory Received` lots are always pulled before newer ones.
   - Barcodes are used as a **secondary tie-breaker**:
     - The system identifies the **Primary Shelf Barcode** (the barcode with the highest quantity on `SALES FLOOR`).
     - When two RESERVE lots have the same receive date, the lot containing the Primary Shelf Barcode is preferred.
   - If a product has multiple barcodes in inventory, `Barcode Match` is marked as `Check ⚠️` to signal a QC review.

5. **Configuration vs Logic**
   - Stocking rules (by type/size/brand/name) live in `Restock Settings`.
   - Rule matching runs as a **script** during Refresh Checklist (v1.8+).
   - Business logic and formulas live in `Restock Engine (Internal)`.
   - Staff should only need to use:
     - `Instructions`
     - `Treez Valuation (Raw)`
     - `Restock Checklist`

6. **Stocking Rules (v1.8+)**
   - 20 custom rule slots + 1 default rule.
   - Rules define Target, Warning, and Critical thresholds per product category.
   - Matching criteria: Brand (exact), Product Type (exact), Size (contains), Name Contains (contains).
   - Specificity-based matching: more criteria = higher priority.
   - Tie-break: lower Target wins (more conservative).
   - Rules are applied when running **Refresh Checklist** (script-based, not formulas).

---

## 6. Tabs Overview

The core Google Sheets tabs:

- `Instructions` – Plain-language usage guide for staff.
- `Treez Valuation (Raw)` – Paste-only Treez export; no formulas in the data region.
- `Restock Settings` – Configuration tables for location roles and stocking rules.
- `Restock Engine (Internal)` – Hidden formula engine; performs filtering, grouping, FIFO, and pull planning.
- `Restock Checklist` – Staff-facing checklist; includes urgency coloring and manual checkboxes.
- `Data Exceptions` – Shows rows that were excluded (unknown locations, missing IDs, etc.) with reason codes.

See `docs/state_of_mind_vault_restock_system_v1_spec.md` and `docs/restock_checklist_layout.md` for deeper details.

---

## 7. Documentation Map

Key docs in this project:

- **Specs & Rules**
  - `docs/state_of_mind_vault_restock_system_v1_spec.md` – main functional spec.
  - `docs/addendum_v1a_locations_and_held_logic.md` – location roles & HELD behavior.
  - `docs/addendum_v1b_multi_barcode_fifo_logic.md` – multi-barcode handling & FIFO tie-breaker.

- **Field Semantics**
  - `docs/state_of_mind_treez_field_conventions.md` – how Treez fields are actually used at State of Mind.
  - `docs/treez_field_reference.md` – field-by-field Treez valuation reference.

- **Implementation & Layout**
  - `docs/state_of_mind_vault_restock_master_plan_for_agents.md` – step-by-step plan for agents/devs.
  - `docs/agent_quickstart_restocksystem.md` – quick orientation for LLM agents.
  - `docs/restock_checklist_layout.md` – expected columns & visual behavior.
  - `docs/location_map_template.md` – template for mapping Treez locations to roles.
  - `docs/stocking_rules_seed.csv` – seed stocking rules.

- **Quality & Testing**
  - `docs/restock_policy_notes.md` – non-negotiable rules.
  - `docs/test_cases_expected_outputs.md` – scenario tests for validation.

- **Data**
  - `sample_data/Valuation_Report_Sample.csv` – real Treez valuation export used for testing.

---

## 8. Future Directions (Ideas, Not Commitments)

Potential future enhancements, if/when needed:

- **Reorder Suggestions**
  - Simple reorder sheet derived from low reserve quantities and sales velocity (if integrated).
- **Batch-Level Views**
  - Optional "batch audit" sheet surfacing `Batch` / `State Tracking ID` (METRC) with restocking history.
- **Multi-Store Support**
  - Parameterizing location maps and stocking rules for additional stores/licenses.
- **App Script Automation**
  - Automated CSV import, date-stamping, and read-only snapshots of daily checklists.

These are intentionally left out of v1 to keep the system small, understandable, and easy to adopt.

