import { describe, it, expect } from "vitest";
import { scoreChunk, retrieveRelevantChunks } from "./ranking.js";
import type { DocChunk } from "./types.js";

describe("scoreChunk", () => {
  it("returns 0 when query has no word characters", () => {
    expect(scoreChunk("!!!", "hello world")).toBe(0);
    expect(scoreChunk("", "hello world")).toBe(0);
  });

  it("matches whole words only (casa not in casamento)", () => {
    expect(scoreChunk("casa", "casamento de joao")).toBe(0);
    expect(scoreChunk("casa", "a casa e grande")).toBe(1);
  });

  it("counts multiple occurrences", () => {
    expect(scoreChunk("casa", "casa casa casa")).toBe(3);
  });

  it("is case insensitive", () => {
    expect(scoreChunk("CASA", "a Casa grande")).toBe(1);
  });

  it("sums scores across multiple query words", () => {
    expect(scoreChunk("casa grande", "a casa e muito grande")).toBe(2);
  });
});

describe("retrieveRelevantChunks", () => {
  const docs: DocChunk[] = [
    { source: "a.md", chunkId: "a#1", text: "a casa e grande" },
    { source: "b.md", chunkId: "b#1", text: "casa casa casa" },
    { source: "c.md", chunkId: "c#1", text: "texto irrelevante" },
  ];

  it("returns chunks sorted by score desc", () => {
    const result = retrieveRelevantChunks("casa", docs, 5);
    expect(result[0].chunkId).toBe("b#1");
    expect(result[1].chunkId).toBe("a#1");
    expect(result).toHaveLength(2);
  });

  it("respects topK", () => {
    const result = retrieveRelevantChunks("casa", docs, 1);
    expect(result).toHaveLength(1);
    expect(result[0].chunkId).toBe("b#1");
  });

  it("returns empty when nothing matches", () => {
    expect(retrieveRelevantChunks("inexistente", docs, 5)).toEqual([]);
  });
});
