# Code Map (`restock_builder.gs`)

> Reviewed: 2026-03-06 | Status: active | Script version: v2.2

Use this grouped map for faster navigation and safer edits.

## Bootstrap and UI

- `main`
- `onOpen`
- `createAllTabs`
- `applyWorkspaceView_`, `setStandardUserView`, `setManagerView`
- `setChecklistViewMode_`, `setChecklistViewPriority`, `setChecklistViewLocationWave`

## Daily Pipeline and Guardrails

- `runDailyUpdate`, `runDailyUpdate_`
- `createRunContext_`, `finalizeRunContext_`, `buildRunId_`
- `runWithStageTiming_`, `getPerfWarnThresholdMs_`
- `validateRunSchemaGate_`, `validateChecklistSchema_`, `validateComplianceSchema_`
- `runRestockPreflight_`

## Profile and Location Engine

- `setupSystemReferenceTab`
- `readStoreProfiles_`, `readLocationProfileMap_`
- `resolveActiveStoreProfile_`, `detectProfileFromRaw_`
- `getLocationRolesForProfile_`, `syncLocationRolesForProfile_`
- `appendLocationReviewQueue_`, `inferSuggestedRoleForLocation_`

## Checklist Engine

- `refreshChecklist`
- `applyStockingRules`
- `setupRestockSettingsTab`, `setupRestockEngineTab`, `setupRestockChecklistTab`
- `ensureNoReserveRiskTab_`, `setupNoReserveRiskTab`

## Compliance Engine

- `runComplianceCheck`, `clearComplianceOutput`
- `readComplianceConfig_`, `resolveComplianceColumns_`
- `isProcessedRow_`, `isMeaningfulThc_`, `isValidExpiration_`
- `writeComplianceOutput_`, `appendComplianceLog_`
- raw highlight helpers and dedupe helpers

## Diagnostics and Home

- `setupSystemDiagnosticsTab`, `getSystemDiagnosticsSheet_`
- `appendRunJournal_`, `appendHealthEvent_`
- `setupDailyHomeTab`, `updateDailyHomeSummary_`, `updateDailyHomeHealth_`
- `refreshDailyHomeHealthFromState_`

## Trigger and Import Automation

- `installAutoRun`, `disableAutoRun`
- `handleSpreadsheetChange`
- `computeRawImportSignature_`, `getQuickLicenseSignatureToken_`

## Utility Layer

- parsing/normalization helpers (`parse*`, `normalize*`)
- range/date/value helper functions
- shared warning and formatting helpers

## Ownership Boundaries

- Operations config behavior: manager/admin docs + `System_Reference`
- Engine logic and contracts: developer ownership
- End-user workflow text: docs/users only
- Diagnostic outcome semantics: docs/runbooks + developer ownership

