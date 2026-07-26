import path from "node:path";
import { readConfig } from "./config.js";
import { CONTEXT_DIRECTORIES } from "./constants.js";
import { parseFrontmatter } from "./frontmatter.js";
import { currentHandoff } from "./handoffs.js";
import { estimateTokens } from "./tokens.js";
import { exists, readText, relativePosix, walkFiles } from "./filesystem.js";
import { scanProject } from "./scanner.js";

function finding(level, code, message, pathValue) {
  return {
    level,
    code,
    message,
    ...(pathValue ? { path: pathValue } : {})
  };
}

export async function diagnoseProject(root) {
  const scan = await scanProject(root);
  const findings = [];

  if (!scan.threadmark.initialized) {
    findings.push(finding("error", "not-initialized", "Threadmark is not initialized."));
    return { project: root, ok: false, findings, scan };
  }

  for (const adapter of scan.adapters) {
    if (adapter.status === "missing" || adapter.status === "absent") {
      findings.push(finding("warning", "adapter-missing", `${adapter.agent} will not load Threadmark automatically.`, adapter.file));
    } else if (adapter.status === "malformed") {
      findings.push(finding("error", "adapter-malformed", "Managed markers are malformed or duplicated.", adapter.file));
    }
  }

  const config = await readConfig(root);
  for (const [name, budget] of [
    ["kernel.md", config.kernelBudgetTokens],
    ["index.md", config.indexBudgetTokens]
  ]) {
    const target = path.join(root, ".threadmark", name);
    if (!(await exists(target))) {
      findings.push(finding("error", "required-file-missing", "Required file is missing.", `.threadmark/${name}`));
      continue;
    }
    const tokens = estimateTokens(await readText(target));
    if (tokens > budget) {
      findings.push(finding("warning", "budget-exceeded", `Estimated size is ${tokens} tokens; configured budget is ${budget}.`, `.threadmark/${name}`));
    }
  }

  for (const directory of CONTEXT_DIRECTORIES) {
    const source = path.join(root, ".threadmark", directory);
    if (!(await exists(source))) continue;
    const files = await walkFiles(source, {
      include: (_fullPath, name) => name.endsWith(".md"),
      maxFiles: 2000
    });
    for (const file of files) {
      const lower = path.basename(file).toLowerCase();
      if (lower === "readme.md" || lower === "template.md" || lower.endsWith("-template.md")) {
        continue;
      }
      const relative = relativePosix(root, file);
      const parsed = parseFrontmatter(await readText(file));
      if (!parsed.hasFrontmatter) {
        findings.push(finding("warning", "metadata-missing", "Routed documents should have frontmatter.", relative));
        continue;
      }
      for (const key of ["type", "status", "updated"]) {
        if (!parsed.data[key]) {
          findings.push(finding("warning", "metadata-incomplete", `Missing metadata field: ${key}.`, relative));
        }
      }
    }
  }

  const current = await currentHandoff(root);
  if (current.reason === "expired") {
    findings.push(finding("warning", "handoff-expired", "The current branch handoff is expired and will not be loaded.", current.handoff.relativePath));
  } else if (current.reason === "base-not-ancestor") {
    findings.push(finding("warning", "handoff-diverged", "The handoff base commit is not an ancestor of HEAD.", current.handoff.relativePath));
  }

  const rootAgentContext = scan.contexts.filter((item) =>
    (item.path === "AGENTS.md" || item.path === "CLAUDE.md") && item.estimatedTokens > 2000
  );
  for (const item of rootAgentContext) {
    findings.push(finding("warning", "large-native-context", `This auto-loaded file is about ${item.estimatedTokens} tokens. Threadmark will not rewrite it.`, item.path));
  }

  if (findings.length === 0) {
    findings.push(finding("info", "healthy", "Threadmark is initialized and no problems were found."));
  }

  return {
    project: root,
    ok: !findings.some((item) => item.level === "error"),
    findings,
    scan
  };
}

export function renderDoctor(result) {
  const lines = [
    "Threadmark doctor",
    `Project: ${result.project}`,
    `Status: ${result.ok ? "healthy" : "needs attention"}`,
    ""
  ];

  for (const item of result.findings) {
    const location = item.path ? ` [${item.path}]` : "";
    lines.push(`- ${item.level.toUpperCase()} ${item.code}${location}: ${item.message}`);
  }

  return `${lines.join("\n")}\n`;
}
