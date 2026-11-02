# Gather the review context

How an orchestrator builds the **workspace**: the set of files every persona reads instead of the conversation. Gathering is mechanical. Collect and record; leave every judgement to the personas.

## Workspace

`.scratch/reviews/<slug>/` in the reviewed repo, where `<slug>` is the head branch name with `/` replaced by `-` (or `wip-<date>` for uncommitted changes).

Before writing, run `git check-ignore -q .scratch/reviews`. When the folder is not ignored, tell the user and ask whether to add `.scratch/` to `.git/info/exclude` (local only) or keep going.

When the folder already holds a `report.md`, this is a **re-review**: move the old files into `round-<N>/` and keep `responses.md` beside the new run.

**Follow-up review**: the head fixes an earlier review that lives in another workspace (the user says so, or the earlier report is for a branch that is now merged and this branch's commits answer its ids). Create this branch's workspace, then copy from the earlier one: `report.md`, `intent.md`, `verifier.md` into `round-<N>/` (N = the earlier round number), and `responses.md` and `rulebook.md` beside the new run. The requirement for this round is built in step 2.

## 1. Pin the diff

- Head: the ref the user named, else the current branch. Run `git fetch` first when a remote exists.
- Base: the ref the user named, else the remote default branch (`git symbolic-ref refs/remotes/origin/HEAD`), else `main`, else `develop`.
- Already merged head (`git merge-base --is-ancestor <head> <base>` succeeds): the three-dot diff is empty, so use the merge commit's first parent as base (`git log --merges --ancestry-path <head>..<base> --format=%H | tail -1`, then `<merge>^1`), or the commit before a squash.
- Uncommitted mode (WIP): the diff is `git diff <base>...` plus `git diff HEAD` (staged and unstaged) plus untracked files from `git status --porcelain`.

Write:

- `diff.patch`: `git diff <base>...<head>` (three dots: compared against the merge-base, so other people's commits on base stay out).
- `commits.txt`: `git log --format='%h %an %s%n%b' <base>..<head>`.
- `files.txt`: `git diff --stat <base>...<head>`.

Stop with a clear message when a ref does not resolve (`git rev-parse --verify`) or the diff is empty.

## 2. Find the requirement

On a follow-up review, the requirement is the earlier review itself: list every F, Q and S id from `round-<N>/report.md` that the fix must resolve, every author decision (`decided:` lines in `responses.md`) it must implement, which ids were left open on purpose, and "keep all other behavior in `round-<N>/intent.md` unchanged". Skip the list below.

Otherwise, try in order, stop at the first hit:

1. A path or ticket key the user passed.
2. The repo's tracker setting: an `## Agent skills` or tracker section in `CLAUDE.md` / `AGENTS.md`, or `docs/agents/issue-tracker.md`. Follow what it says.
3. A ticket key in the branch name or commits (`ABC-123`): look for a local file matching it under `.scratch/`, `docs/`, `specs/`, `tickets/`; else fetch it from Jira when a Jira tool is available.
4. A local spec or ticket file whose name matches the branch slug or feature.
5. Ask the user. Before asking, check whether the diff itself edits a domain doc (`CONTEXT.md`, `GLOSSARY.md`, a spec under `docs/`); offer it as the stand-in, labelled as the implementer's stated intent rather than an independent requirement. When they say there is none, record "no requirement" and continue.

Write `requirement.md`: the full ticket text (body, acceptance criteria, comments), with its source path or key on the first line.

## 3. Build the rulebook

Read every file that says how code in this repo is written or where things may live:

- `CLAUDE.md`, `AGENTS.md`, `.cursor/rules/*`, at the root **and** in every directory on the path to each touched file.
- `CONTRIBUTING*`, `CODING_STANDARDS*`, `docs/adr/**`, `GLOSSARY.md` / `GLOSSARY-MAP.md`, architecture docs.
- Boundary rules enforced by tools:
  - TypeScript: eslint config (`no-restricted-imports`, `import/no-restricted-paths`, boundaries plugins), `.dependency-cruiser*`, `tsconfig` path aliases and project references.
  - Go: `internal/` package layout, `.golangci.*` (`depguard`, `gomodguard`), `go.mod` module splits.

Write `rulebook.md`: one entry per rule, each carrying its **source** (`file:line` or config key), grouped as **Boundaries**, **Style**, **Domain** (glossary terms, ADR decisions), **Process** (tests, migrations, flags). Quote rules; do not paraphrase them into something stricter. Skip what a linter already enforces unless it is a boundary rule.

## 4. Run the checks

The checks produce evidence; failing checks are facts for the personas, not a reason to stop.

- Run the checks on a **clean copy** of `<head>` whenever `<head>` is not the checked-out branch **or** the working tree has uncommitted changes (`git status --porcelain` is not empty): otherwise the user's WIP mixes into the results. Use a temporary worktree (`git worktree add --detach <tmp>/head <head>`, plus one for `<base>` when comparing failures), install dependencies there, and remove the worktrees after the review. Never check out over, stash or discard the user's work. Tell every persona the worktree paths so they read head and base code there. WIP mode is the exception: there the uncommitted changes are the subject, so check the working tree.
- TypeScript: run the package's `typecheck`/`lint`/`test` scripts from `package.json` (or `tsc --noEmit`) for the packages that own touched files. Use the repo's package manager (lockfile tells which).
- Go: `go build`, `go vet`, `go test` on the touched packages (`./path/to/pkg/...`), not the whole module unless it is small.
- Run anything over ~2 minutes in the background.

Write `checks.md`: each command, its exit code, and the failing output trimmed to the relevant lines. Mark which failures also happen on `<base>` when that is cheap to check (pre-existing vs introduced).
