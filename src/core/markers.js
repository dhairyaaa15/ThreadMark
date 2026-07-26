import { MANAGED_END, MANAGED_START } from "./constants.js";

function countOccurrences(value, needle) {
  return value.split(needle).length - 1;
}

export function markerStatus(contents) {
  const starts = countOccurrences(contents, MANAGED_START);
  const ends = countOccurrences(contents, MANAGED_END);

  if (starts === 0 && ends === 0) {
    return "absent";
  }
  if (starts === 1 && ends === 1 && contents.indexOf(MANAGED_START) < contents.indexOf(MANAGED_END)) {
    return "present";
  }
  return "malformed";
}

export function installManagedBlock(contents, block) {
  const status = markerStatus(contents);
  if (status === "malformed") {
    throw new Error("Threadmark markers are malformed or duplicated. Repair them before continuing.");
  }

  const newline = contents.includes("\r\n") ? "\r\n" : "\n";
  const normalizedBlock = block.replaceAll("\n", newline);

  if (status === "absent") {
    const separator = contents.length === 0 ? "" : newline;
    return `${contents}${separator}${normalizedBlock}${newline}`;
  }

  const start = contents.indexOf(MANAGED_START);
  const end = contents.indexOf(MANAGED_END) + MANAGED_END.length;
  return `${contents.slice(0, start)}${normalizedBlock}${contents.slice(end)}`;
}

export function removeManagedBlock(contents) {
  const status = markerStatus(contents);
  if (status === "absent") {
    return contents;
  }
  if (status === "malformed") {
    throw new Error("Threadmark markers are malformed or duplicated. Repair them before continuing.");
  }

  let start = contents.indexOf(MANAGED_START);
  let end = contents.indexOf(MANAGED_END) + MANAGED_END.length;

  if (start > 0 && contents.slice(0, start).endsWith("\r\n")) {
    start -= 2;
  } else if (start > 0 && contents[start - 1] === "\n") {
    start -= 1;
  }

  if (contents.slice(end).startsWith("\r\n")) {
    end += 2;
  } else if (contents[end] === "\n") {
    end += 1;
  }

  return `${contents.slice(0, start)}${contents.slice(end)}`;
}
