import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import QuestionPanel from "./QuestionPanel.vue";

vi.mock("../api.js", () => ({
  askQuestion: vi.fn(),
}));

import { askQuestion } from "../api.js";

const baseProps = {
  ollamaUrl: "http://localhost:11434",
  model: "qwen2.5:3b",
  topK: 5,
  temperature: 0.2,
  docsCount: 3,
};

beforeEach(() => {
  vi.mocked(askQuestion).mockReset();
});

describe("QuestionPanel", () => {
  it("shows error when question is empty", async () => {
    const wrapper = mount(QuestionPanel, { props: baseProps });
    await wrapper.find("button").trigger("click");
    expect(wrapper.text()).toContain("Digite uma pergunta");
    expect(askQuestion).not.toHaveBeenCalled();
  });

  it("shows error when docsCount is 0", async () => {
    const wrapper = mount(QuestionPanel, {
      props: { ...baseProps, docsCount: 0 },
    });
    await wrapper.find("textarea").setValue("oi");
    await wrapper.find("button").trigger("click");
    expect(wrapper.text()).toContain("Nenhum documento foi carregado");
    expect(askQuestion).not.toHaveBeenCalled();
  });

  it("calls askQuestion with props and renders answer + chunks", async () => {
    vi.mocked(askQuestion).mockResolvedValue({
      answer: "resposta gerada",
      chunks: [
        { source: "a.md", chunkId: "a#1", text: "texto do chunk" },
      ],
    });
    const wrapper = mount(QuestionPanel, { props: baseProps });
    await wrapper.find("textarea").setValue("qual a politica?");
    await wrapper.find("button").trigger("click");
    await flushPromises();

    expect(askQuestion).toHaveBeenCalledWith({
      question: "qual a politica?",
      topK: 5,
      model: "qwen2.5:3b",
      ollamaUrl: "http://localhost:11434",
      temperature: 0.2,
    });
    expect(wrapper.text()).toContain("resposta gerada");
    const toggle = wrapper
      .findAll("button")
      .find((b) => b.text().includes("trechos usados"))!;
    await toggle.trigger("click");
    expect(wrapper.text()).toContain("a.md (a#1)");
    expect(wrapper.text()).toContain("texto do chunk");
  });

  it("shows warning when no chunks are returned", async () => {
    vi.mocked(askQuestion).mockResolvedValue({ answer: "", chunks: [] });
    const wrapper = mount(QuestionPanel, { props: baseProps });
    await wrapper.find("textarea").setValue("foo");
    await wrapper.find("button").trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("Nao encontrei trechos relevantes");
  });

  it("shows error message when askQuestion rejects", async () => {
    vi.mocked(askQuestion).mockRejectedValue(new Error("Ollama offline"));
    const wrapper = mount(QuestionPanel, { props: baseProps });
    await wrapper.find("textarea").setValue("foo");
    await wrapper.find("button").trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("Ollama offline");
  });
});
