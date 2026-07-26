import path from "node:path";
import { CONTEXT_DIRECTORIES } from "./constants.js";
import { readConfig } from "./config.js";
import { parseFrontmatter } from "./frontmatter.js";
import { currentHandoff } from "./handoffs.js";
import { estimateTokens, truncateToTokens } from "./tokens.js";
import { assertNoSymlinkPath, exists, readText, relativePosix, walkFiles, writeText } from "./filesystem.js";

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function globToRegExp(glob) {
  let expression = "^";
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    if (char === "*") {
      if (glob[index + 1] === "*") {
        expression += ".*";
        index += 1;
      } else {
        expression += "[^/]*";
      }
    } else if (char === "?") {
      expression += "[^/]";
    } else {
      expression += char.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
    }
  }
  return new RegExp(`${expression}$`, "i");
}

function pathScore(pattern, target) {
  const normalizedPattern = pattern.replaceAll("\\", "/");
  const normalizedTarget = target.replaceAll("\\", "/");
  if (normalizedPattern === normalizedTarget) {
    return 120;
  }
  try {
    return globToRegExp(normalizedPattern).test(normalizedTarget) ? 90 : 0;
  } catch {
    return 0;
  }
}

function words(value) {
  return new Set(
    String(value ?? "")
      .toLowerCase()
      .split(/[^a-z0-9_-]+/)
      .filter((word) => word.length >= 3)
  );
}

function titleFromBody(body, fallback) {
  const heading = body.match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : fallback;
}

function scoreDocument(document, query, paths) {
  let score = 0;
  const reasons = [];
  const patterns = asArray(document.data.paths);
  for (const target of paths) {
    const best = patterns.reduce((current, pattern) => Math.max(current, pathScore(pattern, target)), 0);
    if (best > 0) {
      score += best;
      reasons.push(best === 120 ? `exact path ${target}` : `path ${target}`);
    }
  }

  const queryWords = words(query);
  const tags = asArray(document.data.tags).map((tag) => tag.toLowerCase());
  const searchable = words([
    document.title,
    document.data.summary,
    ...tags
  ].join(" "));

  let matchedWords = 0;
  for (const word of queryWords) {
    if (searchable.has(word)) {
      matchedWords += 1;
    }
  }
  if (matchedWords > 0) {
    score += matchedWords * 12;
    reasons.push(`${matchedWords} query term${matchedWords === 1 ? "" : "s"}`);
  }

  if (document.data.scope === "project" && score > 0) {
    score += 3;
  }

  return { score, reasons };
}

async function loadDocuments(root) {
  const documents = [];
  for (const directory of CONTEXT_DIRECTORIES) {
    const source = path.join(root, ".threadmark", directory);
    if (!(await exists(source))) {
      continue;
    }
    const files = await walkFiles(source, {
      include: (_fullPath, name) => name.endsWith(".md"),
      maxFiles: 2000
    });
    for (const file of files) {
      const name = path.basename(file).toLowerCase();
      if (name === "readme.md" || name === "template.md" || name.endsWith("-template.md")) {
        continue;
      }

      const contents = await readText(file);
      const parsed = parseFrontmatter(contents);
      if (parsed.data.status && parsed.data.status !== "active") {
        continue;
      }
      if (parsed.data.expires && new Date(`${parsed.data.expires}T23:59:59Z`) < new Date()) {
        continue;
      }

      documents.push({
        path: file,
        relativePath: relativePosix(root, file),
        contents,
        title: titleFromBody(parsed.body, path.basename(file, ".md")),
        ...parsed
      });
    }
  }
  return documents;
}

function compactHandoff(handoff, maxTokens) {
  if (!handoff) return "";
  const source = `Source: \`${handoff.relativePath}\`\n\n`;
  return `${source}${truncateToTokens(handoff.body.trim(), Math.max(50, maxTokens - estimateTokens(source)))}`;
}

export async function buildContextPacket(root, options = {}) {
  const config = await readConfig(root);
  const budget = Number(options.budget ?? config.budgetTokens);
  const maxDocuments = Number(options.maxDocuments ?? config.maxDocuments);
  if (!Number.isInteger(budget) || budget < 200 || budget > 100000) {
    throw new Error("Context budget must be an integer from 200 to 100000 tokens.");
  }
  if (!Number.isInteger(maxDocuments) || maxDocuments < 1 || maxDocuments > 20) {
    throw new Error("Maximum documents must be an integer from 1 to 20.");
  }
  const query = options.query ?? "";
  const paths = options.paths ?? [];
  const kernelPath = path.join(root, ".threadmark", "kernel.md");

  if (!(await exists(kernelPath))) {
    throw new Error("Threadmark is not initialized. Run `threadmark init` first.");
  }

  const kernel = await readText(kernelPath);
  const handoffState = await currentHandoff(root);
  const documents = await loadDocuments(root);
  const ranked = documents
    .map((document) => ({
      ...document,
      ...scoreDocument(document, query, paths)
    }))
    .filter((document) => document.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(b.data.updated ?? "").localeCompare(String(a.data.updated ?? ""));
    });

  const heading = [
    "# Threadmark context packet",
    "",
    `Branch: ${handoffState.git.branch}`,
    query ? `Task: ${query}` : "Task: not provided",
    paths.length ? `Paths: ${paths.join(", ")}` : "Paths: not provided",
    ""
  ].join("\n");
  const sections = [heading];
  let used = estimateTokens(heading);

  const kernelHeading = "## Shared kernel\n\n";
  const kernelBudget = Math.min(config.kernelBudgetTokens, Math.max(0, budget - used - estimateTokens(kernelHeading)));
  const kernelText = truncateToTokens(kernel.trim(), kernelBudget);
  sections.push(`${kernelHeading}${kernelText}\n`);
  used += estimateTokens(`${kernelHeading}${kernelText}\n`);

  if (handoffState.reason === "active" && handoffState.handoff) {
    const headingText = "\n## Active handoff\n\n";
    const allowance = Math.min(500, Math.max(0, budget - used - estimateTokens(headingText) - 80));
    if (allowance >= 50) {
      const handoffText = compactHandoff(handoffState.handoff, allowance);
      sections.push(`${headingText}${handoffText}\n`);
      used += estimateTokens(`${headingText}${handoffText}\n`);
    }
  } else if (handoffState.handoff) {
    const warning = `\nHandoff not loaded: ${handoffState.reason}. Source: \`${handoffState.handoff.relativePath}\`.\n`;
    sections.push(warning);
    used += estimateTokens(warning);
  }

  const selected = [];
  for (const document of ranked) {
    if (selected.length >= maxDocuments) break;
    const section = `\n## ${document.title}\n\nSource: \`${document.relativePath}\`\nMatched by: ${document.reasons.join(", ")}\n\n${document.body.trim()}\n`;
    const sectionTokens = estimateTokens(section);
    if (used + sectionTokens <= budget) {
      sections.push(section);
      used += sectionTokens;
      selected.push(document);
      continue;
    }

    const summary = document.data.summary
      ? `\n## Routed document\n\nSource: \`${document.relativePath}\`\nReason: ${document.reasons.join(", ")}\nSummary: ${document.data.summary}\nRead the source if this task requires it.\n`
      : "";
    if (summary && used + estimateTokens(summary) <= budget) {
      sections.push(summary);
      used += estimateTokens(summary);
      selected.push(document);
    }
  }

  if (ranked.length === 0) {
    const notice = "\nNo deep context document matched. Use `.threadmark/index.md` to choose a source only if the task needs more context.\n";
    if (used + estimateTokens(notice) <= budget) {
      sections.push(notice);
      used += estimateTokens(notice);
    }
  }

  let output = sections.join("").trimEnd();
  const footer = `\n\nContext budget: about ${estimateTokens(output)} of ${budget} tokens.\n`;
  if (estimateTokens(output + footer) <= budget) {
    output += footer;
  } else {
    output += "\n";
  }

  return {
    output,
    budget,
    estimatedTokens: estimateTokens(output),
    selected: selected.map((document) => ({
      path: document.relativePath,
      score: document.score,
      reasons: document.reasons
    })),
    handoff: handoffState.handoff?.relativePath ?? null,
    handoffStatus: handoffState.reason
  };
}

export async function writeContextPacket(root, packet) {
  const target = path.join(root, ".threadmark", "generated", "context-packet.md");
  await assertNoSymlinkPath(root, target);
  await writeText(target, packet.output);
  return relativePosix(root, target);
}
