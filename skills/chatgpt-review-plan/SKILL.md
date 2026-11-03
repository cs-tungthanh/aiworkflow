---
name: chatgpt-review-plan
description: "Get ChatGPT web's second opinion on a plan file, checked against the repo by one subagent; you decide what changes."
disable-model-invocation: true
---

# ChatGPT review plan

Usage: `/chatgpt-review-plan <plan file> [goal]`.

Sends a plan to ChatGPT web for a **second opinion** and brings back only the points a checker confirmed against the repository. You are the **orchestrator**: you build the workspace, delegate to the `chatgpt-plan-reviewer` persona, and show its report. The persona talks to ChatGPT and judges; you pass it files, never your opinion of the plan. ChatGPT gets the plan and the goal only, no source code.

## 1. Preflight

- The plan file is the path the user gave. Stop and ask for one when there is none or it does not exist.
- The `chatgpt_ask` tool must be in this session (the persona uses this session's MCP servers). When it is not, stop and point the user to the `chatgpt-web` skill to set it up.

## 2. Workspace

`.scratch/plan-reviews/<slug>/` in the repo root, where `<slug>` is the plan file's name without its extension. When `git check-ignore -q .scratch/plan-reviews` fails, ask whether to add `.scratch/` to `.git/info/exclude` (local only) or keep going.

Round `N` is one more than the number of `chatgpt-r*.md` files already there (rounds ChatGPT answered), so a run that stopped on a block is redone under the same number.

- **Plan.** Copy the plan file to `plan-r<N>.md` with `cp`.
- **Goal.** Round 1: write `goal.md`, one paragraph: what the plan is for and the constraints it must respect. Take it from the user's goal argument, else from what the user asked for in this conversation, else from the plan's own goal section. State the goal only, nothing about the plan's quality. Later rounds keep `goal.md` unless the user gives a new goal.

## 3. Delegate

Start `chatgpt-plan-reviewer` (Claude Code: Agent tool with that `subagent_type`; Codex: spawn the custom agent by name). When it is not installed, start a generic subagent whose prompt is the full text of `personas/chatgpt-plan-reviewer.md` from this skill's folder, followed by the task. The task is exactly:

```
Workspace: <absolute workspace path>
Repo: <absolute repo root>
Round: <N>
Plan: <workspace>/plan-r<N>.md
Goal: <workspace>/goal.md
Output file: <workspace>/review-r<N>.md
```

## 4. Show

Read `review-r<N>.md` and show, in this order:

1. Points that **hold** or **partly** hold, each with its proposed plan change.
2. **Needs you** points, as questions.
3. **Missed by ChatGPT** points.
4. One line listing the IDs that do not hold.
5. From round 2, the earlier points still **open**.

When the persona stopped on a block (Chrome, login, verification check, usage limit), show its reason and what the user needs to do instead.

End by asking which changes to apply. Applying them is ordinary editing of the plan file. Running the command again on the revised plan is round `N+1`, in the same ChatGPT chat.
