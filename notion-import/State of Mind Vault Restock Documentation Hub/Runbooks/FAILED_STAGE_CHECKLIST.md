# Runbook: FAILED_STAGE_CHECKLIST

> Reviewed: 2026-03-06 | Status: active | Script version: v2.2

Outcome code: `FAILED_STAGE_CHECKLIST`

## Typical Cause

Checklist stage failed after preflight.

## Immediate Actions

- Open diagnostics and capture run_id and error_code.
- Validate Restock Settings structure and checklist schema contract.
- Run Run Checklist Only to isolate stage behavior.
- Escalate to developer with fixture used and run_id.

## Escalation Package

Provide to developer:

- run ID
- outcome code and error code
- profile ID
- import signature
- fixture/file used
- screenshots of Home + Diagnostics rows

