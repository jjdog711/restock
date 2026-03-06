# Changelog

> Reviewed: 2026-03-06 | Status: active | Script version: v2.2

## v2.2 - 2026-03-06

- Hardened the local docs path for day-to-day use:
  - added Obsidian-first local-use guidance to the docs hub and root README
  - clarified role-based start paths and failure routing from the homepage
  - made the reference index current-vs-legacy split clearer
  - fixed runbook outcome-code placeholders so failure pages show exact outcomes
- Finalized user-facing tab names:
  - `Home`
  - `Start Here`
  - `Restock List`
  - `Backstock Alerts`
  - `Compliance Alerts`
  - `Compliance History`
  - `Data Watchlist`
- Updated daily run routing behavior:
  - Opens `Compliance Alerts` when compliance flags exist
  - Opens `Restock List` when no compliance flags exist
- Added compatibility tab migration support so legacy workbook names still resolve.
- Canonicalized changelog path to `docs/changelog.md` (no case-only alias behavior).
- Hardened docs release checks for stale UX terms and alias self-link detection.
- Updated script header/version text and removed user-facing encoding artifacts.

## v2.1 - 2026-03-06

- Delivered flagship hardening wave:
  - strict preflight/schema block behavior
  - single-flight lock and deterministic run outcomes
  - expanded diagnostics (`System_Diagnostics`, `AI_Diagnostics`)
- Added structured stage/step performance telemetry and rolling diagnostics retention.
- Improved steady-state runtime with signature-aware shortcuts and reduced redundant writes.
- Upgraded profile/location governance for Albany and Latham with queue health signals.

## v2.0 - 2026-03-05

- Introduced single core script with profile model (`ALBANY`, `LATHAM`).
- Added `Run Daily Update` end-to-end workflow and installable auto-run support.
- Added compliance auditing for processed inventory missing THC and/or expiration data.
- Added manager/system controls for diagnostics, system checks, and profile mapping.

