# Stocking Rules Test Guide

> Reviewed: 2026-03-06 | Status: active | Script version: v2.2

This guide validates checklist threshold behavior after rule changes.

## Preconditions

- Raw CSV imported at `Treez Valuation (Raw)!A6`
- Active profile resolves correctly
- Location map coverage is valid

## Core Verification Flow

1. Edit rules in `Restock Settings`
2. Run `Restock -> Run Checklist Only`
3. Confirm `Restock List` count and urgency distribution
4. Confirm `Backstock Alerts` still reflects zero-reserve rows correctly
5. If rule behavior looks wrong, run `Restock -> Run System Check`

## Rule Matching Expectations

- More criteria = higher specificity
- Tie-break uses lower target value
- Default rule catches unmatched rows
- Rule logic affects checklist urgency and recommended pull outputs

## Regression Scenarios

- Default-only rule set
- Brand + type override
- Size-based override
- Inactive rule handling
- Mixed profile inputs (Albany and Latham fixtures)

## Acceptance Baselines

- Albany fixture remains near historical baseline unless rules intentionally changed
- Latham fixture remains near historical baseline unless rules intentionally changed
- No schema or preflight blocking events from rule edits alone

## Failure Triage

- `BLOCKED_SCHEMA`: header/config mismatch, not a rule math issue
- `BLOCKED_PREFLIGHT`: location/profile coverage issue
- `FAILED_STAGE_CHECKLIST`: inspect latest diagnostics stage details

