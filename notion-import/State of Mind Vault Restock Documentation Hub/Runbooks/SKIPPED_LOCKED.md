# Runbook: SKIPPED_LOCKED

> Reviewed: 2026-03-06 | Status: active | Script version: v2.2

Outcome code: `SKIPPED_LOCKED`

## Typical Cause

Another run currently holds the document lock.

## Immediate Actions

- Wait for current run to finish.
- Avoid repeated manual clicks during active run.
- If frequent, inspect trigger churn and run durations in System_Diagnostics.
- If persistent, temporarily disable auto-run and test manual flow.

## Escalation Package

Provide to developer:

- run ID
- outcome code and error code
- profile ID
- import signature
- fixture/file used
- screenshots of Home + Diagnostics rows

