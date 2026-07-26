# Domain context

Create one small document per product or technical domain.

Use frontmatter:

```yaml
---
type: domain
scope: domain-name
tags: [domain-name, related-term]
paths: [src/domain-name/**]
status: active
updated: YYYY-MM-DD
summary: One sentence describing this domain.
---
```

Include responsibilities, boundaries, important flows, and links to primary code. Do not duplicate general architecture.
