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
