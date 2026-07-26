# Quick start

## 1. Preview the project

```bash
threadmark scan
threadmark init --dry-run
```

`scan` is read-only. The initialization preview lists every file that would be created, kept, or updated.

## 2. Initialize

```bash
threadmark init
```

Threadmark creates missing files under `.threadmark/` and adds one managed block to `AGENTS.md` and `CLAUDE.md`. Running the command again is safe and does not overwrite project memory.

Use `--no-adapters` if you want the files without automatic agent loading:

```bash
threadmark init --no-adapters
```

## 3. Add verified context

Start with:

- `kernel.md`: project identity, invariants, and boundaries;
- `context/commands.md`: commands you have run successfully;
- `context/architecture.md`: boundaries that are difficult to infer from code.

Keep unused documents in `status: draft`. Set `status: active` only after checking the content.

## 4. Validate

```bash
threadmark doctor
```

Fix errors before relying on automatic loading. Warnings identify token cost, stale handoffs, missing metadata, or adapters that are not installed.

## 5. Use normal prompts

Start Claude Code or Codex normally. Their native project instructions load Threadmark's small kernel. For substantial work, the kernel routes the agent to the relevant documents and current branch handoff.
