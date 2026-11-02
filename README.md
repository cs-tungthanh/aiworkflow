# ai-workflow

Personal review workflow for Claude Code, Codex and Cursor: a clean-room PR review, an issue hunt, and a simplicity check, each run by the same four read-only personas.

## Skills

| Skill | Claude Code / Cursor | Codex | What it does |
|---|---|---|---|
| `review-pr` | `/review-pr [branch]` | `$review-pr` | Review a branch against its requirement; recommend Merge / Request changes / Discuss |
| `hunt-issues` | `/hunt-issues [branch\|range\|uncommitted]` | `$hunt-issues` | Summarize changes, question whether each is needed, hunt issues; no decision |
| `simplify-check` | `/simplify-check` | `$simplify-check` | Run the Simplifier on work in progress |

All three are manual-only: they never trigger by themselves. Every step runs by default; say "skip simplifier", "no checks", "no checkpoint" or "skip verifier" to opt out.

## Flow

```
Orchestrator: gather (diff, requirement, rulebook, checks) → .scratch/reviews/<slug>/
   └─► Intent ─► checkpoint (you confirm purpose) ─┬─► Unit reviewers (N, parallel) ─┬─► Verifier ─► report.md
                                                  └─► Simplifier                    ─┘
```

- **Clean room**: the orchestrator only gathers and assembles. Every judgement comes from a persona that sees the workspace files and the repo, never the conversation that wrote the code.
- **Hand-off**: the fixer answers each finding id in `responses.md` (`fixed` / `accepted` / `defended: <evidence>`); the next run verifies those answers.

## Layout

```
rules/       source of truth: gather, delegate, change-checks, simplicity, risk
personas/    persona prompts; {{include rules/x.md}} is inlined at build time
skills/      SKILL.md per skill (portable Agent Skills format)
build.py     generates dist/ for each tool and installs it
dist/        generated, do not edit
```

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
