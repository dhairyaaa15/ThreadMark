# Context model

Good project memory is small, scoped, current, and supported by evidence.

## Kernel

Keep the kernel below 350 tokens. Include only:

- project identity;
- important invariants;
- hard boundaries;
- routing rules;
- handoff behavior.

Do not include dependency lists, directory dumps, history, or rules already enforced by tools.

## Routed documents

Every routed document should have:

```yaml
---
type: context
scope: project
tags: [authentication]
paths: [src/auth/**]
status: active
updated: YYYY-MM-DD
summary: One sentence used when the full document does not fit.
---
```

Use `draft`, `proposed`, `active`, `superseded`, or `archived` deliberately. Only active routed documents are selected.

## Promotion rule

Promote information only when it is:

- not obvious from the repository;
- likely to matter again;
- verified by code, tests, logs, or review;
- specific enough to act on;
- assigned a clear scope and date.

Temporary progress belongs in a handoff. Stable technical choices belong in decisions. Repeatable procedures belong in runbooks. Verified failure patterns belong in lessons.

## Token budgets

Defaults:

| Layer | Budget |
| --- | ---: |
| Native adapter | about 50 tokens |
| Kernel | 350 tokens |
| Index | 300 tokens |
| Active handoff | up to 500 tokens |
| Task packet | 1,200 tokens |
| Deep documents | at most 3 |

Budgets are configured in `.threadmark/threadmark.yaml`.
