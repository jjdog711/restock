# Cutover Brief Script

> Reviewed: 2026-03-06 | Status: active | Script version: v2.2

## Use This Page

Read this first before speaking with the inventory manager and staff.

## 3-5 Minute Talk Track

Team, we are now using the Vault Restock System as our daily operating path.

Why now: our manual process is slower, less consistent, and harder to audit when data quality issues happen. This system gives us faster triage, consistent risk visibility, and explicit failure states.

What does not change: manager authority stays in place. The system recommends; management decides execution priority, overrides when needed, and escalation direction.

What changes today: after import, we run one action (`Run Daily Update`) and use three outputs in order: `Backstock Alerts`, `Restock List`, and `Compliance Alerts`.

How trust works: decisions are based on current inventory, profile/location mappings, and documented rules. If that context is unhealthy, the system blocks instead of silently pushing bad output.

When something looks wrong: do not guess. Open diagnostics, match the run outcome to runbooks, and escalate through manager workflow.

Bottom line: this reduces avoidable manual effort while keeping leadership control and making exceptions easier to see and resolve.

## Close

Questions and objections are expected. Route them through [Manager FAQ](FAQ.md) and [Start Here](Start Here.md).

