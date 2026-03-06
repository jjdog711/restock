# Runbook: FAILED_STAGE_COMPLIANCE

> Reviewed: 2026-03-06 | Status: active | Script version: v2.2

Outcome code: `FAILED_STAGE_COMPLIANCE`

## Typical Cause

Compliance stage failed after checklist stage.

## Immediate Actions

- Open diagnostics and capture run_id and error_code.
- Validate Compliance Config settings and alias lists.
- Run Run Compliance Only to isolate stage behavior.
- Escalate to developer with run_id and source fixture.

## Escalation Package

Provide to developer:

- run ID
- outcome code and error code
- profile ID
- import signature
- fixture/file used
- screenshots of Home + Diagnostics rows

