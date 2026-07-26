# CLI reference

All commands use the current directory unless `--project <path>` is supplied.

## scan

```bash
threadmark scan [--json]
```

Discovers existing agent context. It never writes files.

## init

```bash
threadmark init [--dry-run] [--no-adapters]
```

Creates missing Threadmark files and installs native adapters. Existing project memory is not overwritten.

## doctor

```bash
threadmark doctor [--json]
```

Checks initialization, adapter markers, context budgets, document metadata, and handoff freshness.

## context

```bash
threadmark context [task] \
  [--path <file>] \
  [--budget <tokens>] \
  [--max-docs <count>] \
  [--write]
```

Builds a deterministic context packet. Repeat `--path` for multiple paths. Without `--write`, the packet is printed. With `--write`, it is saved under `.threadmark/generated/`.

## handoff

```bash
threadmark handoff show [--json]
threadmark handoff create [--objective <text>] [--expires-days <days>]
threadmark handoff complete
```

Creates, reads, or completes the handoff associated with the current Git branch.

## uninstall

```bash
threadmark uninstall [--dry-run]
```

Removes Threadmark-managed adapter blocks. It does not delete `.threadmark/`.
