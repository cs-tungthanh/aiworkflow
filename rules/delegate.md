# Delegate to a persona

Every judgement in a review comes from a **persona** subagent that starts with a fresh context. The orchestrator (you) gathers, delegates, saves, and assembles. This is the **clean room**: even when this conversation wrote the code under review, nothing from it reaches a persona. A persona gets only the workspace path, its mode, and its assignment.

## Starting a persona

Personas: `review-intent`, `review-unit`, `review-simplifier`, `review-verifier`.

- **Claude Code**: Agent tool with `subagent_type` set to the persona name.
- **Codex**: ask to spawn the custom agent by name ("Spawn `review-unit` with this task: …"). Wait for all spawned agents before continuing.
- **Cursor**: delegate to the subagent by name (`/review-unit …` or "use the review-unit subagent").

When the named persona is not installed, start a generic subagent and make its prompt the full text of `personas/<name>.md` from this skill's folder, followed by the task.

## The task message

Give each persona exactly:

```
Workspace: <absolute path to .scratch/reviews/<slug>/>
Repo: <absolute repo path>   Head: <ref>   Base: <ref>
Head code: <worktree path, or "repo working tree">   Base code: <worktree path, or "use git show <base>:<file>">
Mode: review | hunt | wip
Assignment: <e.g. "Units U1, U2, U5" or "all challenges">
Output file: <workspace>/<file> (e.g. units-U1-U3.md)
```

Add nothing about how the code came to be, what the implementer intended, or what you think of it.

## Saving results

A persona writes its full output to its output file and returns only a short summary (verdict counts, top items). When a persona could not write (Cursor runs personas with `readonly`), it returns the full text instead; save that verbatim to the output file. Keep full reports out of your own context: read an output file only for the parts you need to assemble the report.

Output files: `intent.md`, `units-<first>-<last>.md` per unit batch, `simplifier.md`, `verifier.md`. After all unit batches finish, merge them into `units.md` in unit order (split on the `### U<n>:` headings with a short script; do not retype).

When a persona returns something malformed or skips assigned items, send it back once with the missing items listed. Report any gap that remains in the final report rather than filling it yourself.
