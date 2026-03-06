---
audience: developer
owner: Xylent Studios
last-reviewed: 2026-03-06
script-version: v2.2
status: active
---

# Architecture Overview

`restock_builder.gs` is a single-file Apps Script system with profile-aware checklist and compliance engines.

## Runtime Pipeline

Primary action: `runDailyUpdate()` -> `runDailyUpdate_()`

Stages:

1. Profile resolve (`StoreProfiles`, override, license-detection)
2. Schema gate (checklist + compliance contracts)
3. Location sync (profile map -> Restock Settings)
4. Preflight checks
5. Checklist refresh (`refreshChecklist`)
6. Compliance audit (`runComplianceCheck`)
7. Finalize diagnostics + Home state

## Key Hidden Data Contracts

### `System_Reference`

- `StoreProfiles`: profile metadata and override/auto-run controls
- `LocationProfileMap`: per-profile location role definitions
- `LocationReviewQueue`: unknown location governance with dedupe counters

### `System_Diagnostics`

- `Run_Journal`: run context, outcome, timing, counts
- `Health_Events`: warnings/errors and health events

### `Compliance Config`

- setting/value pairs for source sheet and logic mode
- alias table for canonical fields
- allowlists/denylists/tokens for processed and missing-value logic

## Public Function Surface

Menu-facing:

- `main`
- `runDailyUpdate`
- `runChecklistOnly`
- `runComplianceOnly`
- `installAutoRun`
- `disableAutoRun`
- `runSystemCheck`
- `openDiagnostics`
- `clearComplianceOutput`
- `clearImportData`
- checklist/workspace view toggles

Trigger-facing:

- `onOpen`
- `handleSpreadsheetChange`

## Design Rules

- Never depend on fixed raw column positions at runtime validation layers
- Unknown location defaults to `IGNORE` and enters review queue
- Manual runs always allowed even when signature matches last success
- Auto-trigger duplicates skip safely
- Lock contention never mutates outputs (`SKIPPED_LOCKED`)

## Related Docs

- [Code Map](code-map.md)
- [Stocking Rules Test Guide](stocking-rules-test-guide.md)
- [Manager Confidence Pack](../managers/start-here.md)
- [Manager Operations Guide](../managers/operations-guide.md)
- [Runbooks](../runbooks/index.md)

---
_State of Mind Vault Restock System | Built by Xylent Studios | Steward: Justin Michalke | Script v2.2 | Last reviewed: 2026-03-06_


