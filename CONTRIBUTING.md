# Contributing

Keep changes small, reviewable, and compatible with Node.js 20 or newer.

## Development

```bash
npm test
npm run check
npm run pack:check
```

Threadmark has no runtime dependencies. New dependencies need a clear reason and should not weaken local-only behavior.

## Pull requests

- Add tests for behavior changes.
- Preserve existing files outside managed markers.
- Keep Windows, macOS, and Linux path behavior in mind.
- Keep user-facing documentation brief.
- Do not add hooks, network access, telemetry, or destructive cleanup as defaults.
