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
cd frontend && npm test
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
