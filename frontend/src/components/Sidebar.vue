<script setup lang="ts">
import { ref } from "vue";
import { uploadFiles, clearUploads } from "../api.js";

const props = defineProps<{
  ollamaUrl: string;
  model: string;
  topK: number;
  temperature: number;
}>();

const emit = defineEmits<{
  (e: "update:ollamaUrl", v: string): void;
  (e: "update:model", v: string): void;
  (e: "update:topK", v: number): void;
  (e: "update:temperature", v: number): void;
  (e: "uploaded"): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const status = ref("");

async function onFiles(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  uploading.value = true;
  status.value = "";
  try {
    const result = await uploadFiles(Array.from(input.files));
    status.value = `+${result.added} trechos (total: ${result.total})`;
    emit("uploaded");
  } catch (err) {
    status.value = `Erro: ${(err as Error).message}`;
  } finally {
    uploading.value = false;
    if (fileInput.value) fileInput.value.value = "";
  }
}

async function onClearUploads() {
  await clearUploads();
  status.value = "Uploads limpos";
  emit("uploaded");
}
</script>

<template>
  <aside class="sidebar">
    <h2>Configuracao</h2>

    <label>
      URL do Ollama
      <input
        type="text"
        :value="props.ollamaUrl"
        @input="emit('update:ollamaUrl', ($event.target as HTMLInputElement).value)"
      />
    </label>

    <label>
      Modelo
      <input
        type="text"
        :value="props.model"
        @input="emit('update:model', ($event.target as HTMLInputElement).value)"
      />
    </label>

    <label>
      Trechos usados na resposta: {{ props.topK }}
      <input
        type="range"
        min="1"
        max="10"
        :value="props.topK"
        @input="emit('update:topK', Number(($event.target as HTMLInputElement).value))"
      />
    </label>

    <label>
      Temperatura: {{ props.temperature.toFixed(1) }}
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        :value="props.temperature"
        @input="emit('update:temperature', Number(($event.target as HTMLInputElement).value))"
      />
      <span class="hint">0 = focado nos documentos · 1 = mais criativo</span>
    </label>

    <h3>Documentos</h3>
    <p class="hint">1) Arquivos da pasta ./docs (carregados pelo backend)</p>
    <p class="hint">2) Upload rapido (opcional)</p>

    <input
      ref="fileInput"
      type="file"
      accept=".txt,.md,.pdf"
      multiple
      :disabled="uploading"
      @change="onFiles"
    />
    <button type="button" @click="onClearUploads" :disabled="uploading">
      Limpar uploads
    </button>
    <p v-if="status" class="status">{{ status }}</p>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
}
label {
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
  gap: 0.25rem;
}
input[type="text"] {
  padding: 0.4rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
button {
  padding: 0.4rem 0.8rem;
  cursor: pointer;
}
.hint {
  margin: 0;
  font-size: 0.8rem;
  color: #666;
}
.status {
  font-size: 0.85rem;
  color: #333;
}
</style>
