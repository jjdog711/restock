---
audience: all
owner: Xylent Studios + State of Mind Leadership
last-reviewed: 2026-03-06
script-version: v2.1
status: active
---

# Documentation Ownership and Review Cadence

## Ownership Matrix

- Staff docs (`docs/users`): State of Mind Operations owner, Xylent reviewer
- Manager/admin docs (`docs/managers`, `docs/admins`): joint ownership
- Developer/agent docs (`docs/developers`, `docs/agents`, `docs/standards`): Xylent owner
- Runbooks (`docs/runbooks`): manager owner, Xylent reviewer
- Reference data (`docs/reference/test-data`): Xylent owner

## Review Cadence

- Staff docs: monthly
- Manager/admin docs: each release
- Developer/agent docs: each release
- Runbooks: after each incident touching that outcome class
- Fixture manifest: when new fixture or baseline changes

## Change Control

1. Run docs quality check script
2. Update `last-reviewed` in touched docs
3. Update `docs/changelog.md` for meaningful changes
4. Keep compatibility stubs for two major releases

## Escalation

- Operational accuracy issue: State of Mind management first
- System behavior or contract issue: Xylent engineering
- Compliance interpretation issue: manager + compliance lead

---
_State of Mind Vault Restock System | Built by Xylent Studios | Steward: Justin Michalke | Script v2.1 | Last reviewed: 2026-03-06_
