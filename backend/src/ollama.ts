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
