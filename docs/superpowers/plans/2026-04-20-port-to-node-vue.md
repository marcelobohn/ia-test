# Port Streamlit/Python FAQ to Node + Vue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reproduce the current `app.py` (Streamlit + Ollama FAQ) as a Node/TypeScript backend + Vue 3 SPA, preserving all existing behavior (folder indexing, uploads, keyword ranking, Ollama prompt, warnings on bad PDFs, caching).

**Architecture:** Monorepo with `backend/` (Fastify + TS, REST API) and `frontend/` (Vite + Vue 3 + TS, SPA). Frontend calls backend via `/api/*` proxied by Vite in dev. Backend calls Ollama at `localhost:11434/api/generate`. Pure functions (chunking, ranking, prompt) are unit-tested with Vitest; UI is smoke-tested manually.

**Tech Stack:**
- Backend: Node 20+, TypeScript, Fastify, `@fastify/multipart`, `@fastify/cors`, `pdf-parse`, `vitest`, `tsx`
- Frontend: Vue 3, Vite, TypeScript, `vue-tsc`
- Monorepo: two sibling folders, separate `package.json`, no workspace manager needed

---

## File Structure

**Backend (`backend/`):**
- `package.json` — deps + scripts (`dev`, `build`, `start`, `test`)
- `tsconfig.json` — strict TS, target ES2022, module NodeNext
- `vitest.config.ts` — test config
- `.env.example` — PORT, OLLAMA_URL, DEFAULT_MODEL, DOCS_DIR
- `src/types.ts` — shared types (`DocChunk`, `AskRequest`, `AskResponse`)
- `src/chunking.ts` — `normalizeText`, `splitIntoChunks`
- `src/chunking.test.ts`
- `src/ranking.ts` — `scoreChunk`, `retrieveRelevantChunks`
- `src/ranking.test.ts`
- `src/documents.ts` — `readTextFile`, `readPdfFile`, `loadDocumentsFromFolder` (with mtime-based cache), `indexUploadedBytes` (with hash-based cache)
- `src/documents.test.ts`
- `src/ollama.ts` — `buildPrompt`, `askOllama`
- `src/ollama.test.ts`
- `src/server.ts` — Fastify app factory (routes mounted here)
- `src/index.ts` — server entrypoint (starts listening)

**Frontend (`frontend/`):**
- `package.json` — vue, vite, typescript
- `tsconfig.json`, `tsconfig.node.json`
- `vite.config.ts` — `/api` proxy to `http://localhost:3001`
- `index.html`
- `src/main.ts` — createApp
- `src/App.vue` — layout (sidebar + main)
- `src/api.ts` — `fetchDocsStats`, `uploadFiles`, `askQuestion`
- `src/types.ts` — mirrors backend response shapes
- `src/components/Sidebar.vue` — config + uploader
- `src/components/QuestionPanel.vue` — textarea, button, answer, chunk expander
- `src/style.css`

**Root:**
- `README.md` — updated with new run instructions
- Keep `app.py`, `requirements.txt`, `docs/` untouched (Python version remains runnable; `docs/` is reused by Node backend)

---

## Task 1: Backend Scaffold

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/vitest.config.ts`
- Create: `backend/.env.example`
- Create: `backend/.gitignore`

- [ ] **Step 1: Create backend directory and package.json**

Create `backend/package.json`:

```json
{
  "name": "faq-backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@fastify/cors": "^9.0.1",
    "@fastify/multipart": "^8.3.0",
    "fastify": "^4.28.1",
    "pdf-parse": "^1.1.1"
  },
  "devDependencies": {
    "@types/node": "^20.14.10",
    "@types/pdf-parse": "^1.1.4",
    "tsx": "^4.19.0",
    "typescript": "^5.5.4",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

`backend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": false,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "**/*.test.ts"]
}
```

- [ ] **Step 3: Create vitest.config.ts**

`backend/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 4: Create .env.example and .gitignore**

`backend/.env.example`:

```
PORT=3001
OLLAMA_URL=http://localhost:11434
DEFAULT_MODEL=qwen2.5:3b
DOCS_DIR=../docs
```

`backend/.gitignore`:

```
node_modules/
dist/
.env
```

- [ ] **Step 5: Install deps**

Run: `cd backend && npm install`
Expected: `added N packages`, no errors.

- [ ] **Step 6: Verify scripts work**

Run: `cd backend && npm run typecheck`
Expected: exits 0 (no sources yet).

Run: `cd backend && npm test -- --reporter=verbose`
Expected: "No test files found" (passes with exit 0 when using `--passWithNoTests`; if it fails, that's OK — we add tests in Task 3).

- [ ] **Step 7: Commit**

```bash
git add backend/package.json backend/tsconfig.json backend/vitest.config.ts backend/.env.example backend/.gitignore
git commit -m "chore(backend): scaffold Fastify + TypeScript + Vitest"
```

---

## Task 2: Shared Types

**Files:**
- Create: `backend/src/types.ts`

- [ ] **Step 1: Create types file**

`backend/src/types.ts`:

```ts
export interface DocChunk {
  source: string;
  chunkId: string;
  text: string;
}

export interface AskRequest {
  question: string;
  topK: number;
  model: string;
  ollamaUrl: string;
}

export interface AskResponse {
  answer: string;
  chunks: DocChunk[];
}

export interface DocsStatsResponse {
  count: number;
  folderExists: boolean;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `cd backend && npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add backend/src/types.ts
git commit -m "feat(backend): define shared types"
```

---

## Task 3: Chunking Module (TDD)

**Files:**
- Test: `backend/src/chunking.test.ts`
- Create: `backend/src/chunking.ts`

- [ ] **Step 1: Write failing tests**

`backend/src/chunking.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify failure**

Run: `cd backend && npm test`
Expected: FAIL — `chunking.ts` does not exist.

- [ ] **Step 3: Implement chunking module**

`backend/src/chunking.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify pass**

Run: `cd backend && npm test`
Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/chunking.ts backend/src/chunking.test.ts
git commit -m "feat(backend): chunking with overlap validation"
```

---

## Task 4: Ranking Module (TDD)

**Files:**
- Test: `backend/src/ranking.test.ts`
- Create: `backend/src/ranking.ts`

- [ ] **Step 1: Write failing tests**

`backend/src/ranking.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify failure**

Run: `cd backend && npm test`
Expected: FAIL — `ranking.ts` does not exist.

- [ ] **Step 3: Implement ranking module**

`backend/src/ranking.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify pass**

Run: `cd backend && npm test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/ranking.ts backend/src/ranking.test.ts
git commit -m "feat(backend): keyword ranking with word boundaries"
```

---

## Task 5: Documents Module with Cache (TDD)

**Files:**
- Test: `backend/src/documents.test.ts`
- Create: `backend/src/documents.ts`

- [ ] **Step 1: Write failing tests**

`backend/src/documents.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify failure**

Run: `cd backend && npm test -- documents`
Expected: FAIL — `documents.ts` does not exist.

- [ ] **Step 3: Implement documents module**

`backend/src/documents.ts`:

```ts
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

async function folderSignature(folder: string): Promise<string> {
  if (!existsSync(folder)) return "missing";
  const files = await walkFiles(folder);
  const parts: string[] = [];
  for (const f of files) {
    const s = await stat(f);
    parts.push(`${f}:${s.mtimeMs}:${s.size}`);
  }
  return parts.join("|");
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
  const signature = await folderSignature(folder);
  const cached = folderCache.get(folder);
  if (cached && cached.signature === signature) return cached.chunks;

  const chunks: DocChunk[] = [];
  if (!existsSync(folder)) {
    folderCache.set(folder, { signature, chunks });
    return chunks;
  }

  const files = await walkFiles(folder);
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
```

- [ ] **Step 4: Run tests to verify pass**

Run: `cd backend && npm test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/documents.ts backend/src/documents.test.ts
git commit -m "feat(backend): folder loader + upload indexer with caches"
```

---

## Task 6: Ollama Module (TDD)

**Files:**
- Test: `backend/src/ollama.test.ts`
- Create: `backend/src/ollama.ts`

- [ ] **Step 1: Write failing tests**

`backend/src/ollama.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildPrompt, askOllama } from "./ollama.js";
import type { DocChunk } from "./types.js";

describe("buildPrompt", () => {
  it("includes question and all chunks with source tags", () => {
    const chunks: DocChunk[] = [
      { source: "a.md", chunkId: "a#1", text: "policy text" },
      { source: "b.md", chunkId: "b#1", text: "another fact" },
    ];
    const prompt = buildPrompt("qual a politica?", chunks);
    expect(prompt).toContain("qual a politica?");
    expect(prompt).toContain("policy text");
    expect(prompt).toContain("another fact");
    expect(prompt).toContain("a.md (a#1)");
    expect(prompt).toContain("CONTEXTO:");
    expect(prompt).toContain("RESPOSTA:");
  });
});

describe("askOllama", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("posts to the generate endpoint and returns response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ response: "hello answer" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await askOllama({
      prompt: "pergunta",
      model: "qwen2.5:3b",
      ollamaUrl: "http://localhost:11434",
    });

    expect(result).toBe("hello answer");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:11434/api/generate");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body.model).toBe("qwen2.5:3b");
    expect(body.prompt).toBe("pergunta");
    expect(body.stream).toBe(false);
  });

  it("strips trailing slash from ollamaUrl", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ response: "" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await askOllama({
      prompt: "x",
      model: "m",
      ollamaUrl: "http://localhost:11434/",
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://localhost:11434/api/generate",
    );
  });

  it("throws when response is not ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    }) as unknown as typeof fetch;

    await expect(
      askOllama({ prompt: "x", model: "m", ollamaUrl: "http://h" }),
    ).rejects.toThrow(/500/);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `cd backend && npm test -- ollama`
Expected: FAIL — `ollama.ts` does not exist.

- [ ] **Step 3: Implement ollama module**

`backend/src/ollama.ts`:

```ts
import type { DocChunk } from "./types.js";

export function buildPrompt(question: string, chunks: DocChunk[]): string {
  const contextSections = chunks
    .map((c) => `Fonte: ${c.source} (${c.chunkId})\n${c.text}`)
    .join("\n\n---\n\n");

  return (
    "Voce e um assistente de FAQ interno da empresa. " +
    "Responda em portugues de forma clara e objetiva. " +
    "Use apenas as informacoes do CONTEXTO. " +
    "Se nao houver dados suficientes, diga explicitamente que nao encontrou a informacao nos documentos internos.\n\n" +
    `CONTEXTO:\n${contextSections}\n\n` +
    `PERGUNTA: ${question}\n\n` +
    "RESPOSTA:"
  );
}

export interface AskOllamaArgs {
  prompt: string;
  model: string;
  ollamaUrl: string;
  timeoutMs?: number;
}

export async function askOllama(args: AskOllamaArgs): Promise<string> {
  const { prompt, model, ollamaUrl, timeoutMs = 120_000 } = args;
  const url = `${ollamaUrl.replace(/\/+$/, "")}/api/generate`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: { temperature: 0.2 },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Ollama request failed: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as { response?: string };
    return data.response ?? "";
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `cd backend && npm test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/ollama.ts backend/src/ollama.test.ts
git commit -m "feat(backend): Ollama client + prompt builder"
```

---

## Task 7: Fastify Server + Routes

**Files:**
- Create: `backend/src/server.ts`
- Create: `backend/src/index.ts`

- [ ] **Step 1: Create server factory**

`backend/src/server.ts`:

```ts
import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { resolve } from "node:path";
import {
  loadDocumentsFromFolder,
  indexUploadedBytes,
} from "./documents.js";
import { retrieveRelevantChunks } from "./ranking.js";
import { buildPrompt, askOllama } from "./ollama.js";
import type {
  AskRequest,
  AskResponse,
  DocsStatsResponse,
  DocChunk,
} from "./types.js";

export interface ServerOptions {
  docsDir: string;
  defaultModel: string;
  defaultOllamaUrl: string;
}

export async function createServer(
  opts: ServerOptions,
): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  await app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } });

  const warnings: string[] = [];
  const collectWarning = (msg: string) => {
    app.log.warn(msg);
    warnings.push(msg);
  };

  // In-memory upload session: chunks indexed this run
  const uploadedChunks: DocChunk[] = [];

  app.get("/api/health", async () => ({ ok: true }));

  app.get("/api/docs", async (): Promise<DocsStatsResponse> => {
    const localDocs = await loadDocumentsFromFolder(
      resolve(opts.docsDir),
      collectWarning,
    );
    return {
      count: localDocs.length + uploadedChunks.length,
      folderExists: localDocs.length > 0 || uploadedChunks.length > 0,
    };
  });

  app.post("/api/upload", async (req, reply) => {
    const parts = req.files();
    const newChunks: DocChunk[] = [];
    for await (const part of parts) {
      const buf = await part.toBuffer();
      const chunks = await indexUploadedBytes(
        part.filename,
        buf,
        collectWarning,
      );
      newChunks.push(...chunks);
    }
    uploadedChunks.push(...newChunks);
    return { added: newChunks.length, total: uploadedChunks.length };
  });

  app.delete("/api/uploads", async () => {
    const n = uploadedChunks.length;
    uploadedChunks.length = 0;
    return { cleared: n };
  });

  app.post<{ Body: AskRequest }>(
    "/api/ask",
    async (req, reply): Promise<AskResponse> => {
      const { question, topK, model, ollamaUrl } = req.body;
      if (!question || !question.trim()) {
        return reply.code(400).send({ error: "question is required" }) as never;
      }

      const localDocs = await loadDocumentsFromFolder(
        resolve(opts.docsDir),
        collectWarning,
      );
      const allDocs = [...localDocs, ...uploadedChunks];
      if (allDocs.length === 0) {
        return reply
          .code(400)
          .send({ error: "no documents indexed" }) as never;
      }

      const chunks = retrieveRelevantChunks(question, allDocs, topK || 5);
      if (chunks.length === 0) {
        return { answer: "", chunks: [] };
      }

      const prompt = buildPrompt(question, chunks);
      try {
        const answer = await askOllama({
          prompt,
          model: model || opts.defaultModel,
          ollamaUrl: ollamaUrl || opts.defaultOllamaUrl,
        });
        return { answer, chunks };
      } catch (err) {
        return reply
          .code(502)
          .send({ error: `Ollama error: ${(err as Error).message}` }) as never;
      }
    },
  );

  return app;
}
```

- [ ] **Step 2: Create entrypoint**

`backend/src/index.ts`:

```ts
import { createServer } from "./server.js";

const PORT = Number(process.env.PORT ?? 3001);
const DOCS_DIR = process.env.DOCS_DIR ?? "../docs";
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const DEFAULT_MODEL = process.env.DEFAULT_MODEL ?? "qwen2.5:3b";

const app = await createServer({
  docsDir: DOCS_DIR,
  defaultModel: DEFAULT_MODEL,
  defaultOllamaUrl: OLLAMA_URL,
});

try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
```

- [ ] **Step 3: Typecheck**

Run: `cd backend && npm run typecheck`
Expected: exits 0.

- [ ] **Step 4: Start server and smoke test**

Run (in one terminal): `cd backend && npm run dev`
Expected: logs "Server listening at http://0.0.0.0:3001".

Run (in another terminal): `curl http://localhost:3001/api/health`
Expected: `{"ok":true}`

Run: `curl http://localhost:3001/api/docs`
Expected: JSON with `count` and `folderExists`.

Stop server with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add backend/src/server.ts backend/src/index.ts
git commit -m "feat(backend): Fastify server with /api/docs /api/upload /api/ask"
```

---

## Task 8: Frontend Scaffold

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.ts`
- Create: `frontend/src/App.vue`
- Create: `frontend/src/style.css`
- Create: `frontend/.gitignore`

- [ ] **Step 1: Create package.json**

`frontend/package.json`:

```json
{
  "name": "faq-frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "vue-tsc --noEmit"
  },
  "dependencies": {
    "vue": "^3.5.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.1.3",
    "typescript": "^5.5.4",
    "vite": "^5.4.6",
    "vue-tsc": "^2.1.6"
  }
}
```

- [ ] **Step 2: Create tsconfig files**

`frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "preserve",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "noEmit": true
  },
  "include": ["src/**/*.ts", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`frontend/tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 3: Create vite.config.ts with proxy**

`frontend/vite.config.ts`:

```ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 4: Create index.html**

`frontend/index.html`:

```html
<!doctype html>
<html lang="pt-br">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FAQ Interno Local</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: Create main.ts and App.vue skeleton**

`frontend/src/main.ts`:

```ts
import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";

createApp(App).mount("#app");
```

`frontend/src/App.vue`:

```vue
<script setup lang="ts">
</script>

<template>
  <div class="layout">
    <h1>FAQ Interno (LLM Local)</h1>
    <p>Em construcao...</p>
  </div>
</template>

<style scoped>
.layout {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem;
}
</style>
```

`frontend/src/style.css`:

```css
:root {
  font-family: system-ui, -apple-system, sans-serif;
  color-scheme: light dark;
}

body {
  margin: 0;
  background: #fafafa;
}
```

`frontend/.gitignore`:

```
node_modules/
dist/
.vite/
```

- [ ] **Step 6: Install and verify**

Run: `cd frontend && npm install`
Expected: packages installed.

Run: `cd frontend && npm run typecheck`
Expected: exits 0.

Run: `cd frontend && npm run dev`
Expected: Vite starts on http://localhost:5173 showing "Em construcao...". Stop with Ctrl+C.

- [ ] **Step 7: Commit**

```bash
git add frontend/package.json frontend/tsconfig.json frontend/tsconfig.node.json frontend/vite.config.ts frontend/index.html frontend/src/main.ts frontend/src/App.vue frontend/src/style.css frontend/.gitignore
git commit -m "chore(frontend): scaffold Vite + Vue 3 + TypeScript"
```

---

## Task 9: Frontend Types and API Client

**Files:**
- Create: `frontend/src/types.ts`
- Create: `frontend/src/api.ts`

- [ ] **Step 1: Create types mirroring backend**

`frontend/src/types.ts`:

```ts
export interface DocChunk {
  source: string;
  chunkId: string;
  text: string;
}

export interface DocsStats {
  count: number;
  folderExists: boolean;
}

export interface AskResponse {
  answer: string;
  chunks: DocChunk[];
}
```

- [ ] **Step 2: Create api.ts**

`frontend/src/api.ts`:

```ts
import type { AskResponse, DocsStats } from "./types.js";

export async function fetchDocsStats(): Promise<DocsStats> {
  const res = await fetch("/api/docs");
  if (!res.ok) throw new Error(`GET /api/docs failed: ${res.status}`);
  return res.json();
}

export async function uploadFiles(
  files: File[],
): Promise<{ added: number; total: number }> {
  const form = new FormData();
  for (const f of files) form.append("file", f, f.name);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) throw new Error(`POST /api/upload failed: ${res.status}`);
  return res.json();
}

export async function clearUploads(): Promise<void> {
  const res = await fetch("/api/uploads", { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE /api/uploads failed: ${res.status}`);
}

export interface AskArgs {
  question: string;
  topK: number;
  model: string;
  ollamaUrl: string;
}

export async function askQuestion(args: AskArgs): Promise<AskResponse> {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(data.error ?? `POST /api/ask failed: ${res.status}`);
  }
  return res.json();
}
```

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types.ts frontend/src/api.ts
git commit -m "feat(frontend): API client and shared types"
```

---

## Task 10: Sidebar Component (config + upload)

**Files:**
- Create: `frontend/src/components/Sidebar.vue`

- [ ] **Step 1: Create Sidebar component**

`frontend/src/components/Sidebar.vue`:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { uploadFiles, clearUploads } from "../api.js";

const props = defineProps<{
  ollamaUrl: string;
  model: string;
  topK: number;
}>();

const emit = defineEmits<{
  (e: "update:ollamaUrl", v: string): void;
  (e: "update:model", v: string): void;
  (e: "update:topK", v: number): void;
  (e: "uploaded"): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const status = ref("");

async function onFiles(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  uploading.value = true;
  status.value = "";
  try {
    const result = await uploadFiles(Array.from(input.files));
    status.value = `+${result.added} trechos (total: ${result.total})`;
    emit("uploaded");
  } catch (err) {
    status.value = `Erro: ${(err as Error).message}`;
  } finally {
    uploading.value = false;
    if (fileInput.value) fileInput.value.value = "";
  }
}

async function onClearUploads() {
  await clearUploads();
  status.value = "Uploads limpos";
  emit("uploaded");
}
</script>

<template>
  <aside class="sidebar">
    <h2>Configuracao</h2>

    <label>
      URL do Ollama
      <input
        type="text"
        :value="props.ollamaUrl"
        @input="emit('update:ollamaUrl', ($event.target as HTMLInputElement).value)"
      />
    </label>

    <label>
      Modelo
      <input
        type="text"
        :value="props.model"
        @input="emit('update:model', ($event.target as HTMLInputElement).value)"
      />
    </label>

    <label>
      Trechos usados na resposta: {{ props.topK }}
      <input
        type="range"
        min="1"
        max="10"
        :value="props.topK"
        @input="emit('update:topK', Number(($event.target as HTMLInputElement).value))"
      />
    </label>

    <h3>Documentos</h3>
    <p class="hint">1) Arquivos da pasta ./docs (carregados pelo backend)</p>
    <p class="hint">2) Upload rapido (opcional)</p>

    <input
      ref="fileInput"
      type="file"
      accept=".txt,.md,.pdf"
      multiple
      :disabled="uploading"
      @change="onFiles"
    />
    <button type="button" @click="onClearUploads" :disabled="uploading">
      Limpar uploads
    </button>
    <p v-if="status" class="status">{{ status }}</p>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
}
label {
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
  gap: 0.25rem;
}
input[type="text"] {
  padding: 0.4rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
button {
  padding: 0.4rem 0.8rem;
  cursor: pointer;
}
.hint {
  margin: 0;
  font-size: 0.8rem;
  color: #666;
}
.status {
  font-size: 0.85rem;
  color: #333;
}
</style>
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Sidebar.vue
git commit -m "feat(frontend): sidebar with config inputs and uploader"
```

---

## Task 11: QuestionPanel Component

**Files:**
- Create: `frontend/src/components/QuestionPanel.vue`

- [ ] **Step 1: Create QuestionPanel**

`frontend/src/components/QuestionPanel.vue`:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { askQuestion } from "../api.js";
import type { DocChunk } from "../types.js";

const props = defineProps<{
  ollamaUrl: string;
  model: string;
  topK: number;
  docsCount: number;
}>();

const question = ref("");
const answer = ref("");
const chunks = ref<DocChunk[]>([]);
const loading = ref(false);
const error = ref("");
const showChunks = ref(false);

async function onAsk() {
  const q = question.value.trim();
  if (!q) {
    error.value = "Digite uma pergunta.";
    return;
  }
  if (props.docsCount === 0) {
    error.value = "Nenhum documento foi carregado/indexado.";
    return;
  }
  loading.value = true;
  error.value = "";
  answer.value = "";
  chunks.value = [];
  try {
    const result = await askQuestion({
      question: q,
      topK: props.topK,
      model: props.model,
      ollamaUrl: props.ollamaUrl,
    });
    if (result.chunks.length === 0) {
      error.value =
        "Nao encontrei trechos relevantes. Tente reformular a pergunta.";
    } else {
      answer.value = result.answer;
      chunks.value = result.chunks;
    }
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="panel">
    <label>
      Pergunta
      <textarea
        v-model="question"
        rows="5"
        placeholder="Exemplo: Qual e o horario do suporte interno?"
      ></textarea>
    </label>

    <button type="button" :disabled="loading" @click="onAsk">
      {{ loading ? "Consultando modelo local..." : "Perguntar" }}
    </button>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="answer" class="answer">
      <h3>Resposta</h3>
      <p>{{ answer }}</p>
    </div>

    <div v-if="chunks.length > 0" class="chunks">
      <button type="button" class="link" @click="showChunks = !showChunks">
        {{ showChunks ? "Ocultar" : "Mostrar" }} trechos usados ({{ chunks.length }})
      </button>
      <div v-if="showChunks">
        <div v-for="c in chunks" :key="c.chunkId" class="chunk">
          <strong>{{ c.source }} ({{ c.chunkId }})</strong>
          <p>{{ c.text }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
}
textarea {
  width: 100%;
  padding: 0.5rem;
  font: inherit;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: vertical;
}
button {
  align-self: flex-start;
  padding: 0.5rem 1rem;
  cursor: pointer;
  background: #1f6feb;
  color: white;
  border: none;
  border-radius: 4px;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.error {
  color: #c53030;
}
.answer p {
  white-space: pre-wrap;
}
.link {
  background: transparent;
  color: #1f6feb;
  padding: 0;
  text-decoration: underline;
}
.chunk {
  margin-top: 0.75rem;
  padding: 0.5rem;
  background: #f6f8fa;
  border-radius: 4px;
  font-size: 0.9rem;
}
</style>
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/QuestionPanel.vue
git commit -m "feat(frontend): question panel with answer and chunks"
```

---

## Task 12: Wire App.vue Layout

**Files:**
- Modify: `frontend/src/App.vue`

- [ ] **Step 1: Replace App.vue contents**

`frontend/src/App.vue`:

```vue
<script setup lang="ts">
import { ref, onMounted } from "vue";
import Sidebar from "./components/Sidebar.vue";
import QuestionPanel from "./components/QuestionPanel.vue";
import { fetchDocsStats } from "./api.js";

const ollamaUrl = ref("http://localhost:11434");
const model = ref("qwen2.5:3b");
const topK = ref(5);

const docsCount = ref(0);
const loadError = ref("");

async function refreshStats() {
  try {
    const stats = await fetchDocsStats();
    docsCount.value = stats.count;
  } catch (err) {
    loadError.value = (err as Error).message;
  }
}

onMounted(refreshStats);
</script>

<template>
  <div class="layout">
    <header>
      <h1>FAQ Interno (LLM Local)</h1>
      <p class="caption">Sem API online: usa Ollama rodando localmente.</p>
    </header>

    <div class="grid">
      <Sidebar
        v-model:ollamaUrl="ollamaUrl"
        v-model:model="model"
        v-model:topK="topK"
        @uploaded="refreshStats"
      />
      <main>
        <div class="stats">
          Trechos indexados: <strong>{{ docsCount }}</strong>
          <span v-if="loadError" class="error"> — {{ loadError }}</span>
        </div>
        <QuestionPanel
          :ollama-url="ollamaUrl"
          :model="model"
          :top-k="topK"
          :docs-count="docsCount"
        />
      </main>
    </div>
  </div>
</template>

<style scoped>
.layout {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
}
.caption {
  color: #666;
  margin-top: -0.5rem;
}
.grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 1rem;
}
.stats {
  padding: 0.5rem 1rem;
  margin-bottom: 0.75rem;
  background: #eef;
  border-radius: 4px;
}
.error {
  color: #c53030;
}
@media (max-width: 800px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
```

- [ ] **Step 2: Typecheck + build**

Run: `cd frontend && npm run typecheck`
Expected: exits 0.

Run: `cd frontend && npm run build`
Expected: successful build into `dist/`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.vue
git commit -m "feat(frontend): wire sidebar + question panel in App"
```

---

## Task 13: Frontend Unit Tests

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/test-setup.ts`
- Create: `frontend/src/components/Sidebar.test.ts`
- Create: `frontend/src/components/QuestionPanel.test.ts`

- [ ] **Step 1: Add test deps and scripts to package.json**

Replace `frontend/package.json` with:

```json
{
  "name": "faq-frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "vue-tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "vue": "^3.5.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.1.3",
    "@vue/test-utils": "^2.4.6",
    "happy-dom": "^15.7.4",
    "typescript": "^5.5.4",
    "vite": "^5.4.6",
    "vitest": "^2.0.5",
    "vue-tsc": "^2.1.6"
  }
}
```

Run: `cd frontend && npm install`
Expected: new packages installed.

- [ ] **Step 2: Create vitest.config.ts**

`frontend/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test-setup.ts"],
    globals: false,
  },
});
```

- [ ] **Step 3: Create test setup**

`frontend/src/test-setup.ts`:

```ts
import { vi } from "vitest";

if (!globalThis.fetch) {
  globalThis.fetch = vi.fn();
}
```

- [ ] **Step 4: Write Sidebar tests**

`frontend/src/components/Sidebar.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import Sidebar from "./Sidebar.vue";

vi.mock("../api.js", () => ({
  uploadFiles: vi.fn(),
  clearUploads: vi.fn(),
}));

import { uploadFiles, clearUploads } from "../api.js";

const baseProps = {
  ollamaUrl: "http://localhost:11434",
  model: "qwen2.5:3b",
  topK: 5,
};

beforeEach(() => {
  vi.mocked(uploadFiles).mockReset();
  vi.mocked(clearUploads).mockReset();
});

describe("Sidebar", () => {
  it("renders current config values", () => {
    const wrapper = mount(Sidebar, { props: baseProps });
    const textInputs = wrapper.findAll('input[type="text"]');
    expect(textInputs[0].element.value).toBe("http://localhost:11434");
    expect(textInputs[1].element.value).toBe("qwen2.5:3b");
    expect(wrapper.text()).toContain("Trechos usados na resposta: 5");
  });

  it("emits update:ollamaUrl when the URL input changes", async () => {
    const wrapper = mount(Sidebar, { props: baseProps });
    const input = wrapper.findAll('input[type="text"]')[0];
    await input.setValue("http://other:11434");
    expect(wrapper.emitted("update:ollamaUrl")?.[0]).toEqual([
      "http://other:11434",
    ]);
  });

  it("emits update:topK as number when range changes", async () => {
    const wrapper = mount(Sidebar, { props: baseProps });
    const range = wrapper.find('input[type="range"]');
    await range.setValue(8);
    const payload = wrapper.emitted("update:topK")?.[0];
    expect(payload).toBeDefined();
    expect(typeof payload![0]).toBe("number");
    expect(payload![0]).toBe(8);
  });

  it("calls clearUploads and emits uploaded when Limpar is clicked", async () => {
    vi.mocked(clearUploads).mockResolvedValue(undefined);
    const wrapper = mount(Sidebar, { props: baseProps });
    const buttons = wrapper.findAll("button");
    const clearBtn = buttons.find((b) => b.text().includes("Limpar"))!;
    await clearBtn.trigger("click");
    await wrapper.vm.$nextTick();
    await Promise.resolve();
    expect(clearUploads).toHaveBeenCalledOnce();
    expect(wrapper.emitted("uploaded")).toBeTruthy();
  });
});
```

- [ ] **Step 5: Write QuestionPanel tests**

`frontend/src/components/QuestionPanel.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import QuestionPanel from "./QuestionPanel.vue";

vi.mock("../api.js", () => ({
  askQuestion: vi.fn(),
}));

import { askQuestion } from "../api.js";

const baseProps = {
  ollamaUrl: "http://localhost:11434",
  model: "qwen2.5:3b",
  topK: 5,
  docsCount: 3,
};

beforeEach(() => {
  vi.mocked(askQuestion).mockReset();
});

describe("QuestionPanel", () => {
  it("shows error when question is empty", async () => {
    const wrapper = mount(QuestionPanel, { props: baseProps });
    await wrapper.find("button").trigger("click");
    expect(wrapper.text()).toContain("Digite uma pergunta");
    expect(askQuestion).not.toHaveBeenCalled();
  });

  it("shows error when docsCount is 0", async () => {
    const wrapper = mount(QuestionPanel, {
      props: { ...baseProps, docsCount: 0 },
    });
    await wrapper.find("textarea").setValue("oi");
    await wrapper.find("button").trigger("click");
    expect(wrapper.text()).toContain("Nenhum documento foi carregado");
    expect(askQuestion).not.toHaveBeenCalled();
  });

  it("calls askQuestion with props and renders answer + chunks", async () => {
    vi.mocked(askQuestion).mockResolvedValue({
      answer: "resposta gerada",
      chunks: [
        { source: "a.md", chunkId: "a#1", text: "texto do chunk" },
      ],
    });
    const wrapper = mount(QuestionPanel, { props: baseProps });
    await wrapper.find("textarea").setValue("qual a politica?");
    await wrapper.find("button").trigger("click");
    await flushPromises();

    expect(askQuestion).toHaveBeenCalledWith({
      question: "qual a politica?",
      topK: 5,
      model: "qwen2.5:3b",
      ollamaUrl: "http://localhost:11434",
    });
    expect(wrapper.text()).toContain("resposta gerada");
    const toggle = wrapper
      .findAll("button")
      .find((b) => b.text().includes("trechos usados"))!;
    await toggle.trigger("click");
    expect(wrapper.text()).toContain("a.md (a#1)");
    expect(wrapper.text()).toContain("texto do chunk");
  });

  it("shows warning when no chunks are returned", async () => {
    vi.mocked(askQuestion).mockResolvedValue({ answer: "", chunks: [] });
    const wrapper = mount(QuestionPanel, { props: baseProps });
    await wrapper.find("textarea").setValue("foo");
    await wrapper.find("button").trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("Nao encontrei trechos relevantes");
  });

  it("shows error message when askQuestion rejects", async () => {
    vi.mocked(askQuestion).mockRejectedValue(new Error("Ollama offline"));
    const wrapper = mount(QuestionPanel, { props: baseProps });
    await wrapper.find("textarea").setValue("foo");
    await wrapper.find("button").trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("Ollama offline");
  });
});
```

- [ ] **Step 6: Run tests**

Run: `cd frontend && npm test`
Expected: all Sidebar + QuestionPanel tests PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/package.json frontend/vitest.config.ts frontend/src/test-setup.ts frontend/src/components/Sidebar.test.ts frontend/src/components/QuestionPanel.test.ts
git commit -m "test(frontend): unit tests for Sidebar and QuestionPanel"
```

---

## Task 14: End-to-end Smoke Test

**Files:** none created.

- [ ] **Step 1: Ensure Ollama is running**

Run: `curl http://localhost:11434`
Expected: response like "Ollama is running" (body text).

If not running: `sudo systemctl start ollama`

Run: `ollama list`
Expected: shows at least one model (e.g. `qwen2.5:3b`). If missing, run `ollama pull qwen2.5:3b`.

- [ ] **Step 2: Start backend**

Run (terminal 1): `cd backend && npm run dev`
Expected: `Server listening on http://0.0.0.0:3001`.

- [ ] **Step 3: Start frontend**

Run (terminal 2): `cd frontend && npm run dev`
Expected: `Local: http://localhost:5173/`.

- [ ] **Step 4: Manual test in browser**

1. Open http://localhost:5173 in a browser.
2. Verify "Trechos indexados" shows a count > 0 (the existing `docs/exemplo_politicas.md` should be loaded).
3. Type a question related to that document (e.g. "qual a politica de ferias?").
4. Click "Perguntar" — an answer appears and "Mostrar trechos usados" reveals the source chunks.
5. Upload a `.txt` file via the sidebar — "Trechos indexados" increases.
6. Ask a question that references the uploaded file — verify it shows in the used chunks.
7. Click "Limpar uploads" — count drops back to the folder-only count.

Expected: all interactions work without console errors in the browser or backend.

- [ ] **Step 5: Commit any tweaks discovered during smoke test**

If adjustments were needed, commit each fix:

```bash
git add <files>
git commit -m "fix(frontend|backend): <what was adjusted>"
```

If nothing needed fixing, skip this step.

---

## Task 15: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace README with Node/Vue-first instructions**

Replace contents of `README.md`:

```markdown
# FAQ Interno Local (Node + Vue + Ollama)

FAQ interno local com IA via Ollama, backend Node/TypeScript e frontend Vue 3.

## Arquitetura

- `backend/` — API Fastify (TypeScript) que le `./docs`, aceita uploads, chama Ollama.
- `frontend/` — SPA Vue 3 (Vite + TypeScript) consumindo a API.
- `docs/` — base de conhecimento local (`.txt`, `.md`, `.pdf`).
- `app.py` — versao antiga (Streamlit), mantida por referencia.

## Requisitos

- Node 20+
- Ollama instalado e rodando

## Setup

```bash
# Ollama
curl -fsSL https://ollama.com/install.sh | sh
sudo systemctl enable --now ollama
ollama pull qwen2.5:3b

# Backend
cd backend
cp .env.example .env
npm install
npm run dev   # http://localhost:3001

# Frontend (em outro terminal)
cd frontend
npm install
npm run dev   # http://localhost:5173
```

Abra http://localhost:5173 no navegador.

## Testes

```bash
cd backend && npm test
```

## Limites (MVP)

- Ranking textual simples (sem embeddings)
- Sem autenticacao
- Sem historico persistido

## Versao antiga (Python/Streamlit)

Ainda funciona:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
streamlit run app.py
```
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README for Node + Vue stack"
```

---

## Self-Review Checklist

Spec coverage:
- Folder doc loading: Task 5 (`loadDocumentsFromFolder`)
- Upload indexing: Task 5 (`indexUploadedBytes`) + Task 7 (`/api/upload`)
- Chunking with overlap validation: Task 3
- Word-boundary ranking: Task 4
- Prompt builder + Ollama call: Task 6
- Streamlit sidebar -> Vue Sidebar: Task 10
- Question UI -> Vue QuestionPanel: Task 11
- Frontend unit tests (Sidebar + QuestionPanel): Task 13
- Caching of folder and uploads: Task 5 (mtime/size signature + content hash)
- PDF error warning: Task 5 (`onWarning` callback) + Task 7 (logger)
- Strip trailing slash in Ollama URL: Task 6

All requirements covered. No placeholders. Type names consistent across tasks (`DocChunk`, `AskRequest`, `AskResponse`, `DocsStatsResponse`).
