# Deployment Guide

> Reviewed: 2026-03-06 | Status: active | Script version: v2.2

## Prerequisites

- Google account with Sheets and Apps Script access
- `restock_builder.gs`
- Treez Inventory Valuation CSV exports

## 1. Create or reset workbook

1. Create new Google Sheet
2. Open `Extensions -> Apps Script`
3. Replace default code with `restock_builder.gs`
4. Save and run `main`
5. Authorize requested scopes

Expected tabs include:

- Staff: `Home`, `Start Here`, `Treez Valuation (Raw)`, `Backstock Alerts`, `Restock List`, `Compliance Alerts`
- Manager/Admin: `Restock Settings`, `Compliance Config`, `Compliance History`, `Data Watchlist`
- Hidden: `Restock Engine (Internal)`, `System_Reference`, `System_Diagnostics`

## 2. Profile and mapping setup

- Open `System_Reference` in manager mode
- Verify `StoreProfiles` rows for Albany and Latham
- Verify `LocationProfileMap` coverage for active store

Recommended model:

- One workbook per store
- Optional `profile_override=TRUE` in each workbook

## 3. Trigger setup

Install:

- `Restock -> Install Auto-Run`

Disable:

- `Restock -> Disable Auto-Run`

Validation:

- `Restock -> Run System Check`
- Confirm trigger status and diagnostics writeability

## 4. Backup and restore

Before major changes:

1. Duplicate workbook as dated backup
2. Export Apps Script project source copy
3. Save current `System_Reference` snapshot (CSV)

Restore path:

1. Clone last known good workbook
2. Reapply profile override/trigger settings
3. Verify with fixture regression run

## 5. Migration checks (v3.0 docs IA)

1. Root README points to `docs/index.md`
2. Legacy doc stubs resolve to new routes
3. `tools/docs/check-docs.ps1` passes
4. Albany and Latham fixture baselines still align

## 6. Runtime acceptance checks

- Manual `Run Daily Update` succeeds
- Auto-run executes on new raw signature
- Duplicate auto events produce `SKIPPED_DUPLICATE`
- Overlapping runs produce `SKIPPED_LOCKED`

