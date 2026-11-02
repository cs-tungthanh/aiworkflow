# Change checks

How to judge one **change unit**: a group of hunks that changed for one reason. A line is too small to judge alone; a unit carries one intent.

## Evidence standard

Every claim cites evidence: `file:line` in the head code, a hunk in `diff.patch`, a line in `requirement.md` or `rulebook.md`, a result in `checks.md`, or `git blame`/`git log` output. A check that has no evidence yet is not done: investigate (read callers, read tests, trace the data, `git blame` the old line) until it has evidence or is honestly **unknown**. A guess is never a verdict.

Some claims depend on behavior the code alone cannot show: what a browser, a third-party page, the OS, a device or another service does at runtime (for example "a click on this overlay no longer reaches the player"). Tag each such claim `needs runtime check` and say what would confirm it. Never state it as fact.

The PR description, commit messages and code comments are the implementer's **claims**. Use them as leads, then confirm them in the requirement or the code.

## 1. Why

State why this unit changed, in one sentence, and cite the source that justifies it:

- a requirement line,
- a bug the old code had (show the old behavior),
- a rule in the rulebook,
- a mechanical consequence of another unit (name that unit).

When no source justifies the unit, that is itself a finding: "no reason found, ask the author".

## 2. The four checks

Run all four on every unit.

1. **Style fit.** Does the unit solve its problem the way this codebase already solves the same problem? Find one existing example of the pattern (error handling, logging, config access, DB access, naming) and compare. A documented rulebook entry beats the existing example; the existing example beats general taste.
2. **Boundary.** Does the unit import, call or place logic across a line the rulebook draws (layer, module, package, service ownership, `internal/`)? Does it break a domain rule or ADR decision? Cite the rule.
3. **Root cause or symptom.** Does the unit fix the cause, or patch the place where the symptom showed up? Trace one step upstream: where does the bad value or state come from? Patterns of a **symptom patch**: a nil/undefined guard at the crash site while the producer still emits nil; a retry around a call that fails deterministically; a special case for one ID, partner or input; catching and swallowing an error; a sleep or timeout bump.
4. **Too narrow.** Does the unit hard-code a case that the general path should handle, or copy logic that already exists elsewhere, so the next similar case needs another patch? (Too *broad*, meaning over-engineered, belongs to the Simplifier, not here.)

## 3. Verdict

- ✅ **legit**: the why has a source and all four checks pass with evidence.
- ❓ **question**: a check is unknown after investigating, or the why has no source. Phrase the question the author must answer.
- ❌ **change needed**: a check fails with evidence.

Severity, for ❓ and ❌:

- **blocker**: wrong behavior for a requirement, data loss or corruption, security hole, contract break nobody asked for, violation of a documented boundary rule.
- **major**: symptom patch, missing test for new or changed behavior, violation of a documented style rule, too-narrow fix that will need repeating.
- **minor**: inconsistency with the existing pattern that no rule documents.
- **nit**: naming, wording. Report nits only when they hide intent.
