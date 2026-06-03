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
  elapsedMs?: number;
}

export interface DocsStatsResponse {
  count: number;
  folderExists: boolean;
}
