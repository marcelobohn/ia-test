<script setup lang="ts">
import { ref, onMounted } from "vue";
import Sidebar from "./components/Sidebar.vue";
import QuestionPanel from "./components/QuestionPanel.vue";
import { fetchDocsStats } from "./api.js";

const ollamaUrl = ref("http://localhost:11434");
const model = ref("qwen2.5:3b");
const topK = ref(5);
const temperature = ref(0.2);

const docsCount = ref(0);
const loadError = ref("");

async function refreshStats() {
  try {
    const stats = await fetchDocsStats();
    docsCount.value = stats.count;
  } catch (err) {
    loadError.value = (err as Error).message;
  }
}

onMounted(refreshStats);
</script>

<template>
  <div class="layout">
    <header>
      <h1>FAQ Interno (LLM Local)</h1>
      <p class="caption">Sem API online: usa Ollama rodando localmente.</p>
    </header>

    <div class="grid">
      <Sidebar
        v-model:ollamaUrl="ollamaUrl"
        v-model:model="model"
        v-model:topK="topK"
        v-model:temperature="temperature"
        @uploaded="refreshStats"
      />
      <main>
        <div class="stats">
          Trechos indexados: <strong>{{ docsCount }}</strong>
          <span v-if="loadError" class="error"> — {{ loadError }}</span>
        </div>
        <QuestionPanel
          :ollama-url="ollamaUrl"
          :model="model"
          :top-k="topK"
          :temperature="temperature"
          :docs-count="docsCount"
        />
      </main>
    </div>
  </div>
</template>

<style scoped>
.layout {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
}
.caption {
  color: #666;
  margin-top: -0.5rem;
}
.grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 1rem;
}
.stats {
  padding: 0.5rem 1rem;
  margin-bottom: 0.75rem;
  background: #eef;
  border-radius: 4px;
}
.error {
  color: #c53030;
}
@media (max-width: 800px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
