> [!WARNING]
> Historical Archive Notice
> 
> Scope: historical v1 material only.
> This file is preserved for traceability and is not authoritative for the current implementation.
> Current docs start at `docs/index.md`.
# Implementation Guidelines for Agents – Vault Restock System

This file summarizes how to make changes **safely and correctly** in the State of Mind vault restock system.

Use it alongside:
- `state_of_mind_vault_restock_system_v1_spec.md`
- `addendum_v1a_locations_and_held_logic.md`
- Other docs in `docs/`.

---

## 1. Where logic lives

- **`Treez Valuation (Raw)`**
  - Only for importing the latest CSV.
  - Instructions at the top; raw data starts at `A6`.
  - Do not add formulas into the raw data area.

- **`Restock Engine (Internal)`**
  - All complex logic and grouping lives here.
  - Use formulas only; no manual edits.
  - Should be hidden/protected for normal users.

- **`Restock Settings`**
  - Contains configuration only:
    - `Location Roles`
    - `Stocking Rules`
  - Staff should not need to touch this; only managers/system owner.

- **`Restock Checklist`**
  - Staff-facing.
  - Contains derived columns + manual columns:
    - Manual: `Units Pulled`, `Restock Status`, `Done`, `Notes`.
  - No debug or intermediate fields.

- **`Data Exceptions`**
  - Shows rows the engine skipped or flagged.
  - Useful for debugging location mappings, missing data, etc.

---

## 2. Manual vs formula columns

**Manual input columns:**
- On `Restock Checklist`:
  - `Units Pulled`
  - `Restock Status`
  - `Done` (checkbox)
  - `Notes`
- On `Restock Settings`:
  - All fields in `Location Roles` and `Stocking Rules` sections.

**Formula-derived columns:**
- Everything else:
  - Quantities, targets, urgency, pull-plan text, QC fields.

Never overwrite formula ranges with constant values. If staff need to override behavior, introduce a new manual config field and update formulas intentionally.

---

## 3. Adding or changing logic

1. **Update spec first if behavior changes.**
   - If you need to change business logic (e.g. how HELD works, new product types), update the relevant doc(s):
     - Main spec
     - Addendum
     - Policy notes
   - Then change formulas to match the updated spec.

2. **Prefer named ranges / structured formulas.**
   - Use named ranges or clearly labeled helper ranges on `Restock Engine (Internal)`.
   - Avoid hard-coding column letters where possible.

3. **Support new locations via `Restock Settings`.**
   - When Treez gets new `Location` values, add them to `Location Roles`.
   - Do **not** infer new roles in formulas.

4. **Support new rules via `Stocking Rules`.**
   - To tune restocking for a brand or specific SKU, add or adjust a rule row.
   - Do not embed rule numbers directly into formulas (always reference the rules table).

---

## 4. Testing changes

After significant formula or layout changes:

1. Use `docs/test_cases_expected_outputs.md` to simulate scenarios.
2. Verify that the outputs on `Restock Checklist` match the expected behavior.
3. Check `Data Exceptions` for any unexpected growth in errors such as `UNKNOWN_LOCATION_ROLE`.

If a change causes a test to fail, either:
- Fix the formulas, or
- Update the spec and test case if the desired behavior has legitimately changed.

---

## 5. Style & maintenance

- Keep formulas **readable**:
  - Use indentation (via line breaks in the formula editor) for complex `IFS` / `LET` expressions.
  - Add inline comments (in adjacent cells or a separate "Notes" section) for non-obvious logic.

- Avoid expanding the `Restock Checklist` with rarely used info.
  - If something is rarely needed, show it on a separate tab or via a helper range.

- When in doubt, ask for clarification rather than making silent business decisions.

This system is meant to be **maintainable** and **trustworthy**, not clever and opaque.

