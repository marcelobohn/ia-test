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
