# Existing projects

Threadmark is designed to enter a repository that already has agent configuration.

## Discovery

Run:

```bash
threadmark scan
```

The scanner recognizes common root instructions and files under `.claude/`, `.codex/`, `.cursor/`, `.windsurf/`, and `.github/`. It lists paths, loading behavior, and estimated token cost without changing files.

## Initialization

Preview first:

```bash
threadmark init --dry-run
```

Initialization:

- creates only missing files under `.threadmark/`;
- preserves existing Threadmark documents;
- adds or refreshes only managed adapter blocks;
- writes a local catalog to `.threadmark/generated/`;
- does not copy provider-specific instructions into shared memory.

## Handling existing context

Keep provider-specific behavior where it already works. Move guidance into shared context only when it is:

- useful to more than one agent;
- not already enforced by code or tooling;
- current and verified;
- short enough to justify its token cost.

If `AGENTS.md` and `CLAUDE.md` contain conflicting instructions, resolve them manually. Threadmark reports boundaries and possible cost; it does not choose a winner.

## Large native instruction files

Threadmark cannot prevent Claude Code or Codex from loading an existing large native instruction file. `threadmark doctor` reports large auto-loaded files but never rewrites them.

Refactor those files only after reviewing which content is:

- always required;
- task-specific;
- duplicated;
- obsolete;
- enforced elsewhere.

## Removal

Preview:

```bash
threadmark uninstall --dry-run
```

Apply:

```bash
threadmark uninstall
```

This removes only managed adapter blocks. `.threadmark/` remains so project memory is never deleted automatically.
