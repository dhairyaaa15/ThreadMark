import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const cli = path.resolve(testDirectory, "../src/cli.js");

function run(args) {
  return execFileSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

test("CLI supports the safe setup and verification flow", async (context) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "threadmark-cli-"));
  context.after(() => rm(root, { recursive: true, force: true }));

  const scan = run(["scan", "--project", root]);
  assert.match(scan, /No files were changed/);

  const preview = run(["init", "--project", root, "--dry-run"]);
  assert.match(preview, /No files were changed/);

  const initialized = run(["init", "--project", root]);
  assert.match(initialized, /Threadmark initialized/);

  const diagnosis = run(["doctor", "--project", root]);
  assert.match(diagnosis, /Status: healthy/);

  const packet = run(["context", "inspect project", "--project", root]);
  assert.match(packet, /# Threadmark context packet/);

  const uninstallPreview = run(["uninstall", "--project", root, "--dry-run"]);
  assert.match(uninstallPreview, /No files were changed/);
});
