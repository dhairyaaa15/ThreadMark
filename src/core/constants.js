export const VERSION = "0.1.0";

export const MANAGED_START = "<!-- threadmark:managed-start -->";
export const MANAGED_END = "<!-- threadmark:managed-end -->";

export const AGENTS_BLOCK = `${MANAGED_START}
Threadmark provides shared project context. Read \`.threadmark/kernel.md\` before substantial work and follow its routing and handoff rules. Do not load the entire \`.threadmark/\` tree.
${MANAGED_END}`;

export const CLAUDE_BLOCK = `${MANAGED_START}
@.threadmark/kernel.md
${MANAGED_END}`;

export const ADAPTERS = [
  {
    agent: "Codex",
    file: "AGENTS.md",
    block: AGENTS_BLOCK
  },
  {
    agent: "Claude Code",
    file: "CLAUDE.md",
    block: CLAUDE_BLOCK
  }
];

export const DEFAULT_CONFIG = {
  budgetTokens: 1200,
  maxDocuments: 3,
  kernelBudgetTokens: 350,
  indexBudgetTokens: 300,
  handoffExpiresDays: 14
};

export const CONTEXT_DIRECTORIES = [
  "context",
  "domains",
  "decisions",
  "runbooks",
  "lessons"
];

export const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "vendor",
  "dist",
  "build",
  "target",
  "coverage",
  ".next",
  ".threadmark"
]);
