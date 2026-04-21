import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { createHash } from "node:crypto";
import pdfParse from "pdf-parse";
import { splitIntoChunks } from "./chunking.js";
import type { DocChunk } from "./types.js";

type FolderCacheEntry = { signature: string; chunks: DocChunk[] };
const folderCache = new Map<string, FolderCacheEntry>();
const uploadCache = new Map<string, DocChunk[]>();

const SUPPORTED = new Set([".txt", ".md", ".pdf"]);

export function clearCaches(): void {
  folderCache.clear();
  uploadCache.clear();
}

async function walkFiles(folder: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(folder, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(folder, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkFiles(full)));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  out.sort();
  return out;
}

async function folderSignature(
  folder: string,
): Promise<{ signature: string; files: string[] }> {
  if (!existsSync(folder)) return { signature: "missing", files: [] };
  const files = await walkFiles(folder);
  const parts: string[] = [];
  for (const f of files) {
    const s = await stat(f);
    parts.push(`${f}:${s.mtimeMs}:${s.size}`);
  }
  return { signature: parts.join("|"), files };
}

async function readTextFile(path: string): Promise<string> {
  return readFile(path, "utf-8");
}

async function readPdfFile(
  path: string,
  onError: (msg: string) => void,
): Promise<string> {
  try {
    const buf = await readFile(path);
    const data = await pdfParse(buf);
    return data.text ?? "";
  } catch (err) {
    onError(`Nao foi possivel ler o PDF ${path}: ${(err as Error).message}`);
    return "";
  }
}

export async function loadDocumentsFromFolder(
  folder: string,
  onWarning: (msg: string) => void = () => {},
): Promise<DocChunk[]> {
  const { signature, files } = await folderSignature(folder);
  const cached = folderCache.get(folder);
  if (cached && cached.signature === signature) return cached.chunks;

  const chunks: DocChunk[] = [];
  for (const path of files) {
    const suffix = extname(path).toLowerCase();
    if (!SUPPORTED.has(suffix)) continue;

    let content = "";
    if (suffix === ".pdf") {
      content = await readPdfFile(path, onWarning);
    } else {
      content = await readTextFile(path);
    }
    if (!content.trim()) continue;

    const pieces = splitIntoChunks(content);
    pieces.forEach((text, i) => {
      chunks.push({
        source: path,
        chunkId: `${basename(path)}#${i + 1}`,
        text,
      });
    });
  }

  folderCache.set(folder, { signature, chunks });
  return chunks;
}

export async function indexUploadedBytes(
  name: string,
  rawBytes: Buffer,
  onWarning: (msg: string) => void = () => {},
): Promise<DocChunk[]> {
  const hash = createHash("sha256").update(rawBytes).digest("hex");
  const cacheKey = `${name}:${hash}`;
  const cached = uploadCache.get(cacheKey);
  if (cached) return cached;

  const suffix = extname(name).toLowerCase();
  let content = "";
  if (suffix === ".txt" || suffix === ".md") {
    content = rawBytes.toString("utf-8");
  } else if (suffix === ".pdf") {
    try {
      const data = await pdfParse(rawBytes);
      content = data.text ?? "";
    } catch {
      onWarning(`Nao foi possivel ler o PDF enviado: ${name}`);
      content = "";
    }
  } else {
    uploadCache.set(cacheKey, []);
    return [];
  }

  if (!content.trim()) {
    uploadCache.set(cacheKey, []);
    return [];
  }

  const chunks = splitIntoChunks(content).map((text, i) => ({
    source: `upload/${name}`,
    chunkId: `${name}#${i + 1}`,
    text,
  }));
  uploadCache.set(cacheKey, chunks);
  return chunks;
}
