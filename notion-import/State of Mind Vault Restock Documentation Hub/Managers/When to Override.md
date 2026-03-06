# When to Override

> Reviewed: 2026-03-06 | Status: active | Script version: v2.2

## Use This Page

Read this after How Decisions Are Made. Use it as your action boundary.

## Override Is Appropriate When

1. Business reality changed but configuration has not.
2. A location is new and not yet mapped.
3. A known data-quality issue exists in the imported valuation.
4. Product priority must change for operational reasons.
5. A compliance flag needs immediate manual routing before config updates.

## Safe Manager Actions

- Re-prioritize execution order for the current shift.
- Update `LocationProfileMap` for confirmed new locations.
- Re-run `Run Daily Update` after config corrections.
- Use `Run System Check` to confirm schema/config health.
- Use runbooks for `BLOCKED_*` and `FAILED_*` outcomes.

## Do Not Override This Way

- Do not edit hidden engine output rows manually.
- Do not bypass a guardrail block by forcing staff to use stale outputs.
- Do not remap uncertain locations without confirming physical reality.

## Escalate Immediately When

- Run outcome is `BLOCKED_SCHEMA` and source/alias mismatch is unclear.
- Repeated `SKIPPED_LOCKED` or `FAILED_*` persists after one clean rerun.
- Compliance flags spike unexpectedly without known import differences.

## Escalation Locations

- Manager workflow: [Start Here](Start Here.md)
- Failure handling: [Runbooks](../Runbooks/Runbooks Index.md)
- Detailed controls: [Operations Guide](Operations Guide.md)

