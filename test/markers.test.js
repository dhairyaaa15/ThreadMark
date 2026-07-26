import test from "node:test";
import assert from "node:assert/strict";
import {
  AGENTS_BLOCK,
  MANAGED_END,
  MANAGED_START
} from "../src/core/constants.js";
import {
  installManagedBlock,
  markerStatus,
  removeManagedBlock
} from "../src/core/markers.js";

test("managed block installation preserves existing content", () => {
  const before = "# Existing instructions\n\nKeep this exact text.\n";
  const after = installManagedBlock(before, AGENTS_BLOCK);

  assert.ok(after.startsWith(before));
  assert.ok(after.includes(MANAGED_START));
  assert.ok(after.includes(MANAGED_END));
  assert.equal(markerStatus(after), "present");
});

test("managed block installation is idempotent", () => {
  const once = installManagedBlock("", AGENTS_BLOCK);
  const twice = installManagedBlock(once, AGENTS_BLOCK);

  assert.equal(twice, once);
});

test("managed block removal restores the original file", () => {
  for (const before of ["# Existing\n", "# Existing without final newline", ""]) {
    const installed = installManagedBlock(before, AGENTS_BLOCK);
    assert.equal(removeManagedBlock(installed), before);
  }
});

test("malformed markers are rejected", () => {
  const malformed = `${MANAGED_START}\nMissing end marker.\n`;
  assert.equal(markerStatus(malformed), "malformed");
  assert.throws(
    () => installManagedBlock(malformed, AGENTS_BLOCK),
    /malformed or duplicated/
  );
});
