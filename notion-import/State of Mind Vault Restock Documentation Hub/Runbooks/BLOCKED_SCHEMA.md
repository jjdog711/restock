# Runbook: BLOCKED_SCHEMA

> Reviewed: 2026-03-06 | Status: active | Script version: v2.2

Outcome code: `BLOCKED_SCHEMA`

## Typical Cause

Required raw/config schema fields are missing or unmapped.

## Immediate Actions

- Confirm raw import at Treez Valuation (Raw)!A6 with header row at 6.
- Run Restock -> Run System Check and read schema section.
- Verify Compliance Config alias table resolves status/location/expiration/THC fields.
- Re-run Run Daily Update after corrections.

## Escalation Package

Provide to developer:

- run ID
- outcome code and error code
- profile ID
- import signature
- fixture/file used
- screenshots of Home + Diagnostics rows

