> [!WARNING]
> Historical Archive Notice
> 
> Scope: historical v1 material only.
> This file is preserved for traceability and is not authoritative for the current implementation.
> Current docs start at `docs/index.md`.
# Location Map Template – State of Mind Vault (v1)

This file maps Treez `Location` values to **Location Roles**:

- `PICK SHELF` – vault shelving where budtenders pull from during service.  
  - In State of Mind v1, **this is only `SALES FLOOR`**.
- `RESERVE` – vault/backroom storage used to refill pick shelves.
- `IGNORE` – locations not used for restock logic (returns, quarantine, staging, etc.).

The actual mapping is stored in the `Restock Settings` tab.  
This file is a human-readable reference + starting template.

See also:
- `docs/addendum_v1a_locations_and_held_logic.md`

---

## 1. Complete Location Map (from actual Treez export)

This is the **complete list of all locations** found in the sample Valuation_Report_Sample.csv.  
Each location has been assigned a role based on State of Mind operations.

### PICK SHELF (1 location)

| Location Name | Role       | Notes |
|---------------|------------|-------|
| `SALES FLOOR` | PICK SHELF | The **only** pick shelf in v1. Active vault area for service. |

### RESERVE – Standard Bins (10 locations)

| Location Name | Role    | Notes |
|---------------|---------|-------|
| `BIN 1`       | RESERVE | Numbered vault bins |
| `BIN 2`       | RESERVE | |
| `BIN 3`       | RESERVE | |
| `BIN 4`       | RESERVE | |
| `BIN A`       | RESERVE | Lettered vault bins |
| `BIN B`       | RESERVE | |
| `BIN C`       | RESERVE | |
| `BIN D`       | RESERVE | |
| `BIN E`       | RESERVE | |
| `BIN F`       | RESERVE | |
| `BIN FERNWAY` | RESERVE | Brand-specific bin |

### RESERVE – Back Bins & Shelves (8 locations)

| Location Name  | Role    | Notes |
|----------------|---------|-------|
| `BACK BIN 1`   | RESERVE | Back-of-vault bins |
| `BACK BIN 2`   | RESERVE | |
| `BACK BIN 3`   | RESERVE | |
| `04BACK BIN 1` | RESERVE | Data quality note: appears to have "04" prefix in Treez |
| `BACK SHELF 1` | RESERVE | Back-of-vault shelving |
| `BACK SHELF 2` | RESERVE | |
| `BACK SHELF 3` | RESERVE | |
| `BACK SHELF 4` | RESERVE | |
| `BACK SHELF 5` | RESERVE | |

### RESERVE – Upper Bins (9 locations)

| Location Name | Role    | Notes |
|---------------|---------|-------|
| `UPPER BIN 1` | RESERVE | Upper storage area |
| `UPPER BIN 2` | RESERVE | |
| `UPPER BIN 3` | RESERVE | |
| `UPPER BIN 4` | RESERVE | |
| `UPPER BIN 5` | RESERVE | |
| `UPPER BIN 6` | RESERVE | |
| `UPPER BIN 7` | RESERVE | |
| `UPPER BIN 8` | RESERVE | |
| `UPPER BIN 9` | RESERVE | |

### RESERVE – Shelves (12 locations)

| Location Name  | Role    | Notes |
|----------------|---------|-------|
| `SHELF A`      | RESERVE | Lettered shelves (backstock) |
| `SHELF B`      | RESERVE | |
| `SHELF C`      | RESERVE | |
| `SHELF D`      | RESERVE | |
| `SHELF E`      | RESERVE | |
| `TALL SHELF 1` | RESERVE | Tall shelving units (backstock) |
| `TALL SHELF 2` | RESERVE | |
| `TALL SHELF 3` | RESERVE | |
| `TALL SHELF 4` | RESERVE | |
| `TALL SHELF 5` | RESERVE | |
| `TALL SHELF 6` | RESERVE | |
| `TALL SHELF 7` | RESERVE | |

### RESERVE – Fridge (2 locations)

| Location Name  | Role    | Notes |
|----------------|---------|-------|
| `FRIDGE BIN 1` | RESERVE | Refrigerated storage (beverages, perishables) |
| `FRIDGE BIN 2` | RESERVE | |

### IGNORE – Problem / Staging / Special (6 locations)

| Location Name          | Role   | Notes |
|------------------------|--------|-------|
| `QUARANTINE`           | IGNORE | Hold area; not for restocking |
| `POS RETURN`           | IGNORE | Returns area |
| `UNSELLABLE INVENTORY` | IGNORE | Damaged/unsellable |
| `FIND ME`              | IGNORE | Problem inventory needing resolution |
| `PROCESSING BACKSTOCK` | IGNORE | Staging area; not yet in sellable inventory |
| `DISPLAYS`             | IGNORE | Display units; not active inventory |
| `HELD`                 | IGNORE | Always ignored in v1; products must be moved to sellable location |

---

## 2. Summary Counts

| Role       | Count | Include in Engine |
|------------|-------|-------------------|
| PICK SHELF | 1     | TRUE              |
| RESERVE    | 42    | TRUE              |
| IGNORE     | 7     | FALSE             |
| **Total**  | 50    | —                 |

> **Important defaults (v1):**  
> - Only `SALES FLOOR` is `PICK SHELF`.  
> - All backstock locations (bins, shelves, fridge) are `RESERVE`.  
> - Staging and problem locations are `IGNORE`.  
> - Any `Location` **not** present in `Location Roles` defaults to `IGNORE` until mapped.

---

## 3. How to extend this mapping

When new locations appear in Treez:

1. Export the latest Treez valuation.
2. Check `Data Exceptions` for any `UNKNOWN_LOCATION_ROLE` entries.
3. For each new location, decide: `PICK SHELF`, `RESERVE`, or `IGNORE`?
   - In v1, do **not** add new PICK SHELF locations unless store policy changes.
4. Add it to `Restock Settings → Location Roles` with:
   - `Location Name` (exact match to Treez)
   - `Location Role`
   - `Include in Engine = TRUE` for PICK SHELF / RESERVE, `FALSE` for IGNORE.
5. Update this template file to keep docs in sync.

**Note on data quality:** If a location name appears with typos or prefixes (e.g. `04BACK BIN 1`), map it as-is. Consider flagging to Treez admin for correction.

