import { jsonrepair } from "jsonrepair";

export const parseJsonWithRepair = <T>(input: string): T => {
  const normalized = normalizeJsonCandidate(input);

  try {
    return JSON.parse(normalized) as T;
  } catch (originalError) {
    try {
      return JSON.parse(jsonrepair(normalized)) as T;
    } catch {
      const extracted = extractFirstJsonBlock(normalized);
      if (extracted) {
        try {
          return JSON.parse(extracted.text) as T;
        } catch {
          try {
            return JSON.parse(jsonrepair(extracted.text)) as T;
          } catch {
            throw originalError;
          }
        }
      }
      throw originalError;
    }
  }
};

const normalizeJsonCandidate = (input: string) =>
  input
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const extractFirstJsonBlock = (input: string) => {
  const objectBlock = extractBalancedBlock(input, "{", "}");
  const arrayBlock = extractBalancedBlock(input, "[", "]");

  if (!objectBlock) {
    return arrayBlock;
  }
  if (!arrayBlock) {
    return objectBlock;
  }

    return objectBlock.start <= arrayBlock.start ? objectBlock : arrayBlock;
  };

const extractBalancedBlock = (input: string, openChar: string, closeChar: string) => {
  const start = input.indexOf(openChar);
  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < input.length; index += 1) {
    const char = input[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === openChar) {
      depth += 1;
    } else if (char === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return {
          start,
          text: input.slice(start, index + 1)
        };
      }
    }
  }

  return null;
};
