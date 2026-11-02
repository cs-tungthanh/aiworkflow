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
Mode: review | hunt | wip
Assignment: <e.g. "Units U1, U2, U5" or "all challenges">
```

Add nothing about how the code came to be, what the implementer intended, or what you think of it.

## Saving results

Save each persona's returned text verbatim to the workspace file the skill names (`intent.md`, `units.md`, `simplifier.md`, `verifier.md`). When several unit reviewers ran, concatenate their blocks into `units.md` in unit order.

When a persona returns something malformed or skips assigned items, send it back once with the missing items listed. Report any gap that remains in the final report rather than filling it yourself.
