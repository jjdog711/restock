# Fixture Test Data Reference

> Reviewed: 2026-03-06 | Status: active | Script version: v2.2

This folder contains regression fixtures for both active store profiles.

## Primary Fixtures

- `Albany_Valuation Report_Report Details_03052026_132100.csv`
  - expected profile: `ALBANY`
  - expected license: `OCM-RETL-26-000470-D1`
- `Latham_Valuation Report_Report Details_03052026_140857.csv`
  - expected profile: `LATHAM`
  - expected license: `OCM-CAURD-24-000178-D1`

Baseline ranges are managed in [fixture-manifest.csv](fixture-manifest.csv).

## Regression Flow

1. Import fixture at `Treez Valuation (Raw)!A6`
2. Run `Restock -> Run Daily Update`
3. Confirm resolved profile
4. Compare checklist/compliance counts against manifest ranges
5. Confirm unknown location queue behavior

## Legacy Samples

- `test_sample_v2_20251218.csv`
- `archive/*`

