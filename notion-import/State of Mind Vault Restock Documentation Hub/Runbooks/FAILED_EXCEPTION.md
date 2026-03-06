# Runbook: FAILED_EXCEPTION

> Reviewed: 2026-03-06 | Status: active | Script version: v2.2

Outcome code: `FAILED_EXCEPTION`

## Typical Cause

Unhandled runtime exception occurred.

## Immediate Actions

- Capture run_id, stage, and error details from diagnostics.
- Confirm whether checklist/compliance outputs were preserved.
- Attempt one manual rerun after no active lock.
- Escalate immediately to developer if reproducible.

## Escalation Package

Provide to developer:

- run ID
- outcome code and error code
- profile ID
- import signature
- fixture/file used
- screenshots of Home + Diagnostics rows

