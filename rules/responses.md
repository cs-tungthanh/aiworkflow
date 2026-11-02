# Responses

`responses.md` in the review workspace records the answers to a report's F, Q and S ids, so the next round can check each one. One line per id:

```
<id>: <status>: <detail>
```

## Statuses

Two people answer, and each has their own statuses.

**The author** (the user deciding what the code should do) answers questions:

- **decided**: the author's decision, in their words, with the date. Record it only from what the author actually said about that id. A recommendation they did not reply to, silence, or an answer about other ids is not a decision.

**The implementer** (whoever fixes the code) answers findings, challenges and decided questions:

- **fixed**: the code changed; name the file and function.
- **accepted**: a simplification challenge was applied.
- **defended**: the code stays as it is; cite evidence it is needed now (a requirement line, an ADR, a caller at `file:line`, a `decided` line). Without evidence it stays open.

**Either**:

- **open**: not answered yet, or left on purpose (say which). Write unanswered ids as `open` rather than leaving them out.

## Rules

- One question per id. A report that needs two answers gives them two ids.
- The orchestrator writes `decided` lines when the author answers in the conversation; the implementer writes `fixed`, `accepted` and `defended` lines.
- Append each round under its own heading (`## Round <N>`); never rewrite an earlier round's lines.

## Ruling on an earlier round

The verifier rules each earlier id:

- **resolved**: `fixed` or `accepted`, and the new code shows it; or `decided`, and the new code does what was decided.
- **defended**: `defended`, and the evidence holds.
- **open**: `open`, a defense without evidence, or a claimed fix the code does not show.

Then it checks whether any fix broke behavior that passed in the earlier round.
