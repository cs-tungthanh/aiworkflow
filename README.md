# ai-workflow

Personal review workflow for Claude Code, Codex and Cursor: a clean-room PR review, an issue hunt, and a simplicity check, each run by the same four read-only personas.

## Skills

| Skill | Claude Code / Cursor | Codex | What it does |
|---|---|---|---|
| `review-pr` | `/review-pr [branch]` | `$review-pr` | Review a branch against its requirement; recommend Merge / Request changes / Discuss |
| `hunt-issues` | `/hunt-issues [branch\|range\|uncommitted]` | `$hunt-issues` | Summarize changes, question whether each is needed, hunt issues; no decision |
| `simplify-check` | `/simplify-check` | `$simplify-check` | Run the Simplifier on work in progress |
| `chatgpt-web` | `/chatgpt-web`, or the agent picks it up | `$chatgpt-web` | Get a second opinion from ChatGPT web through `mcp/chatgpt-web`, or set that server up in a project |
| `chatgpt-review-plan` | `/chatgpt-review-plan <plan file> [goal]` | `$chatgpt-review-plan` | One subagent (`chatgpt-plan-reviewer`) sends the plan and goal to ChatGPT web, checks each point against the repo, and reports; you decide what changes. Rerun on the revised plan for round 2 in the same chat |

The three review skills are manual-only: they never trigger by themselves. Every step runs by default; say "skip simplifier", "no checks", "no checkpoint" or "skip verifier" to opt out.

## Flow

```
Orchestrator: gather (diff, requirement, rulebook, checks) → .scratch/reviews/<slug>/
   └─► Intent ─► checkpoint (you confirm purpose) ─┬─► Unit reviewers (N, parallel) ─┬─► Verifier ─► report.md
                                                  └─► Simplifier                    ─┘
```

- **Clean room**: the orchestrator only gathers and assembles. Every judgement comes from a persona that sees the workspace files and the repo, never the conversation that wrote the code.
- **Hand-off**: `responses.md` records an answer per id: `decided` for the author, `fixed` / `accepted` / `defended: <evidence>` for the implementer, `open` otherwise (`rules/responses.md`). The next run verifies them. A branch that fixes an earlier review gets a follow-up review that carries the earlier round over.
- **Manual test plan**: each report ends with checks built from the behavior map, findings, and claims tagged `needs runtime check`.

## Layout

```
rules/       source of truth: gather, delegate, responses, change-checks, simplicity, risk
personas/    persona prompts; {{include rules/x.md}} is inlined at build time
skills/      SKILL.md per skill (portable Agent Skills format)
build.py     generates dist/ for each tool and installs it
dist/        generated, do not edit
mcp/         standalone MCP servers, installed by hand (see each one's README)
```

`mcp/chatgpt-web` lets an agent get a second-opinion review from ChatGPT web, using your logged-in Chrome rather than the API. The `chatgpt-web` skill tells an agent how to set it up in a project and use it. `build.py` fills in the skill's `{{ai_workflow_root}}` with the checkout's path, so run `./build.py install` from the main checkout, not from a worktree.

## Install

```bash
./build.py install
```

Re-run after any edit. `./build.py install --dry-run` shows what it would write; `./build.py uninstall` removes only what it installed (it refuses to overwrite files it did not create).

| Tool | Skills | Personas |
|---|---|---|
| Claude Code | `~/.claude/skills/` | `~/.claude/agents/*.md` (tools: Read, Grep, Glob, Bash) |
| Codex | `~/.agents/skills/` (+ `agents/openai.yaml`) | `~/.codex/agents/*.toml` (`developer_instructions`) |
| Cursor | reads both skill folders above | `~/.cursor/agents/*.md` (`readonly: true`, wins over the Claude copy) |

Known gap: Cursor loads skills from both `~/.claude/skills` and `~/.agents/skills`, so it may list each skill twice. Codex cannot set a read-only sandbox per agent; its personas inherit the parent's sandbox and rely on their instructions not to edit.
