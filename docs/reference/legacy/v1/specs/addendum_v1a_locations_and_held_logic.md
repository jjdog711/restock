> [!WARNING]
> Historical Archive Notice
> 
> Scope: historical v1 material only.
> This file is preserved for traceability and is not authoritative for the current implementation.
> Current docs start at `docs/index.md`.
# Addendum v1a – Location Roles & HELD Logic (State of Mind)

This addendum updates and refines the main v1 spec for the **State of Mind vault restock system**.

If anything in `state_of_mind_vault_restock_system_v1_spec.md` conflicts with this file, **this addendum wins**.

---

## 1. Pick-shelf locations in v1

For State of Mind v1:

- The **only** pick-shelf location is Treez `SALES FLOOR`.
- All other locations that store sellable product inside the vault/back room are considered **backstock (RESERVE)**, not pick shelves.

In practice:

- `SALES FLOOR` → `PICK SHELF`
- Known vault storage locations (e.g. bins, shelves, fridge bins, upper bins) → `RESERVE`
- Special/hold/problem locations (quarantine, returns, etc.) → `IGNORE`

The system remains configurable via `Restock Settings → Location Roles`, but for this store and v1, you should **not** mark any location besides `SALES FLOOR` as `PICK SHELF` unless a human explicitly changes that policy.

---

## 2. Default behavior for unknown locations

Any Treez `Location` value that does **not** appear in the `Location Roles` table in `Restock Settings` should be treated as:

- `Location Role = IGNORE`

In other words, locations must be **explicitly mapped** if they should contribute to:

- `Pick Shelf Qty`, or
- `Reserve Qty`

There is no heuristic inference of roles:
- Unknown locations are excluded by default until a human assigns a role.

---

## 3. HELD location behavior

State of Mind uses a `HELD` (or similar) location for inventory that is not yet available for sale.

**In v1, HELD inventory is always treated as IGNORED.**

- Rows with `Location = HELD` do not contribute to Pick Shelf Qty or Reserve Qty.
- They do not appear on the Restock Checklist.
- This is the simplest safe behavior: HELD inventory should not be pulled until it's been moved to a sellable location in Treez.

**Future enhancement (not in v1):** If Treez adds a release/available date column to the export, the engine could be updated to promote HELD rows to RESERVE when their release date is on or before the valuation date. This would require a spec update and explicit configuration.

---

## 4. Summary

For State of Mind v1:

- Only `SALES FLOOR` is `PICK SHELF`. Everything else is backstock (RESERVE) or ignored.
- Unmapped locations default to `IGNORE` to avoid accidental inclusion.
- HELD inventory is **always IGNORE** in v1. Products in HELD locations must be moved to a sellable location in Treez before they can be considered for restocking.

Adjust any implementation or documentation that assumed multiple pick-shelf locations to align with this clarified behavior.

