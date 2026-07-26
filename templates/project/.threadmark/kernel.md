# {{PROJECT_NAME}} project kernel

Threadmark is the shared context layer for this project.

## Working rules

- Treat the repository, tests, and current configuration as primary evidence.
- Before substantial work, read `.threadmark/index.md` and select only relevant sources.
- Load no more than three deep context documents unless the task clearly requires more.
- Use only the active handoff for the current Git branch. Ignore expired or mismatched handoffs.
- Update the branch handoff after a meaningful verified milestone or before switching agents.
- Promote a lesson or decision only after verifying it against code, tests, or reviewed evidence.

## Boundaries

- Do not copy or rewrite existing `.claude/`, `.codex/`, or other provider configuration.
- Report conflicting instructions instead of silently resolving them.
- Do not load `.threadmark/local/` or `.threadmark/generated/` unless the task explicitly needs them.
