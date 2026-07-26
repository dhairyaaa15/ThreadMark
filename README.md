# Threadmark

<p align="center">
  <img src="assets/threadmark-hero.png" alt="A hand-drawn thread carrying project context from Claude through the .threadmark folder to Codex" width="100%">
</p>

<p align="center">
  <strong>Shared project context for Claude Code and Codex.</strong><br>
  Switch agents without re-explaining the repository.
</p>

<p align="center">
  Local-first | Markdown-native | Zero dependencies | No daemon
</p>

Threadmark keeps the useful parts of project memory beside the code: architecture, commands, conventions, decisions, verified lessons, and the current branch handoff. Each agent receives a small bootstrap and loads deeper context only when the task needs it.

## The problem

An agent can perform well in a project it already knows, then feel completely new after you switch tools or start another session.

| Without Threadmark | With Threadmark |
| --- | --- |
| Context stays inside one agent | Context travels with the repository |
| The same setup is explained again | New sessions receive a small bootstrap |
| Large instruction files consume every session | Deeper documents are routed by task and path |
| Current work disappears between sessions | Branch handoffs preserve verified state |
| Shared rules get copied between providers | Existing provider configuration stays in place |

## Start in a minute

Threadmark requires Node.js 20 or newer. Git is recommended.

From your Threadmark clone:

```bash
npm link
```

From the root of an existing project:

```bash
threadmark scan
threadmark init --dry-run
threadmark init
threadmark doctor
```

Then edit `.threadmark/kernel.md` and activate only the context documents you have verified.

That is the complete setup. New Claude Code and Codex sessions receive the Threadmark bootstrap through their native project instruction files. You do not need to ask the agent to load context in every prompt.

## How it works

```text
AGENTS.md  --\
             +--> kernel --> context index --> relevant documents
CLAUDE.md  --/                           \--> current branch handoff
```

The default context limits are intentionally small:

| Layer | Default |
| --- | ---: |
| Native adapter | about 50 tokens |
| Shared kernel | 350 tokens |
| Context index | 300 tokens |
| Active handoff | up to 500 tokens |
| Generated task packet | 1,200 tokens |
| Deep documents | at most 3 |

Routing is deterministic. Threadmark prefers exact paths, matching path patterns, task terms, tags, and newer verified metadata. V1 does not use embeddings or another model to choose context.

## It respects the setup you already have

Threadmark owns:

```text
.threadmark/
```

It manages only the text between these markers in root `AGENTS.md` and `CLAUDE.md`:

```text
<!-- threadmark:managed-start -->
...
<!-- threadmark:managed-end -->
```

It does not modify:

- `.claude/`;
- `.codex/`;
- global agent configuration;
- hooks or MCP settings;
- existing text outside its markers.

`scan` and `doctor` are read-only. `init --dry-run` shows the complete plan. Running `init` again keeps existing Threadmark documents. `uninstall` removes the managed adapters and leaves project memory intact.

## Daily flow

Create a handoff when branch work becomes substantial:

```bash
threadmark handoff create --objective "Add refresh-token rotation"
```

Show the current handoff:

```bash
threadmark handoff show
```

Build an optional task-specific packet:

```bash
threadmark context "change authentication middleware" --path src/auth/middleware.ts
```

Check context health:

```bash
threadmark doctor
```

Complete the handoff when the work is done:

```bash
threadmark handoff complete
```

## Project memory

```text
.threadmark/
  threadmark.yaml       context budgets and behavior
  kernel.md             always-on project rules
  index.md              routes agents to deeper context
  context/              architecture, commands, conventions, security
  domains/              area-specific knowledge
  decisions/            accepted technical choices
  runbooks/             verified procedures
  lessons/              verified failure patterns
  handoffs/             branch-specific work state
  local/                machine-only notes, ignored by Git
  generated/            disposable output, ignored by Git
```

Shared memory is plain Markdown, so it can be reviewed, corrected, versioned, and removed like code.

## What belongs in memory

Store information that is difficult to infer, likely to matter again, and supported by evidence.

- Temporary progress belongs in a handoff.
- Stable technical choices belong in decisions.
- Repeatable procedures belong in runbooks.
- Confirmed failure patterns belong in lessons.
- Rules already enforced by code, schemas, formatters, or linters do not need to be repeated.

## Honest limits

Threadmark does not capture transcripts, run a background service, maintain a vector database, or silently learn from every message. It cannot reduce the cost of large existing `AGENTS.md` or `CLAUDE.md` files unless you choose to refactor them.

The first version favors context that is compact, inspectable, and hard to corrupt.

## Read next

| Guide | Use it for |
| --- | --- |
| [Quick start](docs/QUICKSTART.md) | First project setup |
| [Existing projects](docs/EXISTING_PROJECTS.md) | Adopting Threadmark without replacing current context |
| [Architecture](docs/ARCHITECTURE.md) | Understanding the layers and data flow |
| [Context model](docs/CONTEXT_MODEL.md) | Deciding what becomes durable memory |
| [CLI reference](docs/CLI.md) | Commands and options |
| [Safety](docs/SAFETY.md) | Ownership and trust boundaries |
| [Alternatives](docs/ALTERNATIVES.md) | Honest comparison with related tools |

## Status

Threadmark is an early implementation. Review initialization changes before using it in an important repository.

Licensed under MIT.
