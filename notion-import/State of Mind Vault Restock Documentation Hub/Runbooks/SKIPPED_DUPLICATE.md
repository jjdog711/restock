# Runbook: SKIPPED_DUPLICATE

> Reviewed: 2026-03-06 | Status: active | Script version: v2.2

Outcome code: `SKIPPED_DUPLICATE`

## Typical Cause

Auto-trigger fired with an unchanged import signature.

## Immediate Actions

- No action needed if last success is recent.
- If a fresh import should have run, verify import replaced raw range at A6.
- Check signature-related fields in diagnostics for unexpected stability.
- Manual Run Daily Update can be used to force execution.

## Escalation Package

Provide to developer:

- run ID
- outcome code and error code
- profile ID
- import signature
- fixture/file used
- screenshots of Home + Diagnostics rows

