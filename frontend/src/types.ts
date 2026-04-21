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
