<script setup lang="ts">
import { ref } from "vue";
import { askQuestion } from "../api.js";
import type { DocChunk } from "../types.js";

const props = defineProps<{
  ollamaUrl: string;
  model: string;
  topK: number;
  docsCount: number;
}>();

const question = ref("");
const answer = ref("");
const chunks = ref<DocChunk[]>([]);
const elapsedMs = ref<number | null>(null);
const loading = ref(false);
const error = ref("");
const showChunks = ref(false);

async function onAsk() {
  const q = question.value.trim();
  if (!q) {
    error.value = "Digite uma pergunta.";
    return;
  }
  if (props.docsCount === 0) {
    error.value = "Nenhum documento foi carregado/indexado.";
    return;
  }
  loading.value = true;
  error.value = "";
  answer.value = "";
  chunks.value = [];
  elapsedMs.value = null;
  try {
    const result = await askQuestion({
      question: q,
      topK: props.topK,
      model: props.model,
      ollamaUrl: props.ollamaUrl,
    });
    if (result.chunks.length === 0) {
      error.value =
        "Nao encontrei trechos relevantes. Tente reformular a pergunta.";
    } else {
      answer.value = result.answer;
      chunks.value = result.chunks;
      elapsedMs.value = result.elapsedMs ?? null;
    }
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="panel">
    <label>
      Pergunta
      <textarea
        v-model="question"
        rows="5"
        placeholder="Exemplo: Qual e o horario do suporte interno?"
      ></textarea>
    </label>

    <button type="button" :disabled="loading" @click="onAsk">
      {{ loading ? "Consultando modelo local..." : "Perguntar" }}
    </button>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="answer" class="answer">
      <h3>Resposta</h3>
      <p v-if="elapsedMs !== null" class="timing">
        Gerada em {{ (elapsedMs / 1000).toFixed(1) }} s
      </p>
      <p>{{ answer }}</p>
    </div>

    <div v-if="chunks.length > 0" class="chunks">
      <button type="button" class="link" @click="showChunks = !showChunks">
        {{ showChunks ? "Ocultar" : "Mostrar" }} trechos usados ({{ chunks.length }})
      </button>
      <div v-if="showChunks">
        <div v-for="c in chunks" :key="c.chunkId" class="chunk">
          <strong>{{ c.source }} ({{ c.chunkId }})</strong>
          <p>{{ c.text }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
}
textarea {
  width: 100%;
  padding: 0.5rem;
  font: inherit;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: vertical;
}
button {
  align-self: flex-start;
  padding: 0.5rem 1rem;
  cursor: pointer;
  background: #1f6feb;
  color: white;
  border: none;
  border-radius: 4px;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.error {
  color: #c53030;
}
.answer p {
  white-space: pre-wrap;
}
.timing {
  margin: 0 0 0.25rem;
  font-size: 0.85rem;
  color: #666;
}
.link {
  background: transparent;
  color: #1f6feb;
  padding: 0;
  text-decoration: underline;
}
.chunk {
  margin-top: 0.75rem;
  padding: 0.5rem;
  background: #f6f8fa;
  border-radius: 4px;
  font-size: 0.9rem;
}
</style>
