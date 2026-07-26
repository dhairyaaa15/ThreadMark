#!/usr/bin/env node

import process from "node:process";
import { initializeProject, renderInit } from "./core/init.js";
import { diagnoseProject, renderDoctor } from "./core/doctor.js";
import { scanProject, renderScan } from "./core/scanner.js";
import { buildContextPacket, writeContextPacket } from "./core/router.js";
import { completeHandoff, createHandoff, currentHandoff } from "./core/handoffs.js";
import { uninstallAdapters } from "./core/adapters.js";
import { resolveProjectRoot } from "./core/filesystem.js";
import { VERSION } from "./core/constants.js";

const VALUE_OPTIONS = new Set([
  "project",
  "path",
  "budget",
  "max-docs",
  "objective",
  "expires-days"
]);

function camelCase(value) {
  return value.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
}

function parseArguments(args) {
  const options = { paths: [] };
  const positionals = [];

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith("--")) {
      positionals.push(argument);
      continue;
    }

    const equalIndex = argument.indexOf("=");
    const rawKey = argument.slice(2, equalIndex === -1 ? undefined : equalIndex);
    const key = camelCase(rawKey);
    if (VALUE_OPTIONS.has(rawKey)) {
      const value = equalIndex === -1 ? args[++index] : argument.slice(equalIndex + 1);
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`--${rawKey} requires a value.`);
      }
      if (rawKey === "path") {
        options.paths.push(value);
      } else {
        options[key] = value;
      }
      continue;
    }

    options[key] = true;
  }

  return { options, positionals };
}

function assertOptions(options, allowed) {
  const common = new Set(["help", "json", ...allowed]);
  const unknown = Object.keys(options).filter((key) => key !== "paths" && !common.has(key));
  if (unknown.length > 0) {
    throw new Error(`Unknown option: --${unknown[0].replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`);
  }
  if (options.paths.length > 0 && !common.has("paths")) {
    throw new Error("Unknown option: --path");
  }
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function help() {
  return `Threadmark ${VERSION}

Shared, token-budgeted project context for coding agents.

Usage:
  threadmark scan [--project <path>] [--json]
  threadmark init [--project <path>] [--dry-run] [--no-adapters]
  threadmark doctor [--project <path>] [--json]
  threadmark context [task] [--path <file>] [--budget <tokens>] [--max-docs <count>] [--write]
  threadmark handoff show [--project <path>] [--json]
  threadmark handoff create [--project <path>] [--objective <text>] [--expires-days <days>]
  threadmark handoff complete [--project <path>]
  threadmark uninstall [--project <path>] [--dry-run]

Commands:
  scan       Find existing agent context without changing files.
  init       Create missing Threadmark files and install small native adapters.
  doctor     Check adapters, budgets, metadata, and handoff freshness.
  context    Build a deterministic context packet for a task.
  handoff    Create, inspect, or complete the current branch handoff.
  uninstall  Remove only Threadmark-managed adapter blocks.

Threadmark never modifies .claude/ or .codex/.
`;
}

async function runScan(parsed) {
  assertOptions(parsed.options, ["project"]);
  const root = resolveProjectRoot(parsed.options.project);
  const result = await scanProject(root);
  parsed.options.json ? printJson(result) : process.stdout.write(renderScan(result));
}

async function runInit(parsed) {
  assertOptions(parsed.options, ["project", "dryRun", "noAdapters"]);
  const result = await initializeProject({
    project: parsed.options.project,
    dryRun: parsed.options.dryRun,
    adapters: !parsed.options.noAdapters
  });
  process.stdout.write(renderInit(result));
}

async function runDoctor(parsed) {
  assertOptions(parsed.options, ["project"]);
  const root = resolveProjectRoot(parsed.options.project);
  const result = await diagnoseProject(root);
  parsed.options.json ? printJson(result) : process.stdout.write(renderDoctor(result));
  if (!result.ok) process.exitCode = 1;
}

async function runContext(parsed) {
  assertOptions(parsed.options, ["project", "paths", "budget", "maxDocs", "write"]);
  const root = resolveProjectRoot(parsed.options.project);
  const packet = await buildContextPacket(root, {
    query: parsed.positionals.join(" "),
    paths: parsed.options.paths,
    budget: parsed.options.budget,
    maxDocuments: parsed.options.maxDocs
  });

  if (parsed.options.write) {
    const target = await writeContextPacket(root, packet);
    process.stdout.write(`Wrote ${target} (${packet.estimatedTokens} estimated tokens).\n`);
  } else {
    process.stdout.write(packet.output);
  }
}

async function runHandoff(args) {
  const action = args[0] && !args[0].startsWith("--") ? args[0] : "show";
  const parsed = parseArguments(action === "show" && args[0]?.startsWith("--") ? args : args.slice(1));
  const root = resolveProjectRoot(parsed.options.project);

  if (action === "show") {
    assertOptions(parsed.options, ["project"]);
    const current = await currentHandoff(root);
    if (parsed.options.json) {
      printJson({
        branch: current.git.branch,
        status: current.reason,
        path: current.handoff?.relativePath ?? null,
        metadata: current.handoff?.data ?? null
      });
    } else if (current.handoff) {
      process.stdout.write(current.handoff.contents);
    } else {
      process.stdout.write(`No handoff exists for branch ${current.git.branch}.\n`);
    }
    return;
  }

  if (action === "create") {
    assertOptions(parsed.options, ["project", "objective", "expiresDays"]);
    const result = await createHandoff(root, {
      objective: parsed.options.objective,
      expiresDays: parsed.options.expiresDays ? Number(parsed.options.expiresDays) : undefined
    });
    parsed.options.json ? printJson(result) : process.stdout.write(`Created ${result.path} for ${result.branch}; expires ${result.expires}.\n`);
    return;
  }

  if (action === "complete") {
    assertOptions(parsed.options, ["project"]);
    const result = await completeHandoff(root);
    parsed.options.json ? printJson(result) : process.stdout.write(`Completed ${result.path}.\n`);
    return;
  }

  throw new Error(`Unknown handoff action: ${action}`);
}

async function runUninstall(parsed) {
  assertOptions(parsed.options, ["project", "dryRun"]);
  const root = resolveProjectRoot(parsed.options.project);
  const actions = await uninstallAdapters(root, parsed.options.dryRun);
  const lines = [
    parsed.options.dryRun ? "Threadmark uninstall preview" : "Threadmark adapters removed",
    `Project: ${root}`,
    ""
  ];
  for (const item of actions) {
    lines.push(`- ${item.action}: ${item.file}`);
  }
  lines.push(
    "",
    ".threadmark/ was kept. Threadmark never removes project memory automatically."
  );
  if (parsed.options.dryRun) {
    lines.push("No files were changed.");
  }
  process.stdout.write(`${lines.join("\n")}\n`);
}

async function main() {
  const [command = "help", ...args] = process.argv.slice(2);
  if (command === "help" || command === "--help" || command === "-h") {
    process.stdout.write(help());
    return;
  }
  if (command === "version" || command === "--version" || command === "-v") {
    process.stdout.write(`${VERSION}\n`);
    return;
  }

  if (command === "handoff") {
    await runHandoff(args);
    return;
  }

  const parsed = parseArguments(args);
  if (parsed.options.help) {
    process.stdout.write(help());
    return;
  }

  if (command === "scan") return runScan(parsed);
  if (command === "init") return runInit(parsed);
  if (command === "doctor") return runDoctor(parsed);
  if (command === "context") return runContext(parsed);
  if (command === "uninstall") return runUninstall(parsed);

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  process.stderr.write(`Error: ${error.message}\n`);
  process.exitCode = 1;
});
