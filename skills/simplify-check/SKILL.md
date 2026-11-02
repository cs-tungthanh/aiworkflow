---
name: simplify-check
description: "Run the Simplifier on work in progress: challenge flag arguments, generic mappers and speculative layers, and propose simpler designs before review."
disable-model-invocation: true
---

# Simplify check

Challenge complexity in the current work before it reaches review. You are the **orchestrator**: you gather, delegate, save, and show; the judgement comes from the `review-simplifier` persona in a clean room (see `references/delegate.md`), so it carries none of the reasoning that produced the code.

## 1. Gather

Follow `references/gather.md` in WIP mode (branch against base plus uncommitted changes), with two cuts: skip step 4 (checks), and use a requirement only when it is found without asking. Workspace slug: `wip-<branch>`.

## 2. Simplifier

Delegate to `review-simplifier` (mode `wip`, assignment "whole diff"). Save to `simplifier.md`.

## 3. Verify

When there is at least one challenge, delegate to `review-verifier` with assignment "all challenges in simplifier.md". Save to `verifier.md`.

## 4. Show

Show the user each **confirmed** challenge in the Challenge format, most valuable first, then the "Considered and kept" lines in one short list. When the user accepts a challenge and asks you to apply it, that is ordinary implementation work outside this skill.
