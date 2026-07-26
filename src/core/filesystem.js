import { access, lstat, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { IGNORED_DIRECTORIES } from "./constants.js";

export async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

export async function readText(target) {
  return readFile(target, "utf8");
}

export async function writeText(target, contents) {
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, contents, "utf8");
}

export function relativePosix(root, target) {
  return path.relative(root, target).split(path.sep).join("/");
}

export function resolveProjectRoot(value = process.cwd()) {
  return path.resolve(value);
}

export function templateRoot() {
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), "../../templates/project");
}

export async function walkFiles(root, options = {}) {
  const {
    include = () => true,
    ignoreDirectories = IGNORED_DIRECTORIES,
    maxFiles = 10000
  } = options;
  const output = [];

  async function walk(current) {
    if (output.length >= maxFiles) {
      return;
    }

    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (output.length >= maxFiles) {
        break;
      }

      const fullPath = path.join(current, entry.name);
      if (entry.isSymbolicLink()) {
        continue;
      }

      if (entry.isDirectory()) {
        if (!ignoreDirectories.has(entry.name)) {
          await walk(fullPath);
        }
        continue;
      }

      if (entry.isFile() && include(fullPath, entry.name)) {
        output.push(fullPath);
      }
    }
  }

  if (await exists(root)) {
    await walk(root);
  }

  return output;
}

export async function copyMissingTemplates(sourceRoot, destinationRoot, replacements, dryRun = false) {
  const files = await walkFiles(sourceRoot, {
    ignoreDirectories: new Set(),
    maxFiles: 1000
  });
  const actions = [];

  for (const source of files) {
    const relative = path.relative(sourceRoot, source);
    const destination = path.join(destinationRoot, relative);
    await assertNoSymlinkPath(destinationRoot, destination);
    if (await exists(destination)) {
      actions.push({ action: "keep", path: destination });
      continue;
    }

    actions.push({ action: "create", path: destination });
    if (!dryRun) {
      let contents = await readText(source);
      for (const [key, value] of Object.entries(replacements)) {
        contents = contents.replaceAll(`{{${key}}}`, value);
      }
      await writeText(destination, contents);
    }
  }

  return actions;
}

export async function fileSize(target) {
  return (await stat(target)).size;
}

export function assertInside(root, target) {
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside the project: ${target}`);
  }
}

export async function assertNoSymlinkPath(root, target) {
  assertInside(root, target);
  const relative = path.relative(root, target);
  const parts = relative ? relative.split(path.sep) : [];
  let current = root;

  for (const part of ["", ...parts]) {
    if (part) {
      current = path.join(current, part);
    }
    if (!(await exists(current))) {
      continue;
    }
    const information = await lstat(current);
    if (information.isSymbolicLink()) {
      throw new Error(`Refusing to write through a symbolic link: ${current}`);
    }
  }
}
