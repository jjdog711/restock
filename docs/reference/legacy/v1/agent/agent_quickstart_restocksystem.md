> [!WARNING]
> Historical Archive Notice
> 
> Scope: historical v1 material only.
> This file is preserved for traceability and is not authoritative for the current implementation.
> Current docs start at `docs/index.md`.
# Agent Quickstart – State of Mind Vault Restock System

This file tells you (an AI agent / Opus 4.5 in Cursor) **how to work on this project**.

You are helping build and maintain a **Google Sheets–based vault restock tool** for:

- **State of Mind** – a licensed adult-use cannabis dispensary in Latham, NY.
- All cannabis inventory is stored in a **secured vault / back room**.
- Customers never touch product; budtenders pull units from vault shelves.
- The only **pick shelf** location is `SALES FLOOR`. All other storage locations are treated as **backstock (RESERVE)** or **ignored**, depending on configuration and policy.
- Some products may appear with **multiple barcodes** (packaging/label changes, vendor quirks, etc.), which are treated as one conceptual product with additional FIFO and tie-break rules.
- This tool is being built by **Xylent Studios** (internal dev/ops partner) for State of Mind.

Your job is to:
- Implement and refine the system **exactly as specified** in the main spec and addenda.
- Use these docs as **ground truth**, not inspiration.
- Keep formulas, layout, and logic aligned with the spec at all times.

If the main spec and an addendum ever conflict, **follow the addenda**.

---

## 1. Source of Truth Documents

### 1.1 Main system spec (read this first)

- `docs/state_of_mind_vault_restock_system_v1_spec.md`

This is the **canonical description** of:

- Tabs and their roles
- Column names and meaning
- Rule structure and priority (type/size/brand/product)
- Engine pipeline from Treez → Restock Checklist
- Daily workflow

### 1.2 Addenda – store-specific refinements (must read)

- `docs/addendum_v1a_locations_and_held_logic.md`
  - Clarifies that only `SALES FLOOR` is a pick-shelf location in v1.
  - Unmapped locations default to `IGNORE`.
  - `HELD` inventory is always IGNORE in v1.

- `docs/addendum_v1b_multi_barcode_fifo_logic.md`
  - Defines how to handle products with multiple barcodes and mixed shelf stock.
  - Explains how to pick a primary shelf barcode.
  - Establishes that **FIFO by Date Inventory Received is always the top priority**, with barcode matching and quantity as secondary tie-breakers.

If anything in the main spec conflicts with these addenda, **the addenda win**.

### 1.3 Supporting reference files

Use these to avoid guessing:

- `docs/treez_field_reference.md`  
  → What each important Treez column means and whether it's used in v1.

- `docs/location_map_template.md`  
  → How Treez `Location` values map to roles: `PICK SHELF`, `RESERVE`, `IGNORE`. In v1, only `SALES FLOOR` is `PICK SHELF`.

- `docs/stocking_rules_seed.csv`  
  → Initial stocking rules by type/size/brand/product. Treat these numbers as real configuration, not examples.

- `docs/restock_policy_notes.md`  
  → Hard constraints and “never do this” policies (e.g. MERCH exclusion, ignored locations, HELD handling, FIFO rules).

- `docs/restock_checklist_layout.md`  
  → Expected column order, naming, and visual behavior on the Restock Checklist tab.

- `docs/test_cases_expected_outputs.md`  
  → Small set of scenario tests describing expected Restock Checklist behavior, including HELD and multi-barcode behavior.

- `sample_data/Valuation_Report_Sample.csv` (if present)  
  → Real Treez valuation export. Use for debugging formulas and verifying behavior.

---

## 2. Environment & Constraints

You are working in **Google Sheets**, not Excel.

- Use **Google Sheets formulas** and patterns:
  - `ARRAYFORMULA`, `FILTER`, `QUERY`, `UNIQUE`, `IF`, `IFS`, `LET`, etc.
  - No VBA, no Excel-only functions.

- Respect **manual vs formula** columns:
  - Manual on `Restock Checklist`:
    - `Units Pulled`
    - `Restock Status`
    - `Done` (checkbox)
    - `Notes`
  - Manual on `Restock Settings`:
    - Location-role mappings
    - Stocking rules
  - Everything else should be derived via formulas as described in the spec and addenda.

- Respect **tab roles**:
  - `Restock Engine (Internal)` is formula-only, hidden/protected.
  - `Treez Valuation (Raw)` has instructions rows on top and raw data starting at `A6`.
  - `Restock Checklist` is staff-facing; do not clutter it with debug columns.

---

## 3. How to Work

1. **Before big changes**  
   - Re-read `state_of_mind_vault_restock_system_v1_spec.md`.
   - Read both addenda:
     - `addendum_v1a_locations_and_held_logic.md`
     - `addendum_v1b_multi_barcode_fifo_logic.md`
   - Skim `treez_field_reference.md` and `restock_policy_notes.md` to refresh constraints.

2. **When implementing formulas**  
   - Start on `Restock Engine (Internal)` using the pipeline in the spec and addenda.
   - Mirror calculated fields to `Restock Checklist` exactly as described.
   - Use named ranges / clear references where appropriate.

3. **When tuning rules or mappings**  
   - Edit only `Restock Settings`, NOT formulas.
   - Use `stocking_rules_seed.csv` as the base structure for stocking rules.

4. **When verifying behavior**  
   - Use `docs/test_cases_expected_outputs.md` as unit tests.
   - Cross-check against `sample_data/Valuation_Report_Sample.csv` if available.

5. **When unsure**  
   - Do not silently change business logic.
   - Either:
     - Ask the user a targeted question, or
     - Propose multiple options and clearly label them.

---

## 4. About State of Mind & Xylent (Minimal Context)

- **State of Mind**  
  - Adult-use cannabis dispensary in Latham, NY.
  - All inventory is in a secure vault / back room.
  - The only pick-shelf inventory location is Treez **`SALES FLOOR`**.
  - Focus on **accurate vault control** and **fast, reliable restocking**.

- **Xylent Studios**  
  - Small studio / internal partner building this system.
  - Values: clarity, maintainability, and “flagship-quality” internal tools.
  - You should act like a **senior engineer** in that studio: no hacks, no half-measures.

Keep your work grounded, concise, and strictly relevant to the vault restock system.

