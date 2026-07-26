import { unlink } from "node:fs/promises";
import path from "node:path";
import { ADAPTERS } from "./constants.js";
import { assertInside, assertNoSymlinkPath, exists, readText, writeText } from "./filesystem.js";
import { installManagedBlock, markerStatus, removeManagedBlock } from "./markers.js";

export async function planAdapterInstall(root) {
  const plans = [];

  for (const adapter of ADAPTERS) {
    const target = path.join(root, adapter.file);
    assertInside(root, target);
    await assertNoSymlinkPath(root, target);
    const before = (await exists(target)) ? await readText(target) : "";
    const after = installManagedBlock(before, adapter.block);
    plans.push({
      ...adapter,
      target,
      action: before === after ? "keep" : before.length === 0 ? "create" : "update",
      before,
      after
    });
  }

  return plans;
}

export async function installAdapters(root, dryRun = false) {
  const plans = await planAdapterInstall(root);
  if (!dryRun) {
    for (const plan of plans) {
      if (plan.action !== "keep") {
        await writeText(plan.target, plan.after);
      }
    }
  }
  return plans;
}

export async function uninstallAdapters(root, dryRun = false) {
  const plans = [];

  for (const adapter of ADAPTERS) {
    const target = path.join(root, adapter.file);
    assertInside(root, target);
    await assertNoSymlinkPath(root, target);
    if (!(await exists(target))) {
      plans.push({ ...adapter, target, action: "missing" });
      continue;
    }

    const before = await readText(target);
    const status = markerStatus(before);
    if (status === "malformed") {
      throw new Error(`${adapter.file} contains malformed Threadmark markers.`);
    }
    if (status === "absent") {
      plans.push({ ...adapter, target, action: "keep" });
      continue;
    }

    const after = removeManagedBlock(before);
    const action = after.trim().length === 0 ? "delete-empty-adapter" : "remove-managed-block";
    plans.push({ ...adapter, target, action, before, after });

    if (!dryRun) {
      if (action === "delete-empty-adapter") {
        await unlink(target);
      } else {
        await writeText(target, after);
      }
    }
  }

  return plans;
}
