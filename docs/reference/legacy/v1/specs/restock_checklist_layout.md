> [!WARNING]
> Historical Archive Notice
> 
> Scope: historical v1 material only.
> This file is preserved for traceability and is not authoritative for the current implementation.
> Current docs start at `docs/index.md`.
# Restock Checklist Layout – Reference

This document defines the **expected layout** and behavior of the `Restock Checklist` tab.

For full semantics, see the main spec:
- `docs/state_of_mind_vault_restock_system_v1_spec.md`
- `docs/addendum_v1a_locations_and_held_logic.md`

> **v1.7 Update (December 2025):** Column names shortened for portrait printing. See Section 2 for current names.

> **v1.8 Update (December 2025):** Target column now displays the matched rule's Target value (from custom stocking rules). Thresholds are customizable per product type via Restock Settings.

---

## 1. Header area

Compact layout with all header info on Row 1:

- **Row 1**:
  - A1: `VAULT RESTOCK CHECKLIST` (title, bold, 18pt)
  - D1: `Valuation:` label
  - E1: Valuation date/time from Treez (formatted as `M/D/YYYY h:mm AM/PM`)
  - G1: `Generated:` label
  - H1: Current timestamp (`=NOW()`)

- **Row 2**: Column headers (frozen)

- **Row 3+**: Data rows

> **Note:** Instructions and color legend have been removed for a cleaner, more compact layout. Staff should be familiar with urgency colors (red = Critical, amber = Soon, green = Low) from training.

---

## 2. Column order (left to right)

> **Column names optimized for portrait printing (v1.7)**

1. **Urgency & identity**
   - `Urgency` (1 - Critical / 2 - Soon / 3 - Low)
   - `Brand` **(hidden by default)**
   - `Product`
   - `Type` **(hidden by default)**
   - `Size / Strength` **(hidden by default)**
   - `Classification` **(hidden by default)**

2. **Current stock & target**
   - `Flr` — Floor/sales floor quantity (formerly "Pick Shelf Qty")
   - `Bck` — Backstock quantity (formerly "Reserve Qty")
   - `Target Pick Qty` **(hidden by default)**

3. **Pull plan**
   - `Recommended Pull Qty` **(hidden by default)**
   - `First Pull From`   (e.g. `BIN 2 (4)`)
   - `Then Pull From`    (only if needed to reach recommended pull)

4. **Execution & status** (manual inputs)
   - `Pull` — Units pulled (formerly "Units Pulled")
   - `Restock Status` **(hidden by default)** (To Pull / Pulled / Partial / No Backstock / Can't Find)
   - `Done` (checkbox)
   - `Notes`

5. **QC**
   - `BC Match` — Barcode consistency (formerly "Barcode Match") — OK ✓ / Check ⚠
   - `Oldest Backstock Date` **(hidden by default)**

### Hidden Columns (default view)

The following 8 columns are hidden by default for a compact portrait-printable layout:

| Column | Name | Reason Hidden |
|--------|------|---------------|
| 2 | Brand | Product name is usually sufficient |
| 4 | Type | Not needed for daily workflow |
| 5 | Size / Strength | Not needed for daily workflow |
| 6 | Classification | Not needed for daily workflow |
| 9 | Target Pick Qty | Shows ∞ (infinity) in current version |
| 10 | Recommended Pull Qty | First/Then Pull From provides this info |
| 14 | Restock Status | Done checkbox is primary status indicator |
| 18 | Oldest Backstock Date | FIFO guidance in First Pull From is sufficient |

---

## 3. Visual behavior

- **Urgency:**
  - Entire row background tinted by `Urgency`:
    - Critical → soft red tint.
    - Soon → soft amber/golden tint.
    - Low → soft green tint.

- **Done rows:**
  - When `Done` checkbox is TRUE:
    - `Product` text is strike-through.
    - All text in the row is greyed out (lower contrast).

- **Headers:**
  - Bold, slightly larger font.
  - Light grey background.
  - Thick bottom border under header row.

- **Grid & grouping:**
  - Light gridlines between cells.
  - Slightly thicker vertical borders between blocks:
    - Identity ↔ Stock
    - Stock ↔ Pull Plan
    - Pull Plan ↔ Execution
    - Execution ↔ QC

---

## 4. Row Layout Summary

| Row | Content |
|-----|---------|
| 1 | Title + Valuation Date + Generated Date |
| 2 | Column Headers (frozen) |
| 3+ | Data rows |

---

## 5. Example row (conceptual)

With default view (hidden columns not shown), optimized for portrait printing:

```text
Urgency  | Product                      | Flr | Bck | First Pull From   | Then Pull From    | Pull | Done | Notes | BC Match
Critical | Zkittlez Infused PR Pack     |  1  | 20  | BIN 2 (4)         | BACK SHELF 1 (1)  |      | [ ]  |       | OK ✓
```

The actual data will differ, but the **layout and behavior** should match this structure.

### Column Width Reference (for portrait printing)

| Column | Width | Notes |
|--------|-------|-------|
| Urgency | 75px | Fits "1 - Critical" |
| Product | 300px | Main content area |
| Flr | 30px | Compact number |
| Bck | 30px | Compact number |
| First Pull From | 130px | Location + qty |
| Then Pull From | 130px | Location + qty |
| Pull | 35px | User input |
| Done | 40px | Checkbox |
| Notes | 100px | User input |
| BC Match | 65px | OK ✓ or Check ⚠ |

