# Safety

Project instruction files can influence tools, commands, and data access. Treat changes to them like code changes.

## Ownership

Threadmark may write:

- missing files under `.threadmark/`;
- text between Threadmark markers in root `AGENTS.md`;
- text between Threadmark markers in root `CLAUDE.md`;
- disposable files under `.threadmark/generated/`;
- a branch handoff when explicitly requested.

Threadmark does not write:

- `.claude/`;
- `.codex/`;
- user-level or global agent configuration;
- hooks or MCP configuration;
- files outside the selected project.

## Safe defaults

- `scan` and `doctor` are read-only.
- `init --dry-run` previews actions.
- initialization creates missing templates and keeps existing ones.
- malformed or duplicated markers stop the operation.
- initialization refuses to write through symbolic links.
- uninstall removes managed blocks but keeps project memory.
- no transcript is captured.
- no repository content is sent over the network.

## Trust

Review changes before committing. Do not place secrets in shared context. Verify commands before recording them in a runbook or commands document.

When cloning an unfamiliar repository, inspect `AGENTS.md`, `CLAUDE.md`, `.threadmark/`, hooks, and MCP configuration before allowing an agent to execute commands.
