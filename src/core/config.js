import path from "node:path";
import { DEFAULT_CONFIG } from "./constants.js";
import { exists, readText } from "./filesystem.js";

function numberFrom(contents, key, fallback) {
  const expression = new RegExp(`^\\s*${key}:\\s*(\\d+)\\s*$`, "m");
  const match = contents.match(expression);
  return match ? Number(match[1]) : fallback;
}

export async function readConfig(root) {
  const target = path.join(root, ".threadmark", "threadmark.yaml");
  if (!(await exists(target))) {
    return { ...DEFAULT_CONFIG };
  }

  const contents = await readText(target);
  return {
    budgetTokens: numberFrom(contents, "budget_tokens", DEFAULT_CONFIG.budgetTokens),
    maxDocuments: numberFrom(contents, "max_documents", DEFAULT_CONFIG.maxDocuments),
    kernelBudgetTokens: numberFrom(contents, "kernel_budget_tokens", DEFAULT_CONFIG.kernelBudgetTokens),
    indexBudgetTokens: numberFrom(contents, "index_budget_tokens", DEFAULT_CONFIG.indexBudgetTokens),
    handoffExpiresDays: numberFrom(contents, "expires_days", DEFAULT_CONFIG.handoffExpiresDays)
  };
}
