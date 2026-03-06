> [!WARNING]
> Historical Archive Notice
> 
> Scope: historical v1 material only.
> This file is preserved for traceability and is not authoritative for the current implementation.
> Current docs start at `docs/index.md`.
# State of Mind Vault Restock System  
### Project Overview & v1 Specification (Google Sheets)

_Last updated: 2025-12-10_

---

## 0. Purpose of this Document

This document is the **single starting reference** for the State of Mind vault restock system.

It’s written so that:

- Someone new to the project can understand **what the system does** and **why it exists**.
- A future you (even with zero context) could **rebuild the entire v1 sheet** from this spec alone.
- Budtenders, leads, and managers can see **how the logic works**, not just “what buttons to click”.

This is a **design + behavior specification**, not implementation code.
It assumes the system is built in **Google Sheets** using formulas and conditional formatting.

---

## 1. Background & Goals

### 1.1 Operational context

- This system is for a **legal cannabis dispensary in New York State**.
- All cannabis products are stored in the **back room / vault**.
- Customers **never** self-serve product.  
  Budtenders pick units from shelves in the vault and bring them to the sales counter.
- In Treez, the location `SALES FLOOR` and certain vault shelf locations represent the **active pick shelves**, not a public customer floor.

### 1.2 Problem we’re solving

Today, staff manually:

- Scan the Treez valuation output.
- Guess what’s low, what to refill, and from which bins or back shelves.
- Repeatedly clear and rewrite ad-hoc lists.

This is:

- Time-consuming
- Error-prone
- Hard to standardize or train
- Hard for managers to audit or improve

### 1.3 Goal of this system

Build a **repeatable, professional restock workflow** that:

- Takes the **Treez Inventory Valuation CSV** as input.
- Translates it into a clean, **vault restock checklist**:
  - How many units are on the pick shelves.
  - How many units are in reserve storage.
  - How many units we *want* on the pick shelves (target).
  - How urgently a restock is needed.
  - Exactly **which vault locations** to pull from (oldest product first).
- Uses a single Google Sheet with:
  - A **staff-facing checklist** tab.
  - A **raw import** tab.
  - A **settings/config** tab.
  - An internal **engine** tab.
  - A **data exceptions** tab.
  - A human-readable **instructions** tab.

The sheet should feel like a **simple internal app** for vault operations, not a random spreadsheet.

---

## 2. High-Level System Overview

### 2.1 Data flow

1. Export **Inventory Valuation** from Treez as CSV.
2. Import that CSV into the `Treez Valuation (Raw)` tab.
3. The internal **Restock Engine**:
   - Filters to cannabis-only inventory.
   - Classifies each Treez location as:
     - `PICK SHELF` – active vault shelves used during service.
     - `RESERVE` – deeper vault/back room storage.
     - `IGNORE` – locations that never drive restock (returns, quarantine, etc.).
   - Groups rows by **product identity** (barcode/SKU).
   - Applies **stocking rules** (by Product Type, Size, Brand, Pack Style, and specific SKU).
   - Calculates:
     - Pick Shelf quantity
     - Reserve quantity
     - Target quantity
     - Urgency
     - Recommended Pull quantity
     - First and second pull sources (oldest inventory first).
   - Performs simple QC checks (barcode consistency, oldest backstock date).
4. The `Restock Checklist` tab presents:
   - One row per product that needs a restock.
   - Color-coded urgency.
   - Clear pull instructions.
   - Manual fields for Units Pulled, Status, Done, and Notes.

All heavy logic lives in `Restock Engine (Internal)`.  
Day-to-day staff mostly touch **only these two tabs**:

- `Treez Valuation (Raw)`
- `Restock Checklist`

---

## 3. Tabs & Roles (v1)

### 3.1 Tab list

In recommended left-to-right order:

1. **`Restock Checklist`** – main working view for vault staff.
2. **`Treez Valuation (Raw)`** – Treez CSV import.
3. **`Restock Settings`** – configuration (location roles, stocking rules).
4. **`Data Exceptions`** – debug log of rows the engine couldn’t process cleanly.
5. **`Instructions`** – human-readable “how it works” page.
6. **`Restock Engine (Internal)`** – hidden/protected; formulas only.

### 3.2 Who uses what

- **Budtenders / vault staff**
  - Read & update: `Restock Checklist`
  - Sometimes assist with: `Treez Valuation (Raw)` import
- **Leads / managers**
  - Configure & tune: `Restock Settings`
  - Spot-check: `Data Exceptions`
  - Occasionally review: `Instructions`
- **Power user / system owner**
  - Maintains: `Restock Engine (Internal)` (structure)
  - Maintains: `Restock Settings`, `Instructions`

---

## 4. Core Concepts

### 4.1 Product identity

Each product is treated as a single logical item across multiple locations and rows.

**Product Key** (identity):

1. Primary: `External ID` (Treez product ID / SKU)
2. Fallback (rare, only if `External ID` is missing):  
   `Brand + Product Name + Size + Product Type`

All rows sharing the same `External ID` are treated as the **same product**, even if they are in different vault locations or have different barcodes.

**Barcode role:** `Inventory Barcodes` are used for:
- QC checks (`Barcode Match` field to flag mixed-barcode situations)
- FIFO tie-breaking when receive dates are equal (prefer lots matching the dominant shelf barcode)

Barcodes do **not** define product identity—`External ID` does.

### 4.2 Location roles

Treez `Location` values are mapped to roles via `Restock Settings`:

- **`PICK SHELF`**
  - Vault shelves/sections budtenders pick from during normal service.
  - Example: `SALES FLOOR`, `SHELF A`, `TALL SHELF 2` (if used as active shelves).

- **`RESERVE`**
  - Deeper storage in the vault/backroom used to refill pick shelves.
  - Example: `BIN 1–4`, `BIN A–D`, `BACK BIN 1–3`, `BACK SHELF 1–5`, `UPPER BIN 1–9`, `FRIDGE BIN 1–2`.

- **`IGNORE`**
  - Locations that should not drive restock decisions.
  - Example: `QUARANTINE`, `POS RETURN`, `UNSELLABLE INVENTORY`, `PROCESSING BACKSTOCK`, `FIND ME`.

The mapping is configured once on the `Restock Settings` tab and can be updated if the store layout or naming changes.

### 4.3 Pick shelves vs reserve storage

For each product:

- **Pick Shelf Qty** = total units in all `PICK SHELF` locations.
- **Reserve Qty** = total units in all `RESERVE` locations.

The goal of the system is to **keep Pick Shelf Qty within defined target ranges** by pulling units from Reserve locations.

### 4.4 Stocking rules & overrides

Desired pick-shelf levels differ by:

- Product Type (Flower, Preroll, Cartridge, Edible, etc.)
- Size (3.5g vs 14g vs 28g vs 70g; 100mg vs 1000mg, etc.)
- Pack Style (single vs pack, especially for prerolls)
- Brand (some brands deserve higher or lower on-shelf counts)
- Specific SKU (individual products that need custom behavior)

The system uses a **Stocking Rules** table to define thresholds:

- **Base rules** – by Type/Size/Pack.
- **Brand rules** – by Brand + Type/Size/Pack.
- **Product rules** – by specific `External ID`.

Rules define:

- `Target Pick Qty` – the desired pick-shelf quantity when fully stocked.
- `Warning Pick Qty` – the “Soon” threshold.
- `Critical Pick Qty` – the “Critical” threshold.

The most specific matching rule is used:

1. Product-specific rule (`External ID`)
2. Brand-specific rule
3. Type/Size/Pack rule
4. Default catch-all rule

### 4.5 Urgency levels

For each product, based on **Pick Shelf Qty** and the matched rule:

- If `Pick Shelf Qty ≤ Critical Pick Qty` → **Urgency = Critical**
- Else if `Pick Shelf Qty ≤ Warning Pick Qty` → **Urgency = Soon**
- Else if `Pick Shelf Qty < Target Pick Qty` → **Urgency = Low**
- Else (≥ Target) → product is not shown on the checklist.

Urgency determines:

- Whether a product appears on the list.
- How its row is colored (full-row background).
- Rough order of operations (Critical → Soon → Low).

### 4.6 Recommended pulls & source locations

For each product that needs restocking (`Pick Shelf Qty < Target Pick Qty`):

1. Compute shortfall:  
   `Shortfall = Target Pick Qty – Pick Shelf Qty`
2. Compute maximum pullable:  
   `Max Pullable = Reserve Qty`
3. Recommended pull quantity:  
   `Recommended Pull Qty = min(Shortfall, Max Pullable)`

Then, among the Reserve locations for that product:

- Sort by `Date Inventory Received` ascending (oldest first).
- Calculate:
  - **First Pull From** – pull from the **oldest** reserve location.
  - **Then Pull From** – only if needed to reach `Recommended Pull Qty`, pull from the next-oldest location.
- The system ensures **oldest inventory is used first** to maintain proper rotation.

### 4.7 QC: barcode consistency

For each product (grouped by `External ID`), we collect all distinct non-blank barcodes from `Inventory Barcodes` across:

- Pick Shelf rows
- Reserve rows

Then:

- If there are 0 or 1 distinct non-blank barcodes → `Barcode Match = OK ✅`
- If there are > 1 distinct non-blank barcodes → `Barcode Match = Check ⚠️`

The QC result is shown on the `Restock Checklist` and helps identify cases where the same product (by `External ID`) exists under multiple barcodes—typically due to packaging changes or relabeling. Staff should verify before pulling.

---

## 5. `Treez Valuation (Raw)` Tab Specification

### 5.1 Purpose

Holds the **raw Treez Inventory Valuation export**.

This tab is overwritten each time we run the restock workflow. It is not meant for manual editing beyond the import operation.

### 5.2 Layout

- Rows 1–4: **Instruction panel**
- Row 5: spacer / separator
- Row 6 onward: imported CSV data (starting at cell `A6`)

### 5.3 Instruction panel content (example)

Row 1 (merged across data columns):

> **Treez Valuation Import**

Row 2–4 (simple numbered steps):

1. Export the **Inventory Valuation** report from Treez as a CSV.
2. In this tab, click on **cell A6**.
3. Use **File → Import → Upload**, choose the CSV, and select  
   **“Replace data at selected cell”** in the import options.
4. After the data appears, go to **`Restock Checklist`** to run the vault restock.

### 5.4 Required columns from Treez

The engine expects at least the following columns (exact labels may match Treez export):

- Identity & product metadata:
  - `Brand`
  - `Product Name`
  - `Product Type`
  - `Subtype`
  - `Size`
  - `Classification` (e.g. Indica/Sativa/Hybrid/CBD)
  - `Product Barcodes`
  - `External ID` (SKU)
- Inventory & location:
  - `Available`
  - `Location`
  - `Inventory Type` (ADULT / ALL)
- Dates:
  - `Date of Inventory Valuation`
  - `Time of Inventory Valuation`
  - `Date Inventory Received`
  - `Expiration Date` (optional, not used in v1)
  - `Packaged Date` (optional, fallback)

Other columns can be ignored by the engine, but remain in the raw data for reference.

---

## 6. `Restock Settings` Tab Specification

This tab contains two main sections:

1. **Location Roles**
2. **Stocking Rules**

### 6.1 Location Roles section

#### Purpose

Map each Treez `Location` to a role:

- `PICK SHELF`
- `RESERVE`
- `IGNORE`

#### Columns

- **`Location Name`**  
  Exact string as it appears in Treez (e.g. `SALES FLOOR`, `BIN 1`, `BACK SHELF 2`).

- **`Location Role`**  
  Dropdown with:
  - `PICK SHELF`
  - `RESERVE`
  - `IGNORE`

- **`Include in Engine`**  
  Checkbox (TRUE/FALSE).  
  Typically:
  - TRUE for `PICK SHELF` and `RESERVE`
  - FALSE for `IGNORE`

- **`Display Group`** (optional)  
  Friendly category (e.g. `Vault`, `Fridge`, `Backroom`, `Promo Shelf`)  
  This can help future grouping or reporting.

- **`Notes`**  
  Human-readable notes (“Active picking shelf”, “Returns only”, “Quarantine”, etc.).

### 6.2 Stocking Rules section

#### Purpose

Define pick-shelf targets and urgency thresholds for products based on:

- Product Type
- Subtype
- Size
- Pack Style (Single/Pack)
- Brand
- Specific `External ID`

#### Columns

- **`Rule Name`**  
  Short descriptive name, e.g.:
  - `Flower – 3.5g`
  - `Preroll – Packs`
  - `Sluggerz – PR Packs`
  - `RYTHM – Flower 14g`

- **`External ID`** (optional)  
  Specific product identifier (Treez product ID)  
  When present, this rule applies **only** to that exact product.

- **`Brand`** (optional)  
  Brand name from Treez.  
  When present and `External ID` is blank, this rule applies to **all products from that brand** that also match the other filters.

- **`Product Type`**  
  Value from Treez (e.g. `FLOWER`, `PREROLL`, `CARTRIDGE`, `EDIBLE`, `EXTRACT`, `BEVERAGE`, `TINCTURE`, `TOPICAL`, `PILL`).  
  Use `*` or leave blank to indicate “any type” for broad rules.

- **`Subtype`** (optional)  
  Value from Treez `Subtype` (e.g. `PRE-PACK`, `INFUSED`, etc.).  
  Use `*` or blank for “any subtype”.

- **`Size Contains`** (optional)  
  Text pattern that must appear in the `Size` field (e.g. `3.5 G`, `14 G`, `28 G`, `100 MG`).  
  Can be left blank or `*` to not filter by size.

- **`Pack Style`**  
  One of:
  - `Single`
  - `Pack`
  - `Any`

  Pack Style is derived in the engine from the product name/size (e.g. presence of “PACK”, “X 5 PACK”, etc.), then matched here.

- **`Target Pick Qty`**  
  Desired number of units to have on pick shelves when fully stocked.

- **`Warning Pick Qty`**  
  Threshold below which the product is considered **Soon**.

- **`Critical Pick Qty`**  
  Threshold at or below which the product is considered **Critical**.

- **`Active`**  
  Checkbox. If unchecked, the rule is ignored by the engine.

- **`Notes`**  
  Human-readable notes, e.g.:
  - “High-turn brand, keep deeper on pick shelf”
  - “Premium SKU – keep thin on shelf”

#### Rule priority & matching

For each product, the engine matches **one** rule using the following priority order:

1. **Product-specific rule**  
   - Rules where `External ID` matches the product's `External ID`.
2. **Brand-specific rule**  
   - Rules where `Brand` matches and `External ID` is blank.
3. **Type/Size/Pack rules**  
   - Rules where `Brand` and `External ID` are blank, but Type/Size/Pack filters match.
4. **Default catch-all rule**  
   - A generic rule like "Default – All" with wildcard filters.

The **most specific** matching rule is used.  
If no rule matches, the product falls back to the default rule.

---

## 7. `Restock Engine (Internal)` Tab Specification

This tab is **hidden and protected** and contains the intermediate calculations.

Conceptually, it goes through the following steps:

### 7.1 Filter raw data

From `Treez Valuation (Raw)`:

- Keep rows where:
  - `Inventory Type = ADULT`.
  - `Product Type` is in the cannabis list:
    - FLOWER, PREROLL, CARTRIDGE, EDIBLE, EXTRACT, BEVERAGE, TINCTURE, TOPICAL, PILL.
  - `Available > 0` (filter out zero-quantity rows to reduce noise).
- Map `Location` to `Location Role` using the Location Roles table:
  - If no mapping found, log the row in `Data Exceptions` as `UNKNOWN_LOCATION_ROLE`.

### 7.2 Derive per-row fields

For each row:

- **`Product Key`**
  - Primary: `External ID`
  - Fallback (rare): `Brand + Product Name + Size + Product Type`

- **`Location Role`**
  - Lookup from `Restock Settings` → Location Roles.

- **`Pack Style`**
  - `Pack` if `Product Name` or `Size` contains patterns like “PACK”, “X 5 PACK”, “X 7 PACK”, etc.
  - Otherwise `Single`.

- **Validity checks**
  - Rows missing critical fields (e.g. no Product Type, no Product Name) can be logged to `Data Exceptions`.

### 7.3 Grouping by product

Group by `Product Key`. For each product:

- **Pick Shelf aggregation**
  - `Pick Shelf Qty` = sum of `Available` for rows with `Location Role = PICK SHELF`.

- **Reserve aggregation**
  - `Reserve Qty` = sum of `Available` for rows with `Location Role = RESERVE`.
  - Reserve location details:
    - For each location:
      - `Reserve Location`
      - `Reserve Qty at that Location`
      - `Date Inventory Received`

- **Barcode QC**
  - List distinct non-blank `Product Barcodes` across all rows for this product.

### 7.4 Rule matching

For each product, use:

- Product metadata:
  - `External ID`
  - `Brand`
  - `Product Type`
  - `Subtype`
  - `Size`
  - `Pack Style`

To find **one matching rule** in `Stocking Rules`, following the priority described in section 6.2.

Resulting fields:

- `Target Pick Qty`
- `Warning Pick Qty`
- `Critical Pick Qty`

If no rule matches, apply the default catch-all rule.

### 7.5 Determine restock need

For each product:

- If `Pick Shelf Qty >= Target Pick Qty`:
  - This product does **not** appear on the checklist.

- Else:
  - `Shortfall = Target Pick Qty – Pick Shelf Qty`
  - `Max Pullable = Reserve Qty`
  - `Recommended Pull Qty = min(Shortfall, Max Pullable)`

### 7.6 Determine urgency

For each product with `Pick Shelf Qty < Target Pick Qty`:

- If `Pick Shelf Qty ≤ Critical Pick Qty` → `Urgency = Critical`
- Else if `Pick Shelf Qty ≤ Warning Pick Qty` → `Urgency = Soon`
- Else → `Urgency = Low`

Also compute:

- `Urgency Score` (e.g. Critical = 3, Soon = 2, Low = 1) for sorting.

### 7.7 Determine pull sources

For each product with `Recommended Pull Qty > 0`:

1. Consider all `RESERVE` location rows for that product.
2. Sort by:
   - `Date Inventory Received` ascending (oldest first)
   - Then by location name or optional priority if needed in future.

3. Let `Needed = Recommended Pull Qty`.

4. For the oldest Reserve location:
   - `PrimaryAmount = min(Needed, Qty at that location)`
   - If `PrimaryAmount > 0`:
     - `First Pull From = "{PrimaryAmount} from {Location} (oldest {Date})"`
     - `Needed -= PrimaryAmount`

5. If `Needed > 0` and a second location exists:
   - `SecondaryAmount = min(Needed, Qty at second location)`
   - `Then Pull From = "{SecondaryAmount} from {NextLocation} (next oldest {Date})"`
   - `Needed -= SecondaryAmount`

6. Reserve locations beyond the second are not surfaced in v1, but could be used internally if we ever expand.

If `Reserve Qty = 0`, `Recommended Pull Qty` will be 0; the product may still appear on the checklist with a status like `No Backstock` when staff review it.

### 7.8 QC results for the checklist

For each product (grouped by `External ID`):

- **`Barcode Match`**
  - `OK ✅` if ≤ 1 distinct non-blank barcode (from `Inventory Barcodes`) across all rows.
  - `Check ⚠️` if > 1 distinct non-blank barcodes.

- **`Oldest Backstock Date`**
  - Minimum `Date Inventory Received` among all Reserve rows.

These are copied to the `Restock Checklist` for visibility.

---

## 8. `Restock Checklist` Tab Specification

### 8.1 Purpose

Staff-facing checklist that:

- Shows **only** products that are below their target pick-shelf quantity.
- Prioritizes items by **urgency**.
- Provides clear instructions on **how many units to pull** and **from where**.
- Allows staff to record **what they actually did**.

### 8.2 Header area

Top rows:

- Row 1 (merged):  
  `Vault Restock Checklist`

- Row 2:
  - `Valuation Date:` – taken from first row of `Treez Valuation (Raw)` (`Date of Inventory Valuation` + `Time…`)
  - `Generated On:` – `=TODAY()` or `=NOW()` in Sheets

- Row 3–5: short “How to use this checklist”, e.g.:

  - Work **Critical** rows first (red), then **Soon** (amber), then **Low**.
  - For each row:
    - Compare **Pick Shelf Qty** to **Target Pick Qty**.
    - Follow **First Pull From** (and **Then Pull From** if shown).
    - Enter **Units Pulled**.
    - Update **Restock Status** and tick **Done** to mark the line finished.

  + a small color legend:

  - Red = Critical
  - Amber = Soon
  - Blue/Green = Low

### 8.3 Columns and their meaning

In order, left to right:

#### Identification

- **`Urgency`**
  - Values: `Critical`, `Soon`, `Low`
  - Drives full-row background color.

- **`Brand`**
  - From Treez `Brand`.

- **`Product`**
  - From Treez `Product Name`.

- **`Type`**
  - From Treez `Product Type`.

- **`Size / Strength`**
  - From Treez `Size`.

- **`Classification`**
  - From Treez `Classification` (Indica/Sativa/Hybrid/CBD/etc.).

#### Current stock & target

- **`Pick Shelf Qty`**
  - Total `Available` across all `PICK SHELF` locations.

- **`Reserve Qty`**
  - Total `Available` across all `RESERVE` locations.

- **`Target Pick Qty`**
  - From matched stocking rule.

#### Pull plan

- **`Recommended Pull Qty`**
  - Engine-calculated quantity to move from Reserve → Pick shelves:
    - `min(Target Pick Qty – Pick Shelf Qty, Reserve Qty)`

- **`First Pull From`**
  - Text instruction from the **oldest Reserve location**:
    - e.g. `4 from BIN 2 (oldest 10/10/2025)`

- **`Then Pull From`**
  - Text instruction from the **second-oldest Reserve location**, only filled if needed:
    - e.g. `2 from BACK SHELF 3 (next oldest 10/20/2025)`
  - Blank when the primary location alone can fulfill the Recommended Pull Qty.

#### Execution & status (manual)

- **`Units Pulled`**
  - Staff-entered actual number of units pulled (total from all sources).

- **`Restock Status`**
  - Dropdown with:
    - `To Pull` (default)
    - `Pulled`
    - `Partial`
    - `No Backstock`
    - `Can't Find`

- **`Done`**
  - Checkbox.
  - When checked:
    - **Strike-through** the `Product` cell.
    - Grey out all cells in that row (visual “locked”).

- **`Notes`**
  - Free text for comments (e.g., “Vault empty”, “Ask manager”, “Customer pre-order”, etc.).

#### QC

- **`Barcode Match`**
  - Either:
    - `OK ✅` – all non-blank barcodes align.
    - `Check ⚠️` – there are multiple different barcodes; verify before pulling.

- **`Oldest Backstock Date`**
  - Earliest `Date Inventory Received` among Reserve rows; useful for checking rotation.

### 8.4 Sorting and filtering

Typical default view:

- Sort by:
  - `Urgency` (Critical first, then Soon, then Low), then
  - `Type`, then
  - `Brand + Product`.

Optional filter views (when implemented):

- `01 – By Urgency`
- `02 – By Pick Location` (if we later surface more location info)
- `03 – Alphabetical (Brand + Product)`

### 8.5 Formatting

- Font: Arial or Roboto.
- Header row:
  - Bold.
  - Slightly larger font size.
  - Light grey background.
  - Thick bottom border for separation.

- Row background:
  - `Critical` → soft red tint.
  - `Soon` → soft amber tint.
  - `Low` → soft blue/green tint.

- Done rows:
  - Strike-through `Product`.
  - Grey text across the entire row.

- Borders:
  - Light internal gridlines.
  - Slightly thicker vertical borders between:
    - Identification block and stock block.
    - Stock block and pull plan block.
    - Pull plan block and execution block.
    - Execution block and QC block.

---

## 9. `Data Exceptions` Tab Specification

### 9.1 Purpose

Log rows from `Treez Valuation (Raw)` that could not be processed correctly, so that:

- Data issues don’t silently break the system.
- You can see where configuration or source data needs attention.

### 9.2 Possible reasons

Each row will include a **reason code**, such as:

- `UNKNOWN_LOCATION_ROLE` – `Location` had no mapping in Location Roles.
- `MISSING_PRODUCT_TYPE` – no Product Type present.
- `UNSUPPORTED_PRODUCT_TYPE` – Product Type outside the allowed cannabis list.
- `MISSING_PRODUCT_ID` – no barcode/SKU and no usable identity fields.
- Other structured reasons as needed.

### 9.3 Columns

- `Brand`
- `Product Name`
- `Product Type`
- `Location`
- `Size`
- `Inventory Type`
- `Reason`
- `Notes` (optional)

This tab is **not** for everyday staff; it’s for the system owner or manager to reconcile configuration/data issues.

---

## 10. `Instructions` Tab Specification

### 10.1 Purpose

A documentation tab **inside** the sheet that:

- Explains what the tool does.
- Describes each tab briefly.
- Gives the high-level workflow for:
  - Importing new data.
  - Running a restock session.
  - Updating rules/settings.

### 10.2 Recommended sections

1. **Overview**
   - What the file is for (vault restock checklist for State of Mind).
   - High-level data flow from Treez to Checklist.

2. **Tabs**
   - Short bullet description of each tab:
     - `Restock Checklist`
     - `Treez Valuation (Raw)`
     - `Restock Settings`
     - `Data Exceptions`
     - `Restock Engine (Internal)` (noted as protected)
     - `Instructions`

3. **Daily workflow (how staff use it)**
   - Steps to import Treez valuation.
   - How to read the Restock Checklist.
   - How to update Units Pulled, Status, Done.

4. **Configuration (for managers)**
   - How to map new Locations to roles.
   - How to adjust thresholds in Stocking Rules.
   - How to add brand- or product-specific overrides.

5. **Data health (for system owner)**
   - How to check `Data Exceptions`.
   - How to correct configuration or Treez data if issues appear.

---

## 11. Daily Workflow Summary

### 11.1 Single-file reuse pattern

1. **In Treez**
   - Run the Inventory Valuation report.
   - Export as CSV.

2. **In Google Sheets**
   - Open the Restock file.
   - Go to `Treez Valuation (Raw)`.
   - Click cell `A6`.
   - Use **File → Import → Upload**; choose the CSV; select **“Replace data at selected cell”**.
   - Wait for the data to load.

3. **Run restock**
   - Go to `Restock Checklist`.
   - Confirm the `Valuation Date` at the top.
   - Work down the list:
     - Prioritize **Critical** rows, then **Soon**, then **Low**.
     - For each row:
       - Compare `Pick Shelf Qty` vs `Target Pick Qty`.
       - Follow `First Pull From` and `Then Pull From` if present.
       - Enter `Units Pulled`.
       - Update `Restock Status`.
       - Check `Done` when complete.
   - Resolve `No Backstock` or `Can't Find` items with a manager if needed.

### 11.2 Template-per-day pattern (optional)

Instead of reusing a single file:

- Keep a master **template**.
- For each restock session/day:
  - `File → Make a copy` → name it like `Restock – 2025-12-09 – PM`.
  - Follow the same import & restock steps as above.
- This creates an archive of daily checklists.

The logic in this spec supports **either** pattern.

---

## 12. Future Extensions (not in v1)

This spec focuses on **v1**. Future, non-breaking extensions could include:

- A `Reorder Watchlist` tab:
  - Products with low Pick Shelf Qty and zero Reserve Qty.
  - For buyers and managers to plan purchasing.
- Apps Script automation:
  - Custom menu: “Import Treez Valuation”.
  - Scripted sort buttons: “Sort by Urgency”, “Sort by Brand”.
  - Auto-protecting rows when `Done` is checked.
- Additional analytics:
  - Chronic low-stock items.
  - Dead stock (high reserve, never restocked).
  - Performance by brand or Product Type.

These do **not** change the core design described here; they build on it.

---

## 13. Glossary

- **Pick Shelf** – Vault shelves/locations used for active picking during service (mapped from Treez locations like `SALES FLOOR`, `SHELF A`, etc.).
- **Reserve** – Deeper vault/backroom storage locations (bins, back shelves, etc.).
- **Treez Valuation** – Inventory Valuation report exported from Treez, used as the raw input CSV.
- **Product Key** – Internal identifier for a product; primarily the `External ID` (Treez product ID), with fallback to `Brand + Product Name + Size + Product Type` if External ID is missing.
- **Stocking Rule** – A configuration row defining target quantities and urgency thresholds for a class of products (by type, size, pack, brand, or specific SKU).
- **Target Pick Qty** – Desired number of units on pick shelves when fully stocked.
- **Warning Pick Qty** – Threshold below which item is considered “Soon” to restock.
- **Critical Pick Qty** – Threshold below which item is considered “Critical” to restock.
- **Recommended Pull Qty** – How many units should be pulled from Reserve to Pick shelves.
- **First Pull From** – Primary Reserve location and quantity for restocking, based on oldest inventory.
- **Then Pull From** – Secondary Reserve location and quantity if needed to reach the recommended amount.
- **Restock Checklist** – Staff-facing tab listing all products below their target pick-shelf quantities.
- **Data Exceptions** – Tab logging source data rows the engine couldn’t use due to missing or invalid information.

---

This document should be sufficient to **reconstruct the entire v1 system** from scratch:

- Tabs, names, and roles.
- Data fields and their meaning.
- Rule structure and priority.
- Engine pipeline and checklist behavior.
- Visual design and day-to-day workflow.

Any future work (formulas, Apps Script, enhancements) should treat this as the **source of truth** for how the vault restock system is meant to behave.

