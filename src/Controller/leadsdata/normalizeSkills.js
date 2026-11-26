// utils/normalizeSkills.js

/**
 * Normalize skills from strings or arrays.
 * Handles: commas, semicolons, newlines, extra whitespace,
 * empty entries, and duplicates.
 *
 * "haircut, coloring,,  styling\nhaircut"  ->  ["haircut", "coloring", "styling"]
 * [" Haircut ", "", "haircut"]             ->  ["Haircut"]
 */
export const normalizeSkills = (input) => {
  if (input === undefined || input === null) return [];

  let rawItems = [];

  if (Array.isArray(input)) {
    rawItems = input.flatMap((item) =>
      typeof item === "string" ? item.split(/[,;\n\r]+/) : []
    );
  } else if (typeof input === "string") {
    rawItems = input.split(/[,;\n\r]+/);
  } else {
    return [];
  }

  const seen = new Set();
  const result = [];

  for (const raw of rawItems) {
    if (typeof raw !== "string") continue;

    const cleaned = raw.replace(/\s+/g, " ").trim();
    if (!cleaned) continue;

    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(cleaned);
  }

  return result;
};