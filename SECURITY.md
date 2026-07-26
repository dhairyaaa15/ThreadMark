# Security policy

## Reporting

Do not publish an exploit or sensitive repository data in a public issue. Contact the repository maintainers privately through the security reporting method configured on GitHub.

## Scope

Security-sensitive areas include:

- writes outside `.threadmark/`;
- modification of text outside managed markers;
- command injection through paths, branches, or metadata;
- unsafe handling of symlinks;
- accidental inclusion of secrets in generated context;
- automatic execution of project-provided commands.

Threadmark should not execute commands stored in context documents. Git commands used for branch metadata are invoked without a shell.
