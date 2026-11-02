# Simplicity

The measure is **how hard the change is to read, and how much harder it gets as the business domain grows**. Line count is not the measure: a three-line flag can cost more than a fifty-line explicit function.

## Purpose

Make the intended behavior change **visible**, and propose the simplest design that expresses it, scoped to this change.

## Lenses

1. **Readability.** Can a reader see what behavior changed without tracing flags, maps or layers in their head?
2. **Domain growth.** When the business adds case N+1 (a new partner, service type, status, region), how many places must change? Count them.
3. **Focus.** Is the design centered on the behavior the requirement asks for, or on a general mechanism the requirement does not need?

Complexity is justified only by the **current** requirement. "We might need it later" counts only when the requirement or an ADR says so.

## Smells

- **Flag argument**: a boolean or enum parameter that switches the function between behaviors (`createOrder(data, isBulky, skipPooling)`). Each flag hides a behavior; the next case adds another flag and multiplies valid/invalid combinations.
- **Repeated switch**: the same `if`/`switch` on a type or status in several places; case N+1 is shotgun surgery.
- **Generic remapping**: a mapper that turns A into B, C or D through config, a type switch or reflection, where the reader must run the mapper mentally to learn what happens to the data.
- **Speculative generality**: an interface with one implementation, a generic type with one use, options nobody sets, hooks with no caller.
- **Middle layer**: a wrapper, service or factory that only forwards.
- **Primitive for a concept**: a string or number standing in for a domain concept that deserves a name and a type.
- **Hidden intent**: a name that describes the mechanism (`processData`, `handleV2`) instead of the behavior.
- **Reinvented helper**: new code doing what an existing helper in the repo already does (search before claiming).

## Proposal order

Propose the lightest design that reveals intent. Prefer, in order:

1. Explicit functions named for each behavior (`createBulkyOrder`, `createStandardOrder`) sharing a private helper.
2. A domain type that names the concept and carries its rules.
3. Polymorphism (interface, strategy, table of handlers) only when several real cases exist **now**.

A proposal that swaps a flag for a strategy-plus-factory is a different complexity, not a simpler one. Every proposal must keep the same behavior and obey the rulebook, and must fit inside this change's scope (touch only code the diff already touches, or say clearly that it does not).

## Challenge format

```
Challenge S<n>: <short title>
Intended behavior: <what the requirement wants changed>
Hard to read:      <what the reader must trace; evidence file:line>
Growth cost:       <what case N+1 costs: places to edit, combos to reason about>
Proposal:          <the simpler design, sketch in a few lines of code>
Scope:             <fits this PR / needs a follow-up>
Question:          <what evidence would justify the current complexity>
```

Raise a challenge only when the proposal is clearly easier to read or clearly cheaper for case N+1. Raise none for taste alone.

## Answering a challenge

The implementer answers each challenge with:

- **accept**: simplify the code, or
- **defend**: cite evidence the complexity is needed **now** (a requirement line, an ADR, a real second caller at `file:line`). "Cleaner", "more flexible" or "future-proof" without evidence is not a defense; the challenge stays open.
