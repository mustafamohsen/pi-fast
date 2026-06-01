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

describe("normalizeConfig", () => {
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

  it("sets Codex Fast request tier for supported models when enabled", () => {
    const config = { ...defaultConfig(), enabled: true };
    const result = applyFastModeToPayload({ model: "gpt-5.5", stream: true }, model, config);
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

  it("does not mutate unsupported Codex models", () => {
    const config = { ...defaultConfig(), enabled: true };
    const payload = { model: "gpt-5.4-mini" };
    const result = applyFastModeToPayload(payload, { provider: "openai-codex", id: "gpt-5.4-mini" }, config);
    expect(result.changed).toBe(false);
    expect(result.reason).toBe("unsupported-model");
  });

  it("does not mutate fresh disabled installs by default", () => {
    const config = { ...defaultConfig(), enabled: false };
    const payload = { model: "gpt-5.5" };
    const result = applyFastModeToPayload(payload, model, config);
    expect(result.changed).toBe(false);
    expect(result.payload).toBe(payload);
    expect(result.reason).toBe("disabled-noop");
  });

  it("clears service tier explicitly after the user disables Fast mode", () => {
    const config = { ...defaultConfig(), enabled: false, clearServiceTier: true };
    const result = applyFastModeToPayload({ model: "gpt-5.5", service_tier: "priority" }, model, config);
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
