import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { initializeProject } from "../src/core/init.js";
import { buildContextPacket } from "../src/core/router.js";

async function temporaryProject() {
  return mkdtemp(path.join(os.tmpdir(), "threadmark-router-"));
}

test("router selects an active document by path", async (context) => {
  const root = await temporaryProject();
  context.after(() => rm(root, { recursive: true, force: true }));
  await initializeProject({ project: root });

  const domainDirectory = path.join(root, ".threadmark", "domains");
  await mkdir(domainDirectory, { recursive: true });
  await writeFile(path.join(domainDirectory, "authentication.md"), `---
type: domain
scope: authentication
tags: [authentication, tokens]
paths: [src/auth/**]
status: active
updated: 2026-07-26
summary: Authentication owns token issuance and validation.
---
# Authentication

Refresh tokens are rotated after use.
`, "utf8");

  const packet = await buildContextPacket(root, {
    query: "change authentication",
    paths: ["src/auth/middleware.js"],
    budget: 1200,
    maxDocuments: 3
  });

  assert.match(packet.output, /# Authentication/);
  assert.match(packet.output, /Refresh tokens are rotated/);
  assert.equal(packet.selected[0].path, ".threadmark/domains/authentication.md");
  assert.ok(packet.estimatedTokens <= 1200);
});

test("router ignores draft documents", async (context) => {
  const root = await temporaryProject();
  context.after(() => rm(root, { recursive: true, force: true }));
  await initializeProject({ project: root });

  const packet = await buildContextPacket(root, {
    query: "architecture",
    paths: [],
    budget: 1200
  });

  assert.doesNotMatch(packet.output, /Describe only the system shape/);
  assert.equal(packet.selected.length, 0);
});
