import type { DocChunk } from "./types.js";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function scoreChunk(query: string, chunkText: string): number {
  const words = query.toLowerCase().match(/\w+/g);
  if (!words || words.length === 0) return 0;

  const lowered = chunkText.toLowerCase();
  let total = 0;
  for (const word of words) {
    const re = new RegExp(`\\b${escapeRegExp(word)}\\b`, "g");
    const matches = lowered.match(re);
    total += matches ? matches.length : 0;
  }
  return total;
}

export function retrieveRelevantChunks(
  query: string,
  documents: DocChunk[],
  topK: number,
): DocChunk[] {
  const scored: Array<{ score: number; doc: DocChunk }> = [];
  for (const doc of documents) {
    const score = scoreChunk(query, doc.text);
    if (score > 0) scored.push({ score, doc });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((s) => s.doc);
}
