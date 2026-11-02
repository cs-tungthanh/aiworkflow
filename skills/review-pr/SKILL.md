---
name: review-pr
description: Clean-room review of a branch or PR against its requirement, ending in a merge / request changes / discuss recommendation.
disable-model-invocation: true
---

# Review PR

Review the changes on a branch against the requirement they implement, through four personas, and recommend a decision. You are the **orchestrator**: you gather, delegate, save, and assemble. Every judgement comes from a persona (see `references/delegate.md`, the clean room). The decision itself stays with the user; you recommend and never post comments or merge.

**Opt-outs.** Run every step by default. Skip a step only when the user says so in words ("skip simplifier", "no checks", "no checkpoint", "skip verifier"), and list skipped steps at the top of the report.

## 1. Gather

Follow `references/gather.md` to pin the diff, find the requirement, build the rulebook, and run the checks. When this branch fixes an earlier review (a re-review, or a **follow-up review** on a new branch), gathering also carries the earlier round over. Done when the workspace holds `diff.patch`, `commits.txt`, `files.txt`, `requirement.md`, `rulebook.md`, `checks.md`.

## 2. Intent

Delegate to `review-intent` (mode `review`, assignment "whole diff", output file `intent.md`).

## 3. Checkpoint

Show the user, from `intent.md`: Purpose, Behavior map, New / Changed / Broken, the Scope table, and the number of change units. Ask them to confirm or correct. Record any correction under a `## Reviewer note` heading at the end of `intent.md`, then continue.

## 4. Units and Simplifier, in parallel

Start these together:

- `review-unit` personas: group the change units by area into batches of 3–5 units (at most 6 batches; make batches bigger before adding a seventh). One persona per batch, each with its own output file; merge them into `units.md` (see `references/delegate.md`).
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

Build the **Manual test plan** mechanically: one check per New and Changed behavior in `intent.md`, one per finding or question, and one per claim a persona tagged `needs runtime check`. Each check says what to do and what should happen.

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
<Q-ids: open ❓, one question per id>

## Simplification challenges
<S-ids: confirmed challenges, in the Challenge format>

## Change units
| ID | Intent | Verdict |

## Earlier round      (re-review only)

## Needs runtime check
<claims personas tagged `needs runtime check`, each with its unit and why the code alone can't settle it>

## Manual test plan
<numbered checks: action → expected result; grouped by area>

## Draft review comments
<one per finding, question and challenge: `file:line`, then the comment text, written as a colleague's question or request>

---
Responding: record an answer for every F/Q/S id in `responses.md` in this folder, using the statuses in `references/responses.md` (`decided` for the author; `fixed`, `accepted`, `defended` for the implementer; `open` otherwise). A defense without evidence stays open. Claims under "Needs runtime check" are unverified: confirm them before documenting or relying on them. Then run the review again.
```

Rejected findings go nowhere in the report except a count line under Change units ("Verifier rejected N findings").

## 7. Record the author's answers

When the user answers questions from the report in the conversation, write each answer to `responses.md` as a `decided` line for that id only, with the date, in their words (`references/responses.md`). Ids they did not answer stay `open`, even when you recommended something.
