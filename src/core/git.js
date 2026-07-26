import { execFileSync } from "node:child_process";

function runGit(root, args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "";
  }
}

export function gitInfo(root) {
  const branch = runGit(root, ["branch", "--show-current"]) || "workspace";
  const commit = runGit(root, ["rev-parse", "HEAD"]) || "uncommitted";
  const topLevel = runGit(root, ["rev-parse", "--show-toplevel"]);

  return {
    branch,
    commit,
    isRepository: Boolean(topLevel)
  };
}

export function isAncestor(root, ancestor, descendant = "HEAD") {
  if (!ancestor || ancestor === "uncommitted") {
    return null;
  }

  try {
    execFileSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
      cwd: root,
      stdio: "ignore"
    });
    return true;
  } catch {
    return false;
  }
}
