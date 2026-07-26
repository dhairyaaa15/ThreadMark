# Architecture

Threadmark is a repository sidecar, not an agent replacement.

## Layers

### Native adapters

Root `AGENTS.md` and `CLAUDE.md` contain small marker-owned blocks. Codex receives an instruction to read the kernel. Claude Code imports the kernel directly.

Everything outside the markers remains user-owned.

### Shared kernel

`.threadmark/kernel.md` is the always-on context. Its default budget is 350 tokens. It contains invariants, boundaries, routing instructions, and handoff behavior.

### Context index

`.threadmark/index.md` is a small router. It points to deeper sources without loading them all.

### Durable sources

Context, domains, decisions, runbooks, and lessons are plain Markdown with metadata. They are selected by path, tags, task terms, status, and freshness.

### Branch handoffs

A handoff records objective, confirmed state, next actions, changed paths, verification, and blockers. It is loaded only when:

- its branch matches the current branch;
- its status is active;
- it has not expired;
- its base commit is still an ancestor of the current work.

### Generated and local state

`.threadmark/generated/` contains disposable catalogs and context packets. `.threadmark/local/` is for machine-specific notes. Both are ignored by Git and excluded from normal loading.

## Read flow

```text
Native instruction
  -> kernel
  -> index when needed
  -> matching handoff
  -> at most three relevant deep documents
  -> repository evidence
```

## Write flow

```text
Session observation
  -> branch handoff
  -> candidate lesson or decision
  -> verification
  -> human-reviewable Markdown change
```

Threadmark does not automatically promote observations into durable rules.

## Selection order

The deterministic router prefers:

1. exact file path;
2. matching path pattern;
3. matching tags and task terms;
4. newer metadata as a tie-breaker.

V1 does not use embeddings or an LLM to choose context.
