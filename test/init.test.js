import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { initializeProject } from "../src/core/init.js";

async function temporaryProject() {
  return mkdtemp(path.join(os.tmpdir(), "threadmark-init-"));
}

test("initialization preserves existing agent configuration", async (context) => {
  const root = await temporaryProject();
  context.after(() => rm(root, { recursive: true, force: true }));

  await mkdir(path.join(root, ".claude"), { recursive: true });
  await mkdir(path.join(root, ".codex"), { recursive: true });
  await writeFile(path.join(root, "AGENTS.md"), "# Existing Codex rules\n", "utf8");
  await writeFile(path.join(root, "CLAUDE.md"), "# Existing Claude rules\n", "utf8");
  await writeFile(path.join(root, ".claude", "rules.md"), "keep claude", "utf8");
  await writeFile(path.join(root, ".codex", "notes.md"), "keep codex", "utf8");

  await initializeProject({ project: root });

  const agents = await readFile(path.join(root, "AGENTS.md"), "utf8");
  const claude = await readFile(path.join(root, "CLAUDE.md"), "utf8");
  assert.ok(agents.startsWith("# Existing Codex rules\n"));
  assert.ok(agents.includes("threadmark:managed-start"));
  assert.ok(claude.startsWith("# Existing Claude rules\n"));
  assert.ok(claude.includes("@.threadmark/kernel.md"));
  assert.equal(await readFile(path.join(root, ".claude", "rules.md"), "utf8"), "keep claude");
  assert.equal(await readFile(path.join(root, ".codex", "notes.md"), "utf8"), "keep codex");
});

test("reinitialization keeps edited project memory", async (context) => {
  const root = await temporaryProject();
  context.after(() => rm(root, { recursive: true, force: true }));

  await initializeProject({ project: root });
  const kernelPath = path.join(root, ".threadmark", "kernel.md");
  await writeFile(kernelPath, "# Custom kernel\n", "utf8");

  const result = await initializeProject({ project: root });
  assert.equal(await readFile(kernelPath, "utf8"), "# Custom kernel\n");
  assert.ok(result.templateActions.some((item) =>
    item.path === ".threadmark/kernel.md" && item.action === "keep"
  ));
});

test("dry-run does not create project files", async (context) => {
  const root = await temporaryProject();
  context.after(() => rm(root, { recursive: true, force: true }));

  const result = await initializeProject({ project: root, dryRun: true });
  assert.ok(result.templateActions.some((item) => item.action === "create"));

  await assert.rejects(
    readFile(path.join(root, ".threadmark", "kernel.md"), "utf8"),
    /ENOENT/
  );
});

test("initialization refuses a symbolic-link adapter", async (context) => {
  const base = await temporaryProject();
  const root = path.join(base, "project");
  const external = path.join(base, "external-agents.md");
  context.after(() => rm(base, { recursive: true, force: true }));
  await mkdir(root);
  await writeFile(external, "# External instructions\n", "utf8");

  try {
    await symlink(external, path.join(root, "AGENTS.md"), "file");
  } catch (error) {
    if (error.code === "EPERM" || error.code === "EACCES") {
      context.skip("Symbolic links are not available in this Windows environment.");
      return;
    }
    throw error;
  }

  await assert.rejects(
    initializeProject({ project: root }),
    /symbolic link/
  );
  assert.equal(await readFile(external, "utf8"), "# External instructions\n");
});
