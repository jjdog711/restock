> [!WARNING]
> Historical Archive Notice
> 
> Scope: historical v1 material only.
> This file is preserved for traceability and is not authoritative for the current implementation.
> Current docs start at `docs/index.md`.
# State of Mind – Treez Field Conventions (What These Columns *Actually* Mean)

This doc tells an AI agent (or any dev) how **State of Mind** actually uses key Treez fields in the valuation export, vs how they’re “supposed” to be used in generic docs.

You should treat this file as **ground truth for semantics** when working with the vault restock system.

---

## 1. High‑level identity strategy

For the **vault restock system**, we define:

- **Primary product identity** (what counts as “one product”):  
  → `External ID` (Treez product ID)

- **Display identity** (what humans see on the checklist):  
  → `Brand` + `Product Name` + `Size` + `Classification`

- **Barcode behavior** (what POS scans & we use for QC/tie‑breaks):  
  → `Inventory Barcodes` (and `Product Barcodes` if populated)

Batch IDs (`Batch`, `State Tracking ID`) are **lot metadata**, not product identity, in v1.

> **Note (December 2025):** Column names changed due to NY METRC integration: `Treez Batch` → `Batch`, `Ext Batch ID` → `State Tracking ID`.

---

## 2. Field‑by‑field: theoretical vs actual usage

### 2.1 `Brand`

- **Treez theory:** Brand / producer name.
- **State of Mind actual usage:** Correct — clean brand name (e.g. `DANK`, `FERNWAY`, `RYTHM`, `AYRLOOM`).
- **How the engine should treat it:**
  - Use for display on `Restock Checklist`.
  - Use as a filter in **Brand‑specific stocking rules** (e.g. all Sluggerz PR packs).

---

### 2.2 `Product Name`

- **Treez theory:** Product name (often just the core item name).
- **State of Mind actual usage:** This is effectively a **full menu/display title string**, not a pure name. It usually looks like:

  ```text
  BRAND - STRAIN / VARIANT - FORMAT / POTENCY / FORM FACTOR - SIZE / COUNT
  ```

  Examples from real data:

  - `FERNWAY - ALPINE STRAWBERRY - TRAVELER PRO - 2G ALL-IN-ONE VAPE - 2 G`
  - `DANK - AMNESIA HAZE - 1G INDOOR PRE ROLL - 1 G`
  - `MFNY - PEACHES & CREAM X OISHII - LIVE RESIN GUMMIES - 10CT - 100MG - 100 MG - 10 PACK`
  - `RYTHM - CHEM X - 3.5G INDOOR FLOWER - 3.5 G`

  Notes:
  - Brand is often repeated at the start even though we have a `Brand` column.
  - Size text is often repeated at the end (`- 3.5 G`, `- 100 MG`, etc.).
  - The string may include pack count, form factor, and marketing phrases.

- **How the engine should treat it:**
  - Treat `Product Name` as a **human‑facing menu title** for display only.
  - Do **not** rely on parsing `Product Name` to determine:
    - Brand,
    - Size,
    - Product Type,
    - Pack Style.
  - When you need structured information, use:
    - `Brand`
    - `Product Type` / `Subtype`
    - `Size`
    - `Unit of Measure`
    - Stocking rules tables.

  Parsing `Product Name` can be used as a **last‑resort helper** (e.g. inferring Pack Style), but never as the single source of truth.

---

### 2.3 `Product Type` and `Subtype`

- **Treez theory:** High‑level category (`FLOWER`, `PREROLL`, `EDIBLE`, etc.) and more specific subtype (e.g. infused vs non‑infused).
- **State of Mind actual usage:** Aligned with Treez defaults (e.g. `FLOWER`, `PREROLL`, `CARTRIDGE`, `EDIBLE`, `EXTRACT`, `BEVERAGE`, `TINCTURE`, `TOPICAL`, `PILL`). Subtype may or may not be consistently populated.
- **How the engine should treat it:**
  - Use `Product Type` to control **inclusion/exclusion** (e.g. `MERCH` always excluded).
  - Use `Product Type` + `Subtype` to select **stocking rules** (e.g. infused PR vs non‑infused).

---

### 2.4 `Size` and `Unit of Measure`

- **Treez theory:** Normalized unit size and measurement unit.
- **State of Mind actual usage:** Pretty close to theory; examples:
  - `Size` values: `3.5 G`, `7 G`, `28 G`, `100 MG`, `300 MG`, etc.
  - `Unit of Measure` values: `Each`, `Grams`, etc.
- **How the engine should treat it:**
  - Treat `Size` as the **authoritative** source for:
    - Distinguishing 3.5g vs 14g vs 28g flower,
    - Distinguishing 100mg vs 300mg edible SKUs.
  - Ignore the size fragments embedded in `Product Name` when making rule decisions.

---

### 2.5 `Classification`

- **Treez theory:** Indica / Sativa / Hybrid / CBD flags.
- **State of Mind actual usage:** Used as intended (Indica, Sativa, Hybrid, sometimes CBD / ratio labels).
- **How the engine should treat it:**
  - Display‑only on the checklist (`Classification` column).
  - Not used to drive restock quantity rules in v1.

---

### 2.6 `Attributes`

- **Treez theory:** Freeform attributes / tags field.
- **State of Mind actual usage:** Largely empty in the current export.
- **How the engine should treat it:**
  - **Ignore in v1** for restocking logic.
  - Safe to surface on debug tabs if needed later.

---

### 2.7 `Product Barcodes` vs `Inventory Barcodes`

- **Product Barcodes**
  - **Treez theory:** One or more barcodes associated with the product SKU.
  - **State of Mind actual usage:** Often present but not always populated or consistent.
  - **Engine usage in v1:** Optional helper; not primary.

- **Inventory Barcodes**
  - **Treez theory:** Barcodes tied to specific inventory units/rows.
  - **State of Mind actual usage:** This is the most reliable place to see what will actually scan at POS. Values may look like:
    - `900972930704`
    - `900972930704,mXK`  (barcode + internal short code)
  - **Engine usage in v1:**
    - Parse `Inventory Barcodes` into individual values (split on commas, trim).
    - Use them for:
      - Determining the **Primary Shelf Barcode** (the one with the highest quantity on `SALES FLOOR`).
      - Checking which RESERVE lots contain the primary shelf barcode.
      - Building the `Barcode Match` QC field (`OK` vs `Check`).

**Important:** Neither `Product Barcodes` nor `Inventory Barcodes` define what a product *is* — that’s `External ID`. They are used for **QC and tie‑breaking**, not as the primary identity key.

---

### 2.8 `External ID`

- **Treez theory:** Product‑level ID / internal SKU.
- **State of Mind actual usage:** This is the **correct, stable product ID**. For example:  
  `00ffcc58-2a27-4a95-9f6a-5a6ff8670785`
- **How the engine should treat it:**
  - **Primary product key**. All rows with the same `External ID` are:
    - Same product,
    - Same stocking rule target,
    - Same row on the Restock Checklist.
  - Use `External ID` to group locational rows into one “product” in the engine.

If `External ID` is ever missing on a row, fall back to `Brand + Product Name + Size + Product Type`, but this should be rare.

---

### 2.9 `Batch`, `State Tracking ID`, `Harvest Date`, `Packaged Date`

> **Note (December 2025):** Column names changed due to NY METRC integration:
> - `Treez Batch` is now `Batch`
> - `Ext Batch ID` is now `State Tracking ID` (METRC tracking number)
> - New columns added: `Harvest Batch`, `Production Batch #`

- **Treez theory:** Lot/batch identity and dates.
- **State of Mind actual usage:** Populated as expected for traceability and METRC compliance.
- **How the engine should treat it:**
  - **Not** used as the product key in v1.
  - FIFO is driven by `Date Inventory Received`, which generally aligns with batches.
  - Batch IDs can be surfaced on `Data Exceptions` or future "deep audit" features.

---

### 2.10 `Inventory Type`

- **Treez theory:** Adult vs Medical, etc.
- **State of Mind actual usage:** `Inventory Type = ADULT` for products in this report.
- **How the engine should treat it:**
  - Filter: only `Inventory Type = ADULT` rows are eligible in v1.

---

## 3. How to think about this as an agent

When working in Cursor / Opus for this repo, assume:

- **“What is a product?”** → Use `External ID`.
- **“What should staff read?”** → Use `Brand + Product Name + Size + Classification`.
- **“What does the scanner care about?”** → Use `Inventory Barcodes`.
- **“What is the true size?”** → Use `Size`, not the tail of `Product Name`.
- **"What batch/lot?"** → Use `Batch` / `State Tracking ID` if needed, but not for restock quantity logic.

Do **not** reinterpret or “fix” how the store uses fields — instead, build logic that respects the reality described here.

