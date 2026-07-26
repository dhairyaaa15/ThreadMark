import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { initializeProject } from "../src/core/init.js";
import { diagnoseProject } from "../src/core/doctor.js";

test("doctor accepts a fresh initialized project", async (context) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "threadmark-doctor-"));
  context.after(() => rm(root, { recursive: true, force: true }));

  await initializeProject({ project: root });
  const diagnosis = await diagnoseProject(root);

  assert.equal(diagnosis.ok, true);
  assert.ok(!diagnosis.findings.some((item) => item.level === "error"));
});
