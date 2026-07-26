import { createHash } from "node:crypto";
import path from "node:path";
import { readdir } from "node:fs/promises";
import { readConfig } from "./config.js";
import { parseFrontmatter, updateFrontmatter } from "./frontmatter.js";
import { assertNoSymlinkPath, exists, readText, relativePosix, writeText } from "./filesystem.js";
import { gitInfo, isAncestor } from "./git.js";

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function slugBranch(branch) {
  const slug = branch
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "workspace";
  const hash = createHash("sha256").update(branch).digest("hex").slice(0, 8);
  return `${slug}--${hash}.md`;
}

export async function listHandoffs(root) {
  const directory = path.join(root, ".threadmark", "handoffs");
  if (!(await exists(directory))) {
    return [];
  }

  const entries = await readdir(directory, { withFileTypes: true });
  const handoffs = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md") || entry.name === "README.md" || entry.name === "template.md") {
      continue;
    }
    const target = path.join(directory, entry.name);
    const contents = await readText(target);
    const parsed = parseFrontmatter(contents);
    if (parsed.data.type !== "handoff") {
      continue;
    }
    handoffs.push({
      path: target,
      relativePath: relativePosix(root, target),
      contents,
      ...parsed
    });
  }
  return handoffs;
}

export async function currentHandoff(root, options = {}) {
  const git = gitInfo(root);
  const now = options.now ?? new Date();
  const handoffs = await listHandoffs(root);
  const matching = handoffs
    .filter((handoff) => handoff.data.branch === git.branch)
    .sort((a, b) => String(b.data.updated).localeCompare(String(a.data.updated)));
  const active = matching.filter((handoff) => handoff.data.status === "active");

  const handoff = active[0] ?? matching[0] ?? null;
  if (!handoff) {
    return { git, handoff: null, reason: "missing" };
  }
  if (handoff.data.status !== "active") {
    return { git, handoff, reason: `status-${handoff.data.status || "unknown"}` };
  }
  if (handoff.data.expires && new Date(`${handoff.data.expires}T23:59:59Z`) < now) {
    return { git, handoff, reason: "expired" };
  }

  const ancestor = isAncestor(root, handoff.data.base_commit);
  if (ancestor === false) {
    return { git, handoff, reason: "base-not-ancestor" };
  }

  return { git, handoff, reason: "active" };
}

export async function createHandoff(root, options = {}) {
  const directory = path.join(root, ".threadmark", "handoffs");
  if (!(await exists(path.join(root, ".threadmark", "threadmark.yaml")))) {
    throw new Error("Threadmark is not initialized. Run `threadmark init` first.");
  }

  const git = gitInfo(root);
  const config = await readConfig(root);
  const expiresDays = options.expiresDays ?? config.handoffExpiresDays;
  if (!Number.isInteger(expiresDays) || expiresDays < 1 || expiresDays > 3650) {
    throw new Error("Handoff expiry must be an integer from 1 to 3650 days.");
  }

  const existing = await currentHandoff(root);
  if (existing.reason === "active") {
    throw new Error(`An active handoff already exists for ${git.branch}: ${existing.handoff.relativePath}`);
  }

  let target = path.join(directory, slugBranch(git.branch));
  if (await exists(target)) {
    const suffix = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    target = path.join(directory, slugBranch(git.branch).replace(/\.md$/, `--${suffix}.md`));
  }
  await assertNoSymlinkPath(root, target);

  const updated = new Date().toISOString();
  const expires = addDays(new Date(), expiresDays);
  const objective = options.objective || "Describe the outcome this branch is working toward.";
  const contents = `---
type: handoff
branch: ${git.branch}
base_commit: ${git.commit}
status: active
updated: ${updated}
expires: ${expires}
---
# Branch handoff

## Objective

${objective}

## Current state

Record only confirmed progress.

## Next actions

1. Add the next concrete action.

## Changed paths

- None recorded.

## Verification

- None recorded.

## Risks and blockers

- None recorded.
`;

  await writeText(target, contents);
  return {
    action: "created",
    project: root,
    branch: git.branch,
    path: relativePosix(root, target),
    expires
  };
}

export async function completeHandoff(root) {
  const current = await currentHandoff(root);
  if (!current.handoff) {
    throw new Error(`No handoff exists for branch ${current.git.branch}.`);
  }

  const updatedAt = new Date().toISOString();
  const updated = updateFrontmatter(current.handoff.contents, {
    status: "complete",
    updated: updatedAt
  });
  await assertNoSymlinkPath(root, current.handoff.path);
  await writeText(current.handoff.path, updated);
  return {
    action: "completed",
    branch: current.git.branch,
    path: current.handoff.relativePath
  };
}
