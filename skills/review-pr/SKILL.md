---
name: review-pr
description: Clean-room review of a branch or PR against its requirement, ending in a merge / request changes / discuss recommendation.
disable-model-invocation: true
---

# Review PR

Review the changes on a branch against the requirement they implement, through four personas, and recommend a decision. You are the **orchestrator**: you gather, delegate, save, and assemble. Every judgement comes from a persona (see `references/delegate.md`, the clean room). The decision itself stays with the user; you recommend and never post comments or merge.

**Opt-outs.** Run every step by default. Skip a step only when the user says so in words ("skip simplifier", "no checks", "no checkpoint", "skip verifier"), and list skipped steps at the top of the report.

## 1. Gather

Follow `references/gather.md` to pin the diff, find the requirement, build the rulebook, and run the checks. Done when the workspace holds `diff.patch`, `commits.txt`, `files.txt`, `requirement.md`, `rulebook.md`, `checks.md`.

## 2. Intent

Delegate to `review-intent` (mode `review`, assignment "whole diff"). Save to `intent.md`.

## 3. Checkpoint

Show the user, from `intent.md`: Purpose, Behavior map, New / Changed / Broken, the Scope table, and the number of change units. Ask them to confirm or correct. Record any correction under a `## Reviewer note` heading at the end of `intent.md`, then continue.

## 4. Units and Simplifier, in parallel

Start these together:

- `review-unit` personas: group the change units by area into batches of 3–5 units (at most 6 batches; make batches bigger before adding a seventh). One persona per batch. Save all their blocks to `units.md` in unit order.
- One `review-simplifier` (assignment "all change units"). Save to `simplifier.md`.

Done when every change unit in `intent.md` has a block in `units.md`.

## 5. Verify

Delegate to `review-verifier` (assignment "all ❌ and blocker ❓ findings, all challenges", plus "earlier round" on a re-review). Save to `verifier.md`.

## 6. Decide and report

Apply this rule mechanically, using only **confirmed** or **downgraded** findings from `verifier.md`:

- **Request changes**: any blocker or major finding, any requirement item **missing**, or any **Broken** contract that the requirement does not ask for.
- **Discuss**: otherwise, any open ❓, any confirmed challenge, any **not asked** behavior, or any earlier-round item still **open**.
- **Merge**: none of the above.

Write `report.md` with the template below, then show the user the decision line, the blocking list, and the path to `report.md`.

```markdown
# Review: <head> → <base>

**Recommendation: <Merge | Request changes | Discuss>**: <one line: the main reason>
Requirement: <source>   Skipped: <steps or "none">   Round: <N>

## Purpose
## Behavior change
<behavior map table + New / Changed / Broken + blast radius, from intent.md>

## Scope
<scope table, not asked, done-but-wrong>

## Checks
<pass/fail per command; introduced vs pre-existing>

## Blocking
<F-ids: blocker and major findings, each: unit, file:line, what, suggestion>

## Non-blocking
<F-ids: minor and nit findings>

## Questions for the author
<Q-ids: open ❓>

## Simplification challenges
<S-ids: confirmed challenges, in the Challenge format>

## Change units
| ID | Intent | Verdict |

## Earlier round      (re-review only)

## Draft review comments
<one per finding, question and challenge: `file:line`, then the comment text, written as a colleague's question or request>

---
Responding: answer each F/Q/S id in `responses.md` in this folder as
`<id>: fixed | accepted | defended: <evidence file:line or requirement line>`.
A defense without evidence stays open. Then run the review again.
```

Rejected findings go nowhere in the report except a count line under Change units ("Verifier rejected N findings").
