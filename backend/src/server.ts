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
        const startedAt = Date.now();
        const answer = await askOllama({
          prompt,
          model: model || opts.defaultModel,
          ollamaUrl: ollamaUrl || opts.defaultOllamaUrl,
        });
        const elapsedMs = Date.now() - startedAt;
        return { answer, chunks, elapsedMs };
      } catch (err) {
        return reply
          .code(502)
          .send({ error: `Ollama error: ${(err as Error).message}` }) as never;
      }
    },
  );

  return app;
}
