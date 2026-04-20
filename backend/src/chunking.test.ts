import { describe, it, expect } from "vitest";
import { normalizeText, splitIntoChunks } from "./chunking.js";

describe("normalizeText", () => {
  it("collapses multiple whitespace into single space", () => {
    expect(normalizeText("a  b\n\nc\td")).toBe("a b c d");
  });

  it("replaces NBSP with space", () => {
    expect(normalizeText("a\u00a0b")).toBe("a b");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeText("  hello  ")).toBe("hello");
  });
});

describe("splitIntoChunks", () => {
  it("returns empty array for empty input", () => {
    expect(splitIntoChunks("")).toEqual([]);
    expect(splitIntoChunks("   ")).toEqual([]);
  });

  it("returns one chunk when text fits in maxChars", () => {
    const text = "hello world";
    expect(splitIntoChunks(text, 100, 10)).toEqual(["hello world"]);
  });

  it("splits long text with overlap", () => {
    const text = "a".repeat(250);
    const chunks = splitIntoChunks(text, 100, 20);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].length).toBe(100);
  });

  it("throws when overlap >= maxChars", () => {
    expect(() => splitIntoChunks("abc", 100, 100)).toThrow();
    expect(() => splitIntoChunks("abc", 100, 150)).toThrow();
  });

  it("throws when maxChars <= 0", () => {
    expect(() => splitIntoChunks("abc", 0, 0)).toThrow();
  });
});
