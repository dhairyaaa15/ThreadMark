import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { initializeProject } from "../src/core/init.js";
import {
  completeHandoff,
  createHandoff,
  currentHandoff
} from "../src/core/handoffs.js";

async function temporaryProject() {
  return mkdtemp(path.join(os.tmpdir(), "threadmark-handoff-"));
}

test("handoff lifecycle is scoped to the current workspace", async (context) => {
  const root = await temporaryProject();
  context.after(() => rm(root, { recursive: true, force: true }));
  await initializeProject({ project: root });

  const created = await createHandoff(root, {
    objective: "Verify the handoff lifecycle."
  });
  assert.equal(created.branch, "workspace");

  const active = await currentHandoff(root);
  assert.equal(active.reason, "active");
  assert.match(active.handoff.contents, /Verify the handoff lifecycle/);

  await completeHandoff(root);
  const completed = await currentHandoff(root);
  assert.equal(completed.reason, "status-complete");
});
