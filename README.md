# FAQ Interno Local (Node + Vue + Ollama)

FAQ interno local com IA via Ollama, backend Node/TypeScript e frontend Vue 3. Sem API online — roda 100% na sua maquina.

## Arquitetura

```
ia-test/
├── backend/          # API Fastify + TypeScript (porta 3001)
│   └── src/
│       ├── chunking.ts       # split de texto com overlap
│       ├── ranking.ts        # busca por palavras com word-boundary
│       ├── documents.ts      # leitura de pasta + uploads (com cache)
│       ├── ollama.ts         # cliente Ollama + prompt builder
│       ├── server.ts         # rotas Fastify
│       ├── index.ts          # entrypoint
│       └── *.test.ts         # 29 testes (Vitest)
├── frontend/         # SPA Vue 3 + Vite + TypeScript (porta 5173)
│   └── src/
│       ├── App.vue
│       ├── api.ts            # fetch helpers
│       ├── components/
│       │   ├── Sidebar.vue        # config + upload
│       │   └── QuestionPanel.vue  # pergunta + resposta
│       └── components/*.test.ts   # 9 testes (Vitest + @vue/test-utils)
├── docs/             # base de conhecimento (.txt, .md, .pdf)
└── app.py            # versao antiga em Streamlit, mantida por referencia
```

Fluxo: usuario escreve pergunta -> frontend chama `/api/ask` -> backend carrega `docs/`, ranqueia os trechos mais relevantes, monta prompt com o contexto e chama Ollama local -> resposta retorna.

## Requisitos

- Node 20+
- Ollama instalado e rodando (modelo `qwen2.5:3b` sugerido, ~1.9 GB)

## Setup

```bash
# 1) Ollama
curl -fsSL https://ollama.com/install.sh | sh
sudo systemctl enable --now ollama
ollama pull qwen2.5:3b

# 2) Backend (terminal 1)
cd backend
cp .env.example .env       # ajuste se quiser outra porta/modelo
npm install
npm run dev                # http://localhost:3001

# 3) Frontend (terminal 2)
cd frontend
npm install
npm run dev                # http://localhost:5173
```

Abra http://localhost:5173 no navegador.

## Configuracao (backend `.env`)

| Variavel        | Default                  | Descricao                              |
| --------------- | ------------------------ | -------------------------------------- |
| `PORT`          | `3001`                   | Porta da API                           |
| `OLLAMA_URL`    | `http://localhost:11434` | Endpoint do Ollama                     |
| `DEFAULT_MODEL` | `qwen2.5:3b`             | Modelo usado se o frontend nao passar  |
| `DOCS_DIR`      | `../docs`                | Pasta lida recursivamente como base    |

> Aviso: `DOCS_DIR` e varrido recursivamente. Qualquer `.txt`/`.md`/`.pdf` abaixo dele vira conhecimento da FAQ. Mantenha so o que voce quer responder.

## Endpoints da API

| Metodo   | Rota             | Descricao                                               |
| -------- | ---------------- | ------------------------------------------------------- |
| `GET`    | `/api/health`    | `{ "ok": true }`                                        |
| `GET`    | `/api/docs`      | `{ "count": N, "folderExists": bool }` (trechos)        |
| `POST`   | `/api/upload`    | multipart com arquivos; retorna `{ added, total }`      |
| `DELETE` | `/api/uploads`   | limpa uploads da sessao                                 |
| `POST`   | `/api/ask`       | body `{ question, topK, model, ollamaUrl }` -> resposta |

Exemplo:

```bash
curl -X POST http://localhost:3001/api/ask \
  -H "content-type: application/json" \
  -d '{"question":"Qual o horario do suporte?","topK":5,"model":"qwen2.5:3b","ollamaUrl":"http://localhost:11434"}'
```

## Testes

Total: **38 testes** (29 backend + 9 frontend).

```bash
# Backend (Vitest, node)
cd backend && npm test

# Frontend (Vitest + @vue/test-utils + happy-dom)
cd frontend && npm test
```

Cobertura de teste:

- `chunking`: normalizacao de texto, split com overlap, validacao de parametros
- `ranking`: word-boundary (evita match parcial), ordenacao por score, topK
- `documents`: leitura de pasta, cache por mtime/size, invalidacao, uploads com hash
- `ollama`: construcao de prompt, chamada HTTP, tratamento de erro
- `Sidebar.vue`: render de props, emit de eventos, upload e clear
- `QuestionPanel.vue`: validacoes, chamada de API, render de resposta e trechos, erros

## Build de producao (frontend)

```bash
cd frontend && npm run build    # gera dist/ estatico
```

O backend nao tem build separado — roda direto com `tsx` em dev. Para producao: `npm run build` gera `dist/`, depois `npm start`.

## Limites (MVP)

- Ranking textual simples por palavras-chave (sem embeddings)
- Sem autenticacao
- Sem historico persistido entre sessoes
- Uploads ficam so em memoria (limpos ao reiniciar o backend)

## Proximos passos sugeridos

1. Embeddings + banco vetorial (ex: Chroma, sqlite-vec)
2. Ranking hibrido (BM25 + vetor)
3. Autenticacao e controle de acesso por usuario
4. Log persistente de perguntas e respostas

## Versao antiga (Python/Streamlit)

Mantida como referencia. Ainda roda:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
streamlit run app.py
```
