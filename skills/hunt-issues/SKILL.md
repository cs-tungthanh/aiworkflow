---
name: hunt-issues
description: Summarize what a set of changes does, whether each change is needed, and hunt the issues it can cause. No requirement needed, no decision.
disable-model-invocation: true
---

# Hunt issues

Fetch a set of changes, explain what they do, question whether each is needed, and hunt the issues they can cause. Same clean room and personas as a full review, without the merge decision. You are the **orchestrator**: you gather, delegate, save, and assemble; every judgement comes from a persona (see `references/delegate.md`).

**Which changes.** The current branch against its base by default. The user may instead name a branch, a commit range (`a1b2c3..HEAD`), or "uncommitted" (WIP mode in `references/gather.md`).

**Opt-outs.** Run every step by default. Skip a step only when the user says so in words, and list skipped steps at the top of the report.

## 1. Gather

Follow `references/gather.md`. A requirement is optional here: use one when step 2 of gathering finds it without asking; otherwise record "no requirement" and move on without asking the user.

## 2. Intent

Delegate to `review-intent` (mode `hunt`, assignment "whole diff"). Save to `intent.md`.

## 3. Checkpoint

Show the user Purpose, Behavior map, New / Changed / Broken, the Needed? section, and the number of change units. Ask them to confirm or correct. Record corrections under `## Reviewer note` in `intent.md`.

## 4. Units and Simplifier, in parallel

- `review-unit` personas in batches of 3–5 units by area (at most 6 batches), mode `hunt`. Save to `units.md` in unit order.
- One `review-simplifier`, mode `hunt`. Save to `simplifier.md`.

Done when every change unit has a block in `units.md`.

## 5. Verify

Delegate to `review-verifier` (all ❌ and blocker ❓ findings, all challenges). Save to `verifier.md`.

## 6. Report

Write `report.md`, then show the user the top issues and the path.

```markdown
# Hunt: <head> → <base>

<one paragraph: what these changes do, in plain words>
Requirement: <source or "none">   Skipped: <steps or "none">

## What changed
<behavior map table + New / Changed / Broken + blast radius>

## Needed?
<changes without evidence of need: dead code, no-ops, duplicates>

## Issues
<confirmed and downgraded findings, ranked blocker → nit; each: F-id, unit, file:line, what can go wrong, suggestion>

## Open questions
<open ❓>

## Simplification challenges
<confirmed challenges>

## Checks
<pass/fail per command>

## Change units
| ID | Intent | Verdict |
Verifier rejected N findings.
```
