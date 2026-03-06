> [!WARNING]
> Historical Archive Notice
> 
> Scope: historical v1 material only.
> This file is preserved for traceability and is not authoritative for the current implementation.
> Current docs start at `docs/index.md`.
# Restock Policy Notes – Hard Constraints (v1a + v1b)

These are **non-negotiable rules** for the State of Mind vault restock system.  
Do not violate these without explicit human approval and spec updates.

See also:
- `docs/state_of_mind_vault_restock_system_v1_spec.md`
- `docs/addendum_v1a_locations_and_held_logic.md`
- `docs/addendum_v1b_multi_barcode_fifo_logic.md`

---

## 1. Scope of products

1. **Cannabis only**
   - Only consider rows where:
     - `Inventory Type = ADULT`
     - `Product Type` is one of:
       - `FLOWER`, `PREROLL`, `CARTRIDGE`, `EDIBLE`, `EXTRACT`, `BEVERAGE`, `TINCTURE`, `TOPICAL`, `PILL`.

2. **MERCH excluded**
   - `Product Type = MERCH` must **never** appear on `Restock Checklist` in v1.

3. **Zero-quantity rows excluded**
   - Rows where `Available = 0` are filtered out early to reduce noise.
   - They do not contribute to Pick Shelf Qty or Reserve Qty.

---

## 2. Locations and roles (State of Mind v1)

1. All cannabis inventory is stored in a **vault/back room**, not on a public retail floor.
2. The only pick-shelf inventory location is Treez **`SALES FLOOR`**.
3. All other storage locations that hold sellable inventory are considered **RESERVE**, once explicitly mapped.
4. Special/hold/problem/staging locations must be **ignored** for restocking decisions, including (but not limited to):
   - `QUARANTINE`
   - `POS RETURN`
   - `UNSELLABLE INVENTORY`
   - `FIND ME`
   - `PROCESSING BACKSTOCK`
   - `DISPLAYS`

5. `HELD` location behavior:
   - Rows with `Location = HELD` are **always IGNORE** in v1.
   - HELD inventory does not contribute to Pick Shelf Qty or Reserve Qty.
   - Products must be moved to a sellable location in Treez before they appear on the Restock Checklist.

6. Unmapped locations:
   - Any `Location` not present in `Restock Settings → Location Roles` should be treated as **ignored** by default until mapped.

There is no heuristic guessing of roles: locations must be configured or they are excluded.

---

## 3. Default stocking thresholds

1. **Default restock trigger:**
   - Add product to Restock Checklist when **6 or fewer** units on SALES FLOOR (i.e., Pick Shelf Qty < 7)
   - This is the standard business rule unless a product-specific rule overrides it

2. **Default urgency levels:**
   - **Critical (red):** 2 or fewer units on shelf
   - **Warning/Soon (amber):** 4 or fewer units on shelf
   - **Low (green):** 5-6 units on shelf

3. **Recommended Pull Qty:**
   - Default to 99 or available reserve inventory (whichever is less)
   - Products have different stock limits; 99 is a safe upper bound
   - Staff should use judgment for actual pull amounts

4. **Product-specific rules:**
   - When rule matching is enabled, specific product types/brands can have different thresholds
   - Example: Single prerolls might have Target=10, while 28g flower might have Target=4

---

## 4. FIFO, barcodes, and inventory rotation

1. **FIFO is primary.**
   - When suggesting restocks from `RESERVE`, the system must always prioritize **oldest inventory by `Date Inventory Received`**.
   - Barcode matching (to the dominant `SALES FLOOR` barcode) is a **secondary tie-breaker**, only applied when dates are equal.

2. Sorting RESERVE locations:
   - RESERVE rows should be sorted using a multi-key:
     1. `Date Inventory Received` ascending (oldest first)
     2. Rows whose barcode matches the primary shelf barcode before non-matching rows
     3. Smaller `Available` quantities before larger (clear small stashes first)
     4. Location name as a final tie-breaker

3. Multi-barcode products:
   - Conceptually identical products may have multiple barcodes.
   - They are treated as **one product** for counting and targeting.
   - The system chooses a **primary shelf barcode** based on which barcode has the highest quantity on `SALES FLOOR` (with deterministic tie-breakers).
   - Mixed-barcode situations are surfaced via `Barcode Match = "Check ⚠️"` for human awareness.

Pull-plan columns:
- `First Pull From` – first RESERVE row selected from this sorted order.
- `Then Pull From` – the next RESERVE row, only if needed to reach the recommended pull quantity.

---

## 5. Data quality & safety

1. If a product's rows contain **conflicting barcodes**, mark `Barcode Match = "Check ⚠️"` on the checklist row.
2. Do **not** silently merge obviously different SKUs just because names are similar.
3. Log problematic rows to `Data Exceptions` with a reason code rather than guessing.

---

## 6. UX / staff experience

1. `Restock Checklist` must remain **clean, readable, and focused**:
   - No debug columns.
   - No raw IDs or internal-only fields.

2. Daily staff should only need:
   - `Treez Valuation (Raw)` to import.
   - `Restock Checklist` to run the vault restock.

3. All configuration and complex logic lives in:
   - `Restock Settings`
   - `Restock Engine (Internal)`
   - `Data Exceptions` (for debugging)

Keep these policies in mind when making changes or proposing new features.

