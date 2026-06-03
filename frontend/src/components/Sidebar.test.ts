import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import Sidebar from "./Sidebar.vue";

vi.mock("../api.js", () => ({
  uploadFiles: vi.fn(),
  clearUploads: vi.fn(),
}));

import { uploadFiles, clearUploads } from "../api.js";

const baseProps = {
  ollamaUrl: "http://localhost:11434",
  model: "qwen2.5:3b",
  topK: 5,
  temperature: 0.2,
};

beforeEach(() => {
  vi.mocked(uploadFiles).mockReset();
  vi.mocked(clearUploads).mockReset();
});

describe("Sidebar", () => {
  it("renders current config values", () => {
    const wrapper = mount(Sidebar, { props: baseProps });
    const textInputs = wrapper.findAll('input[type="text"]');
    expect((textInputs[0].element as HTMLInputElement).value).toBe(
      "http://localhost:11434",
    );
    expect((textInputs[1].element as HTMLInputElement).value).toBe("qwen2.5:3b");
    expect(wrapper.text()).toContain("Trechos usados na resposta: 5");
  });

  it("emits update:ollamaUrl when the URL input changes", async () => {
    const wrapper = mount(Sidebar, { props: baseProps });
    const input = wrapper.findAll('input[type="text"]')[0];
    await input.setValue("http://other:11434");
    expect(wrapper.emitted("update:ollamaUrl")?.[0]).toEqual([
      "http://other:11434",
    ]);
  });

  it("emits update:topK as number when range changes", async () => {
    const wrapper = mount(Sidebar, { props: baseProps });
    const range = wrapper.find('input[type="range"]');
    await range.setValue(8);
    const payload = wrapper.emitted("update:topK")?.[0];
    expect(payload).toBeDefined();
    expect(typeof payload![0]).toBe("number");
    expect(payload![0]).toBe(8);
  });

  it("calls clearUploads and emits uploaded when Limpar is clicked", async () => {
    vi.mocked(clearUploads).mockResolvedValue(undefined);
    const wrapper = mount(Sidebar, { props: baseProps });
    const buttons = wrapper.findAll("button");
    const clearBtn = buttons.find((b) => b.text().includes("Limpar"))!;
    await clearBtn.trigger("click");
    await wrapper.vm.$nextTick();
    await Promise.resolve();
    expect(clearUploads).toHaveBeenCalledOnce();
    expect(wrapper.emitted("uploaded")).toBeTruthy();
  });
});
