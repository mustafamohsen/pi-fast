import { describe, expect, it } from "vitest";
import {
  applyFastModeToPayload,
  defaultConfig,
  formatStatus,
  getFastStatus,
  normalizeConfig,
  parseFastCommand,
} from "../src/fast-mode.ts";

describe("parseFastCommand", () => {
  it("treats blank args as status", () => {
    expect(parseFastCommand("")).toEqual({ action: "status" });
  });

  it("parses supported commands case-insensitively", () => {
    expect(parseFastCommand(" ON ")).toEqual({ action: "on" });
    expect(parseFastCommand("off")).toEqual({ action: "off" });
    expect(parseFastCommand("Status")).toEqual({ action: "status" });
  });

  it("rejects unknown commands", () => {
    expect(parseFastCommand("maybe")).toHaveProperty("error");
  });
});

const supportedModelIds = ["gpt-5.4", "gpt-5.5", "gpt-5.6", "gpt-6-astra", "gpt-6-sol", "gpt-6-luna", "gpt-6.1-sol"];

describe("normalizeConfig", () => {
  it("defaults to all documented Fast-capable models", () => {
    expect(defaultConfig().supportedModels).toEqual(supportedModelIds);
    expect(normalizeConfig({ enabled: true }).supportedModels).toEqual(supportedModelIds);
  });

  it("upgrades the old saved default allowlist without changing other settings", () => {
    const config = normalizeConfig({
      supportedModels: [" gpt-5.5 ", "gpt-5.4", "gpt-5.5"],
      enabled: true,
      requestServiceTier: "custom-tier",
      clearServiceTier: true,
    });
    expect(config.supportedModels).toEqual(supportedModelIds);
    expect(config.enabled).toBe(true);
    expect(config.requestServiceTier).toBe("custom-tier");
    expect(config.clearServiceTier).toBe(true);
    expect(normalizeConfig(config)).toEqual(config);
  });

  it.each(
    [[], ["gpt-5.5"], ["gpt-5.4", "gpt-5.5", "custom-model"]].map((ids) => ({ ids })),
  )("preserves a custom allowlist: $ids", ({ ids }) => {
    expect(normalizeConfig({ supportedModels: ids }).supportedModels).toEqual(ids);
  });

  it("migrates partial config with safe defaults", () => {
    const config = normalizeConfig({ enabled: true, supportedModels: ["gpt-5.5", "", "gpt-5.5"] });
    expect(config.enabled).toBe(true);
    expect(config.requestServiceTier).toBe("priority");
    expect(config.supportedModels).toEqual(["gpt-5.5"]);
    expect(config.clearServiceTier).toBe(false);
  });
});

describe("applyFastModeToPayload", () => {
  const model = { provider: "openai-codex", id: "gpt-5.5", api: "openai-codex-responses" };

  it.each(supportedModelIds)("sets Codex Fast request tier for %s when enabled", (id) => {
    const config = { ...defaultConfig(), enabled: true };
    const payload = { model: id, stream: true };
    const result = applyFastModeToPayload(payload, { ...model, id }, config);
    expect(payload).not.toHaveProperty("service_tier");
    expect(getFastStatus(config, { ...model, id }).supported).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.reason).toBe("enabled");
    expect(result.payload).toMatchObject({ service_tier: "priority" });
  });

  it("does not mutate unsupported providers", () => {
    const config = { ...defaultConfig(), enabled: true };
    const payload = { model: "gpt-5.5" };
    const result = applyFastModeToPayload(payload, { provider: "openai", id: "gpt-5.5" }, config);
    expect(result.changed).toBe(false);
    expect(result.payload).toBe(payload);
    expect(result.reason).toBe("unsupported-provider");
  });

  it("does not mutate non-openai-codex providers even if their api shape looks Codex-like", () => {
    const config = { ...defaultConfig(), enabled: true };
    const payload = { model: "gpt-5.5" };
    const result = applyFastModeToPayload(
      payload,
      { provider: "custom-codex-proxy", id: "gpt-5.5", api: "openai-codex-responses" },
      config,
    );
    expect(result.changed).toBe(false);
    expect(result.payload).toBe(payload);
    expect(result.reason).toBe("unsupported-provider");
  });

  it.each([
    "gpt-5.4-mini",
    "gpt-5.3-codex-spark",
    "gpt-6",
    "gpt-6-astra-ultrafast",
    "gpt-7",
  ])("does not infer Fast support for %s", (id) => {
    const config = { ...defaultConfig(), enabled: true };
    const payload = { model: id };
    const result = applyFastModeToPayload(payload, { provider: "openai-codex", id }, config);
    expect(result.changed).toBe(false);
    expect(result.reason).toBe("unsupported-model");
    expect(result.payload).toBe(payload);
  });

  it("does not mutate fresh disabled installs by default", () => {
    const config = { ...defaultConfig(), enabled: false };
    const payload = { model: "gpt-5.5" };
    const result = applyFastModeToPayload(payload, model, config);
    expect(result.changed).toBe(false);
    expect(result.payload).toBe(payload);
    expect(result.reason).toBe("disabled-noop");
  });

  it.each(supportedModelIds)("clears service tier for %s after the user disables Fast mode", (id) => {
    const config = { ...defaultConfig(), enabled: false, clearServiceTier: true };
    const result = applyFastModeToPayload({ model: id, service_tier: "priority" }, { ...model, id }, config);
    expect(result.changed).toBe(true);
    expect(result.payload).toMatchObject({ service_tier: null });
  });

  it("can leave payload untouched when disabled clear is off", () => {
    const config = { ...defaultConfig(), enabled: false, clearServiceTier: false };
    const payload = { model: "gpt-5.5" };
    const result = applyFastModeToPayload(payload, model, config);
    expect(result.changed).toBe(false);
    expect(result.payload).toBe(payload);
    expect(result.reason).toBe("disabled-noop");
  });
});

describe("status formatting", () => {
  it("reports unsupported model caveats", () => {
    const status = getFastStatus({ ...defaultConfig(), enabled: true }, { provider: "openai", id: "gpt-5.5" });
    expect(status.supported).toBe(false);
    expect(formatStatus(status)).toContain("not applicable");
  });
});
