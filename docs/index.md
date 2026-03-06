---
audience: all
owner: Xylent Studios
last-reviewed: 2026-03-06
script-version: v2.2
status: active
---

# State of Mind Vault Restock Documentation Hub

Use this page as the only documentation entrypoint.

## Local Use

- Recommended: open the `docs` folder in Obsidian for day-to-day use.
- Start at `index.md`.
- Use `Quick Start`, `Start Here`, or `Runbooks` based on your role and situation.
- Any Markdown app works; Obsidian is simply the lowest-friction local option.

Runtime note: after `Run Daily Update`, the workbook opens `Compliance Alerts` when issues exist, otherwise `Restock List`.

## Start by Role

- Staff: [Quick Start](users/quick-start.md) for the daily workflow, [User Manual](users/user-manual.md) for full operating guidance, [Quick Reference Card](users/quick-reference-card.md) for station use
- Managers: [Start Here (Read This First)](managers/start-here.md), [How Decisions Are Made](managers/how-decisions-are-made.md), [When to Override](managers/when-to-override.md), [Operations Guide (Optional Deep Dive)](managers/operations-guide.md), [Runbooks](runbooks/index.md)
- Admins: [Deployment Guide](admins/deployment-guide.md), [Operations Guide](managers/operations-guide.md)
- Developers: [Architecture](developers/architecture.md), [Code Map](developers/code-map.md), [Stocking Rules Test Guide](developers/stocking-rules-test-guide.md)
- AI Agents: [Agent Quickstart](agents/agent-quickstart.md), [Architecture](developers/architecture.md), [Documentation Standards](standards/style-guide.md)

## If Something Failed

- Staff: stop and escalate to [Manager Start Here](managers/start-here.md).
- Managers and admins: match the exact `Run_Journal.outcome` in [Runbooks](runbooks/index.md).
- Developers and AI agents: confirm contracts in [Architecture](developers/architecture.md) and [Code Map](developers/code-map.md), then use [Runbooks](runbooks/index.md) and [Reference Index](reference/index.md).

## Reference and Data

- [Reference Index](reference/index.md)
- [Fixture Test Data](reference/test-data/README.md)
- [Changelog](changelog.md)
- [Future Features Backlog](product/future-features-backlog.md)

## Compatibility Aliases

Legacy top-level doc paths remain as redirect stubs for two major releases:

- `docs/QUICK_START.md`
- `docs/USER_MANUAL.md`
- `docs/VAULT_QUICK_REFERENCE_CARD.md`
- `docs/apps_script_deployment_guide.md`
- `docs/STOCKING_RULES_TEST_GUIDE.md`
- `docs/future_features_backlog.md`
- `docs/reference/README.md`

---
_State of Mind Vault Restock System | Built by Xylent Studios | Steward: Justin Michalke | Script v2.2 | Last reviewed: 2026-03-06_
