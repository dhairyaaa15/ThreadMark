function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  return trimmed.replace(/^["']|["']$/g, "");
}

export function parseFrontmatter(contents) {
  if (!contents.startsWith("---\n") && !contents.startsWith("---\r\n")) {
    return { data: {}, body: contents, hasFrontmatter: false };
  }

  const match = contents.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { data: {}, body: contents, hasFrontmatter: false };
  }

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) {
      continue;
    }
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1);
    data[key] = parseScalar(value);
  }

  return {
    data,
    body: contents.slice(match[0].length),
    hasFrontmatter: true
  };
}

function formatScalar(value) {
  if (Array.isArray(value)) {
    return `[${value.join(", ")}]`;
  }
  return String(value ?? "");
}

export function updateFrontmatter(contents, changes) {
  const parsed = parseFrontmatter(contents);
  const data = { ...parsed.data, ...changes };
  const lines = Object.entries(data).map(([key, value]) => `${key}: ${formatScalar(value)}`);
  return `---\n${lines.join("\n")}\n---\n${parsed.body.replace(/^\r?\n/, "")}`;
}
