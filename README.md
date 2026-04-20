# FAQ Interno Local (Streamlit + Ollama)

Aplicacao simples de FAQ interno usando IA local, sem API online.

## O que este MVP faz

- Le arquivos locais em `./docs` (`.txt`, `.md`, `.pdf`)
- Permite upload rapido de arquivos na interface
- Faz busca simples por relevancia textual
- Envia contexto para um modelo local no Ollama
- Gera resposta em portugues

## Requisitos

- Python 3.10+
- Ollama instalado e rodando localmente

## 0) Instalar Ollama (Ubuntu)

Se ainda nao tem Ollama instalado:

```bash
sudo apt update
sudo apt install -y curl
curl -fsSL https://ollama.com/install.sh | sh
```

Habilitar o serviço para iniciar automaticamente:

```bash
sudo systemctl enable --now ollama
sudo systemctl status ollama
```

Testar se esta funcionando:

```bash
curl http://localhost:11434
```

## 1) Subir um modelo no Ollama

Exemplo com modelo leve:

```bash
ollama pull qwen2.5:3b
ollama run qwen2.5:3b
```

> Dica: se preferir, use `llama3.2:3b`.

## 2) Instalar dependencias

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 3) Adicionar documentos internos

Coloque seus arquivos em `./docs`.

Exemplo:

- `docs/politicas.md`
- `docs/faq_rh.txt`
- `docs/manual_suporte.pdf`

## 4) Rodar a app

```bash
streamlit run app.py
```

Abra no navegador o endereco mostrado pelo Streamlit.

## Configuracao na tela

- URL do Ollama: `http://localhost:11434`
- Modelo: `qwen2.5:3b`
- Trechos usados: define quantos blocos de contexto vao para o prompt

## Gerenciar Ollama

**Parar o Ollama (para liberar memoria):**

```bash
sudo systemctl stop ollama
```

**Verificar status:**

```bash
sudo systemctl status ollama
```

**Reiniciar o Ollama:**

```bash
sudo systemctl start ollama
```

**Desabilitar inicio automatico no boot:**

```bash
sudo systemctl disable ollama
```

> Dica: Ollama so consome RAM quando esta rodando. Pare o serviço para liberar memoria quando nao estiver usando a app.

## Limites do MVP

- Busca textual simples (nao usa embeddings)
- Sem autenticacao
- Sem historico de conversas persistente

## Proximos passos (quando quiser evoluir)

1. Adicionar embeddings + banco vetorial (ex: Chroma)
2. Melhorar ranking (BM25/hibrido)
3. Incluir controle de acesso por usuario
4. Salvar logs de perguntas e respostas
