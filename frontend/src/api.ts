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
  temperature: number;
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
