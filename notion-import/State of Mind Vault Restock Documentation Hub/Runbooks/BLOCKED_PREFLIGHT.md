# Runbook: BLOCKED_PREFLIGHT

> Reviewed: 2026-03-06 | Status: active | Script version: v2.2

Outcome code: `BLOCKED_PREFLIGHT`

## Typical Cause

Preflight detected profile/location coverage collapse or reserve path failure.

## Immediate Actions

- Check active profile on Home.
- Review System_Reference -> LocationProfileMap for missing reserve mappings.
- Review LocationReviewQueue for newly discovered locations.
- Update map, then rerun Run Daily Update.

## Escalation Package

Provide to developer:

- run ID
- outcome code and error code
- profile ID
- import signature
- fixture/file used
- screenshots of Home + Diagnostics rows

