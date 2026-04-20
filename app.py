import io
import re
from pathlib import Path
from typing import Dict, List

import requests
import streamlit as st

try:
    from pypdf import PdfReader
except Exception:
    PdfReader = None


DEFAULT_OLLAMA_URL = "http://localhost:11434"
DEFAULT_MODEL = "qwen2.5:3b"
DATA_DIR = Path("./docs")


def normalize_text(text: str) -> str:
    text = text.replace("\u00a0", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def split_into_chunks(text: str, max_chars: int = 900, overlap: int = 150) -> List[str]:
    text = normalize_text(text)
    if not text:
        return []

    chunks: List[str] = []
    start = 0
    text_len = len(text)

    while start < text_len:
        end = min(start + max_chars, text_len)
        chunk = text[start:end]
        chunks.append(chunk)
        if end == text_len:
            break
        start = max(0, end - overlap)

    return chunks


def read_text_file(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def read_pdf_file(path: Path) -> str:
    if PdfReader is None:
        return ""

    try:
        reader = PdfReader(str(path))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(pages)
    except Exception:
        return ""


def load_documents_from_folder(folder: Path) -> List[Dict[str, str]]:
    documents: List[Dict[str, str]] = []
    if not folder.exists():
        return documents

    for path in sorted(folder.rglob("*")):
        if not path.is_file():
            continue

        suffix = path.suffix.lower()
        if suffix not in {".txt", ".md", ".pdf"}:
            continue

        if suffix == ".pdf":
            content = read_pdf_file(path)
        else:
            content = read_text_file(path)

        if not content.strip():
            continue

        for i, chunk in enumerate(split_into_chunks(content), start=1):
            documents.append(
                {
                    "source": str(path),
                    "chunk_id": f"{path.name}#{i}",
                    "text": chunk,
                }
            )

    return documents


def score_chunk(query: str, chunk_text: str) -> int:
    words = re.findall(r"\w+", query.lower())
    if not words:
        return 0

    lowered = chunk_text.lower()
    return sum(lowered.count(word) for word in words)


def retrieve_relevant_chunks(query: str, documents: List[Dict[str, str]], top_k: int = 5) -> List[Dict[str, str]]:
    scored = []
    for doc in documents:
        score = score_chunk(query, doc["text"])
        if score > 0:
            scored.append((score, doc))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [item[1] for item in scored[:top_k]]


def build_prompt(question: str, chunks: List[Dict[str, str]]) -> str:
    context_sections = []
    for c in chunks:
        context_sections.append(f"Fonte: {c['source']} ({c['chunk_id']})\n{c['text']}")

    context_text = "\n\n---\n\n".join(context_sections)

    return (
        "Voce e um assistente de FAQ interno da empresa. "
        "Responda em portugues de forma clara e objetiva. "
        "Use apenas as informacoes do CONTEXTO. "
        "Se nao houver dados suficientes, diga explicitamente que nao encontrou a informacao nos documentos internos.\n\n"
        f"CONTEXTO:\n{context_text}\n\n"
        f"PERGUNTA: {question}\n\n"
        "RESPOSTA:"
    )


def ask_ollama(prompt: str, model: str, ollama_url: str) -> str:
    url = f"{ollama_url.rstrip('/')}/api/generate"
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.2,
        },
    }

    response = requests.post(url, json=payload, timeout=120)
    response.raise_for_status()
    data = response.json()
    return data.get("response", "")


def index_uploaded_files(files) -> List[Dict[str, str]]:
    docs: List[Dict[str, str]] = []

    for uploaded in files:
        name = uploaded.name
        suffix = Path(name).suffix.lower()
        content = ""

        if suffix in {".txt", ".md"}:
            content = uploaded.read().decode("utf-8", errors="ignore")
        elif suffix == ".pdf" and PdfReader is not None:
            pdf_stream = io.BytesIO(uploaded.read())
            try:
                reader = PdfReader(pdf_stream)
                content = "\n".join((page.extract_text() or "") for page in reader.pages)
            except Exception:
                content = ""

        if not content.strip():
            continue

        for i, chunk in enumerate(split_into_chunks(content), start=1):
            docs.append(
                {
                    "source": f"upload/{name}",
                    "chunk_id": f"{name}#{i}",
                    "text": chunk,
                }
            )

    return docs


def main() -> None:
    st.set_page_config(page_title="FAQ Interno Local", page_icon="🧠", layout="wide")
    st.title("FAQ Interno (LLM Local)")
    st.caption("Sem API online: usa Ollama rodando localmente.")

    with st.sidebar:
        st.header("Configuracao")
        ollama_url = st.text_input("URL do Ollama", value=DEFAULT_OLLAMA_URL)
        model = st.text_input("Modelo", value=DEFAULT_MODEL)
        top_k = st.slider("Trechos usados na resposta", min_value=1, max_value=10, value=5)

        st.markdown("### Documentos")
        st.write("1) Arquivos da pasta local ./docs")
        st.write("2) Upload rapido (opcional)")
        uploads = st.file_uploader(
            "Envie .txt, .md ou .pdf",
            type=["txt", "md", "pdf"],
            accept_multiple_files=True,
        )

    local_docs = load_documents_from_folder(DATA_DIR)
    uploaded_docs = index_uploaded_files(uploads or [])
    all_docs = local_docs + uploaded_docs

    col1, col2 = st.columns([1, 2])
    with col1:
        st.metric("Trechos indexados", len(all_docs))
        if not DATA_DIR.exists():
            st.info("A pasta ./docs ainda nao existe. Crie-a para usar base local fixa.")

    with col2:
        question = st.text_area(
            "Pergunta",
            placeholder="Exemplo: Qual e o horario do suporte interno?",
            height=120,
        )

        if st.button("Perguntar", type="primary"):
            if not question.strip():
                st.warning("Digite uma pergunta.")
                return

            if not all_docs:
                st.warning("Nenhum documento foi carregado/indexado.")
                return

            chunks = retrieve_relevant_chunks(question, all_docs, top_k=top_k)
            if not chunks:
                st.warning("Nao encontrei trechos relevantes. Tente reformular a pergunta.")
                return

            prompt = build_prompt(question, chunks)

            with st.spinner("Consultando modelo local..."):
                try:
                    answer = ask_ollama(prompt, model=model, ollama_url=ollama_url)
                except requests.RequestException as exc:
                    st.error(f"Falha ao chamar Ollama: {exc}")
                    return

            st.subheader("Resposta")
            st.write(answer)

            with st.expander("Trechos usados"):
                for c in chunks:
                    st.markdown(f"**{c['source']} ({c['chunk_id']})**")
                    st.write(c["text"])


if __name__ == "__main__":
    main()
