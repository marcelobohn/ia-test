import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadDocumentsFromFolder,
  indexUploadedBytes,
  clearCaches,
} from "./documents.js";

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "faq-docs-"));
  clearCaches();
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe("loadDocumentsFromFolder", () => {
  it("returns empty array when folder does not exist", async () => {
    const result = await loadDocumentsFromFolder(join(tmp, "missing"));
    expect(result).toEqual([]);
  });

  it("reads .txt and .md files", async () => {
    writeFileSync(join(tmp, "a.txt"), "hello world");
    writeFileSync(join(tmp, "b.md"), "# title\n\nbody");
    const result = await loadDocumentsFromFolder(tmp);
    const sources = result.map((d) => d.source);
    expect(sources.some((s) => s.endsWith("a.txt"))).toBe(true);
    expect(sources.some((s) => s.endsWith("b.md"))).toBe(true);
  });

  it("skips unsupported extensions", async () => {
    writeFileSync(join(tmp, "a.txt"), "keep");
    writeFileSync(join(tmp, "b.json"), "{}");
    const result = await loadDocumentsFromFolder(tmp);
    expect(result.every((d) => !d.source.endsWith(".json"))).toBe(true);
  });

  it("skips empty files", async () => {
    writeFileSync(join(tmp, "a.txt"), "   ");
    const result = await loadDocumentsFromFolder(tmp);
    expect(result).toEqual([]);
  });

  it("caches results across calls with same mtime/size", async () => {
    writeFileSync(join(tmp, "a.txt"), "content");
    const r1 = await loadDocumentsFromFolder(tmp);
    const r2 = await loadDocumentsFromFolder(tmp);
    expect(r1).toBe(r2);
  });

  it("invalidates cache when file changes", async () => {
    const file = join(tmp, "a.txt");
    writeFileSync(file, "first");
    const r1 = await loadDocumentsFromFolder(tmp);
    await new Promise((r) => setTimeout(r, 10));
    writeFileSync(file, "second content here");
    const r2 = await loadDocumentsFromFolder(tmp);
    expect(r1).not.toBe(r2);
    expect(r2[0].text).toContain("second");
  });
});

describe("indexUploadedBytes", () => {
  it("indexes text bytes as chunks", async () => {
    const buf = Buffer.from("hello upload world", "utf-8");
    const result = await indexUploadedBytes("note.txt", buf);
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("upload/note.txt");
    expect(result[0].text).toContain("hello");
  });

  it("skips unsupported extensions", async () => {
    const buf = Buffer.from("ignored", "utf-8");
    const result = await indexUploadedBytes("x.json", buf);
    expect(result).toEqual([]);
  });

  it("caches by content hash", async () => {
    const buf = Buffer.from("same content", "utf-8");
    const r1 = await indexUploadedBytes("a.txt", buf);
    const r2 = await indexUploadedBytes("a.txt", buf);
    expect(r1).toBe(r2);
  });
});
