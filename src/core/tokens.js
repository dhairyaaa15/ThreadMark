export function estimateTokens(value) {
  if (typeof value === "number") {
    return Math.ceil(value / 4);
  }

  return Math.ceil(Buffer.byteLength(value ?? "", "utf8") / 4);
}

export function truncateToTokens(value, maxTokens) {
  const maxBytes = Math.max(0, maxTokens * 4);
  const buffer = Buffer.from(value ?? "", "utf8");

  if (buffer.length <= maxBytes) {
    return value;
  }

  let truncated = buffer.subarray(0, maxBytes).toString("utf8");
  const lastNewline = truncated.lastIndexOf("\n");
  if (lastNewline > truncated.length * 0.6) {
    truncated = truncated.slice(0, lastNewline);
  }

  return `${truncated.trimEnd()}\n\n[Truncated by Threadmark to fit the context budget.]`;
}
