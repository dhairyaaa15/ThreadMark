# Branch handoffs

A handoff records the current verified state of one Git branch. Create one with:

```text
threadmark handoff create --objective "Describe the branch outcome"
```

Keep it short. Update it after meaningful verified milestones, before switching agents, or before ending incomplete work. Mark it complete with:

```text
threadmark handoff complete
```

Threadmark loads a handoff only when its branch matches, its status is active, it has not expired, and its base commit remains relevant.
