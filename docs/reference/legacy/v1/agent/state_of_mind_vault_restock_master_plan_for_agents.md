> [!WARNING]
> Historical Archive Notice
> 
> Scope: historical v1 material only.
> This file is preserved for traceability and is not authoritative for the current implementation.
> Current docs start at `docs/index.md`.
# State of Mind Vault Restock System – Master Plan for Agents (v1)

Audience: **Opus 4.5 (or other LLM agents) working in Cursor for Justin / Xylent Studios**.

This is the **top-level plan** for the State of Mind vault restock project.  
Read this first. It tells you:

- What this system is supposed to do.
- Which docs to read (and in what order).
- What concrete tasks to perform, in sequence.
- How to test your work.
- How to avoid breaking business rules or wasting context.

You are **not** here to redesign the business logic. You are here to implement it cleanly in Google Sheets according to these specs.

---

## 0. Problem in one paragraph

State of Mind is a licensed adult-use cannabis dispensary in Latham, NY.  
All product lives in a secure vault/back room. Customers never touch product. Budtenders pick orders from vault shelves.

Today, staff export a **Treez Inventory Valuation** report and manually hack it into a restock list. This is slow, brittle, and easy to mess up.

We want a **Google Sheets–based system** that:

1. Takes the Treez valuation CSV (pasted into a “raw” tab).  
2. Runs it through an internal engine (hidden tab).  
3. Outputs a **clean Restock Checklist** tab that tells staff exactly:
   - What needs stocking,
   - From which backstock locations,
   - How many to pull,
   - With FIFO and barcode rules applied,
   - With simple checkboxes to mark items done.

No macros are required in v1; formulas + layout + conditional formatting are enough.

---

## 1. Files & reading order

Before you write *any* formulas or layouts, read these docs in this order:

1. **Orientation / context**
   - `docs/agent_quickstart_restocksystem.md`
   - `docs/state_of_mind_treez_field_conventions.md`

2. **Core logic**
   - `docs/state_of_mind_vault_restock_system_v1_spec.md`
   - `docs/addendum_v1a_locations_and_held_logic.md`
   - `docs/addendum_v1b_multi_barcode_fifo_logic.md`
   - `docs/restock_policy_notes.md`

3. **Field-level + layout details**
   - `docs/treez_field_reference.md`
   - `docs/location_map_template.md`
   - `docs/restock_checklist_layout.md`
   - `docs/stocking_rules_seed.csv`

4. **How to build / maintain**
   - `docs/implementation_guidelines_for_agents.md`
   - `docs/test_cases_expected_outputs.md`

5. **Data sample**
   - `sample_data/Valuation_Report_Sample.csv` (Treez export)

When context is tight, prioritize:

1. `agent_quickstart_restocksystem.md`
2. `state_of_mind_treez_field_conventions.md`
3. `state_of_mind_vault_restock_system_v1_spec.md`
4. `addendum_v1a_locations_and_held_logic.md`
5. `addendum_v1b_multi_barcode_fifo_logic.md`
6. `restock_policy_notes.md`

Everything else can be pulled in on-demand when you are working on a specific area.

---

## 2. Core principles (do not violate these)

Summarized from the spec + addenda:

1. **Primary product identity = `External ID`.**
   - All rows with the same `External ID` are one product in the engine.
   - Never treat barcodes or batch IDs as product keys in v1.

2. **Scope: cannabis only.**
   - `Inventory Type = ADULT`.
   - `Product Type` ∈ {FLOWER, PREROLL, CARTRIDGE, EDIBLE, EXTRACT, BEVERAGE, TINCTURE, TOPICAL, PILL}.
   - `Product Type = MERCH` is excluded from Restock Checklist.

3. **Location roles (State of Mind v1):**
   - `SALES FLOOR` → **only** pick-shelf location.
   - Explicit vault bins/shelves → RESERVE (backstock) when configured.
   - Returns / quarantine / problem locations → IGNORE.
   - `HELD` → always IGNORE in v1.

4. **Unknown locations default to IGNORE.**
   - If a location isn’t mapped in `Location Roles`, it must not quietly affect quantities.

5. **FIFO is primary, barcodes are secondary.**
   - Always prioritize **oldest `Date Inventory Received`** when choosing which reserve lot to pull from.
   - Barcode matching to the dominant shelf barcode is only a tie-breaker when dates are equal.
   - Mixed barcodes are surfaced via `Barcode Match = Check ⚠️` but do not override FIFO.

6. **External ID vs Product Name vs Size:**
   - Product key: `External ID`.
   - Display: `Brand + Product Name + Size + Classification`.
   - Real size: `Size` column, not whatever is appended into `Product Name`.

7. **Sheets are the engine, not scripts (for v1).**
   - Use Google Sheets formulas and conditional formatting.
   - No App Script is required for v1.

---

## 3. Target sheet structure (tabs)

Create or assume a Google Sheets file with these tabs:

1. `Instructions`
2. `Treez Valuation (Raw)`
3. `Restock Settings`
4. `Restock Engine (Internal)`
5. `Restock Checklist`
6. `Data Exceptions`

### 3.1 `Instructions`

- Plain-language guide for humans (budtenders / managers).
- Should cover:
  - How to export the Treez valuation report.
  - How to paste it into `Treez Valuation (Raw)`.
  - How to refresh filters / formulas if needed.
  - Very short explanation of the colors and columns on `Restock Checklist`.

You don’t need to overdo it; concise is better.

### 3.2 `Treez Valuation (Raw)`

- Top 4–5 rows = instructions only, **no data here**.
- Real data starts at `A6` (Row 6).
- Columns and header names must match the sample CSV.
- This sheet should be **paste-only** for staff:
  - Do not add formulas inside the data region.
  - Formulas in other tabs should reference this sheet.

### 3.3 `Restock Settings`

Contains configuration tables, not logic:

1. **Location Roles**
   - Columns: `Location Name`, `Role`, `Include?`, `Notes`
   - Role ∈ {PICK SHELF, RESERVE, IGNORE}
   - In v1, only `SALES FLOOR` should be PICK SHELF unless explicitly changed.

2. **Stocking Rules**
   - Seed structure from `docs/stocking_rules_seed.csv`.
   - Columns such as:
     - `Rule Name`
     - `External ID` (optional, for product-specific rules)
     - `Brand`
     - `Product Type`
     - `Subtype`
     - `Size Contains`
     - `Pack Style`
     - `Target Pick Qty`
     - `Warning Pick Qty`
     - `Critical Pick Qty`
     - `Active`
     - `Notes`
   - This is what the engine uses to decide how many units **should** be on SALES FLOOR.

Staff should not need to touch this tab daily; it’s a “tuned by Justin / managers” thing.

### 3.4 `Restock Engine (Internal)`

- This is the **heart** of the logic.
- Hidden/protected in final state.
- Only formulas here; no manual edits.

It should:

1. **Pull raw Treez data** from `Treez Valuation (Raw)`.
2. **Map locations** to roles using the `Location Roles` table.
3. **Filter eligible rows**:
   - `Inventory Type = ADULT`.
   - Allowed `Product Type`s.
   - `Available > 0`.
   - Location not IGNORE (HELD is always IGNORE).

4. **Group by product (`External ID`)**:
   - Compute Pick Shelf Qty (sum of eligible `Available` in PICK SHELF).
   - Compute Reserve Qty (sum of eligible `Available` in RESERVE).
   - Compute oldest reserve `Date Inventory Received`.
   - Compute other fields needed downstream.

5. **Apply stocking rules**:
   - Join against Stocking Rules table using the priority chain:
     1. Product-specific rule (by `External ID`)
     2. Brand + Type + Size rule
     3. Type + Size rule
     4. Default rule (catch-all)
   - Determine:
     - `Target Pick Qty`
     - `Warning Pick Qty`
     - `Critical Pick Qty`

6. **Determine which products need restocking**:
   - Only show products where `Pick Shelf Qty < Target Pick Qty`.
   - Compute `Shortfall = Target Pick Qty - Pick Shelf Qty`, capped at max Reserve Qty.

7. **Select pull locations (First / Then)** (see addendum v1b):
   - For each product, consider all RESERVE rows grouped by External ID.
   - Determine **Primary Shelf Barcode** from `Inventory Barcodes` on SALES FLOOR.
   - Sort RESERVE rows by:
     1. `Date Inventory Received` ascending (FIFO)
     2. Whether `Inventory Barcodes` contains the Primary Shelf Barcode
     3. `Available` ascending (clear smaller piles first)
     4. `Location` name
   - Walk that sorted list to compute:
     - `Recommended Pull Qty`
     - `First Pull From`
     - `Then Pull From`

8. **Compute QC fields**:
   - `Barcode Match` = `OK ✅` if ≤ 1 unique barcode for the product, otherwise `Check ⚠️`.
   - `Oldest Backstock Date` = oldest `Date Inventory Received` among RESERVE rows.

9. **Feed a clean range** to `Restock Checklist` for display.

### 3.5 `Restock Checklist`

- Staff-facing checklist.
- Layout and visual behavior must follow `docs/restock_checklist_layout.md`.
- Columns (in order) roughly:

  1. `Urgency`
  2. `Brand`
  3. `Product`
  4. `Type`
  5. `Size / Strength`
  6. `Classification`
  7. `Pick Shelf Qty`
  8. `Reserve Qty`
  9. `Target Pick Qty`
  10. `Recommended Pull Qty`
  11. `First Pull From`
  12. `Then Pull From`
  13. `Units Pulled` (manual)
  14. `Restock Status` (manual; Data Validation list)
  15. `Done` (manual checkbox)
  16. `Notes` (manual)
  17. `Barcode Match`
  18. `Oldest Backstock Date`

- Visual rules:
  - Row background tinted by `Urgency` (Critical / Soon / Low).
  - Alternating row shading for readability.
  - When `Done = TRUE`, strike through Product and grey out the row.

### 3.6 `Data Exceptions`

- Holds rows that were **excluded** from the engine due to problems, such as:
  - Unknown `Location` (no role mapping).
  - Missing `External ID`.
  - Invalid / missing critical fields.
- Columns should include at least:
  - Some identity (Brand, Product Name, Size, Product Type).
  - `Location`.
  - Reason code (e.g. `UNKNOWN_LOCATION_ROLE`, `MISSING_EXTERNAL_ID`).

This tab is primarily for debugging and tuning.

---

## 4. Implementation steps for the agent

Follow this order when you’re actually doing the work.

### Step 1 – Read & summarize

1. Read the docs in the order in section 1.
2. Write a very short summary (for Justin) of:
   - How you understand the system.
   - Any ambiguities you notice.
3. Do **not** write formulas yet.

### Step 2 – Confirm column mappings

1. Open `sample_data/Valuation_Report_Sample.csv`.
2. Verify the existence and header names of fields referenced in:
   - `treez_field_reference.md`
   - `state_of_mind_treez_field_conventions.md`
3. If any columns mentioned in the docs do not exist in the CSV, flag them clearly in a short note to Justin instead of guessing.

### Step 3 – Define Sheets layout (text only)

1. In a markdown file or spec comment (not in Sheets yet), write:
   - Exact list of tabs.
   - For each tab, the column headers and which are:
     - Manual-input,
     - Formula-derived,
     - Debug-only.
2. Align this with `restock_checklist_layout.md` and this plan.

### Step 4 – Build the Google Sheet skeleton

1. Create the tabs in the target Sheet:
   - `Instructions`
   - `Treez Valuation (Raw)`
   - `Restock Settings`
   - `Restock Engine (Internal)`
   - `Restock Checklist`
   - `Data Exceptions`
2. Put headers + sample rows in each tab (no real formulas yet, or minimal ones only where absolutely obvious).

### Step 5 – Implement Restock Settings logic

1. Implement the `Location Roles` table structure.
2. Implement the `Stocking Rules` table structure using `stocking_rules_seed.csv` as the seed.
3. Add data validation where appropriate (e.g. Role = dropdown with {PICK SHELF, RESERVE, IGNORE}).

### Step 6 – Implement the Engine pipeline

On `Restock Engine (Internal)`:

1. Bring in raw rows from `Treez Valuation (Raw)` via formulas (`FILTER`, `QUERY`, or direct references).
2. Apply eligibility filters:
   - `Inventory Type = ADULT`
   - Allowed Product Types (excludes MERCH)
   - Non-ignored locations (HELD is always IGNORE in v1)
   - `Available > 0` (filter out zero-quantity rows)
3. Map locations to roles (using `Location Roles`).
4. Group rows by `External ID` and compute:
   - Pick Shelf Qty, Reserve Qty, Oldest Reserve Date, etc.
5. Apply stocking rules to compute target/warning/critical quantities.
6. Compute urgency levels and recommended pull quantities.
7. Implement the multi-barcode + FIFO logic from `addendum_v1b_multi_barcode_fifo_logic.md`:
   - Compute Primary Shelf Barcode per product.
   - Sort RESERVE rows accordingly.
   - Generate `First Pull From` and `Then Pull From` text.
8. Generate a clean output range (one row per product needing restock) for the Checklist.

### Step 7 – Wire Engine → Restock Checklist

1. On `Restock Checklist`, reference the clean engine output.
2. Ensure manual columns are preserved and not overwritten by formulas.
3. Apply:
   - Conditional formatting for `Urgency`.
   - Alternating row backgrounds.
   - Strike-through + grey-out when `Done = TRUE`.

### Step 8 – Implement Data Exceptions

1. From `Restock Engine (Internal)` logic, collect rows that were excluded for known reasons.
2. Output them in `Data Exceptions` with a reason code.
3. This can be done via `FILTER` or similar formulas, or through a helper table in the engine.

### Step 9 – Testing against test cases

Use `docs/test_cases_expected_outputs.md` to simulate:

- Cases with:
  - No restock needed,
  - Single RESERVE location,
  - Multi-location RESERVE (First + Then),
  - No RESERVE,
  - MERCH,
  - Multi-barcode products,
  - HELD inventory (always ignored),
  - Unknown locations.

For each case, verify that `Restock Checklist` output matches the expected behavior described in that doc.

### Step 10 – Final cleanup

1. Hide/protect internal tabs:
   - `Restock Engine (Internal)`
   - `Restock Settings` (maybe viewable but protected)
   - `Data Exceptions` (optional)
2. Make sure `Instructions`, `Treez Valuation (Raw)`, and `Restock Checklist` are clearly visible and easy to use.
3. Document any deviations from the spec, if they were necessary, in a short note to Justin.

---

## 5. Definition of Done for v1

The project is “done” for v1 when:

1. Justin can:
   - Export a Treez valuation CSV,
   - Paste it into `Treez Valuation (Raw)`,
   - Look at `Restock Checklist` and get a usable, accurate restock list **without touching formulas**.

2. The system:
   - Correctly respects ADULT + cannabis product types.
   - Excludes MERCH.
   - Filters out rows with `Available = 0`.
   - Treats `SALES FLOOR` as the only pick-shelf location by default.
   - Treats unmapped locations as ignored.
   - Treats HELD inventory as always IGNORE.
   - Implements FIFO with barcode as a tie-breaker only when dates are equal.
   - Handles multi-barcode products and surfaces barcode issues in `Barcode Match`.
   - Produces reasonable `First Pull From` / `Then Pull From` plans.

3. `Data Exceptions` shows any problematic rows instead of silently dropping them.

4. The docs in `docs/` remain consistent with the formulas & layout you implemented.

If you are uncertain about a behavior that would change these guarantees, stop and ask Justin rather than guessing.

---

## 6. How to talk to Justin (meta)

- He cares about **clarity, correctness, and maintainability**, not clever hacks.
- If you see a simpler, more robust way to do something that **does not change business behavior**, you can propose it.
- If your idea would **change how staff experience the sheet or how restock is calculated**, ask first.

Always refer back to this master plan and the spec/addenda before making assumptions.

