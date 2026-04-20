export function normalizeText(text: string): string {
  return text.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function splitIntoChunks(
  text: string,
  maxChars = 900,
  overlap = 150,
): string[] {
  if (maxChars <= 0) {
    throw new Error("maxChars must be positive");
  }
  if (overlap < 0 || overlap >= maxChars) {
    throw new Error("overlap must be between 0 and maxChars - 1");
  }

  const normalized = normalizeText(text);
  if (!normalized) return [];

  const chunks: string[] = [];
  let start = 0;
  const len = normalized.length;

  while (start < len) {
    const end = Math.min(start + maxChars, len);
    chunks.push(normalized.slice(start, end));
    if (end === len) break;
    start = end - overlap;
  }

  return chunks;
}
