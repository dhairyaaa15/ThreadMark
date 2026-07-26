import path from "node:path";
import { installAdapters } from "./adapters.js";
import {
  assertNoSymlinkPath,
  copyMissingTemplates,
  exists,
  resolveProjectRoot,
  templateRoot,
  writeText
} from "./filesystem.js";
import { renderCatalog, scanProject } from "./scanner.js";

export async function initializeProject(options = {}) {
  const root = resolveProjectRoot(options.project);
  if (!(await exists(root))) {
    throw new Error(`Project directory does not exist: ${root}`);
  }
  await assertNoSymlinkPath(root, root);
  const date = new Date().toISOString().slice(0, 10);
  const projectName = path.basename(root);
  const scan = await scanProject(root);

  const templateActions = await copyMissingTemplates(
    templateRoot(),
    root,
    {
      PROJECT_NAME: projectName,
      DATE: date
    },
    options.dryRun
  );

  const adapterActions = options.adapters === false
    ? []
    : await installAdapters(root, options.dryRun);

  if (!options.dryRun) {
    const catalogPath = path.join(root, ".threadmark", "generated", "existing-context.md");
    await assertNoSymlinkPath(root, catalogPath);
    await writeText(catalogPath, renderCatalog(scan));
  }

  return {
    project: root,
    dryRun: Boolean(options.dryRun),
    adaptersEnabled: options.adapters !== false,
    templateActions: templateActions.map((item) => ({
      action: item.action,
      path: path.relative(root, item.path).split(path.sep).join("/")
    })),
    adapterActions: adapterActions.map((item) => ({
      action: item.action,
      file: item.file,
      agent: item.agent
    }))
  };
}

export function renderInit(result) {
  const lines = [
    result.dryRun ? "Threadmark initialization preview" : "Threadmark initialized",
    `Project: ${result.project}`,
    "",
    "Project brain"
  ];

  for (const item of result.templateActions) {
    lines.push(`- ${item.action}: ${item.path}`);
  }

  lines.push("", "Native adapters");
  if (!result.adaptersEnabled) {
    lines.push("- skipped by --no-adapters");
  } else {
    for (const item of result.adapterActions) {
      lines.push(`- ${item.action}: ${item.file} (${item.agent})`);
    }
  }

  if (result.dryRun) {
    lines.push("", "No files were changed. Run without --dry-run to apply this plan.");
  } else {
    lines.push(
      "",
      "Next:",
      "1. Edit .threadmark/kernel.md.",
      "2. Fill the relevant context documents.",
      "3. Run `threadmark doctor`."
    );
  }

  return `${lines.join("\n")}\n`;
}
