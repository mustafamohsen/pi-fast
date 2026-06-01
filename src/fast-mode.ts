export const CONFIG_VERSION = 1;
export const DEFAULT_SUPPORTED_MODELS = ["gpt-5.4", "gpt-5.5"] as const;

export type FastCommandAction = "on" | "off" | "status";

export interface FastModeConfig {
  version: number;
  enabled: boolean;
  /**
   * User-facing mode is "Fast". Current Codex request/catalog tier id for Fast is "priority".
   * Keep this configurable because OpenAI's public docs and catalog behavior may evolve.
   */
  requestServiceTier: string;
  supportedModels: string[];
  /**
   * True after the user explicitly runs /fast off. This avoids mutating fresh installs while
   * still clearing sticky Fast state in Codex app-server sessions after Fast was enabled.
   */
  clearServiceTier: boolean;
  updatedAt?: string;
}

export interface ModelLike {
  provider?: string;
  id?: string;
  api?: string;
}

export interface PayloadMutationResult {
  payload: unknown;
  changed: boolean;
  reason: "enabled" | "cleared" | "disabled-noop" | "unsupported-model" | "unsupported-provider" | "invalid-payload";
}

export interface FastStatus {
  enabled: boolean;
  supported: boolean;
  reason?: string;
  modelLabel: string;
  requestServiceTier: string;
  supportedModels: string[];
  clearServiceTier: boolean;
}

export function defaultConfig(now = new Date()): FastModeConfig {
  return {
    version: CONFIG_VERSION,
    enabled: false,
    requestServiceTier: "priority",
    supportedModels: [...DEFAULT_SUPPORTED_MODELS],
    clearServiceTier: false,
    updatedAt: now.toISOString(),
  };
}

export function normalizeConfig(input: unknown, now = new Date()): FastModeConfig {
  const fallback = defaultConfig(now);
  if (!input || typeof input !== "object") return fallback;
  const record = input as Record<string, unknown>;
  return {
    version: CONFIG_VERSION,
    enabled: typeof record.enabled === "boolean" ? record.enabled : fallback.enabled,
    requestServiceTier:
      typeof record.requestServiceTier === "string" && record.requestServiceTier.trim().length > 0
        ? record.requestServiceTier.trim()
        : fallback.requestServiceTier,
    supportedModels:
      Array.isArray(record.supportedModels) && record.supportedModels.every((item) => typeof item === "string")
        ? [...new Set(record.supportedModels.map((item) => item.trim()).filter(Boolean))]
        : fallback.supportedModels,
    clearServiceTier:
      typeof record.clearServiceTier === "boolean"
        ? record.clearServiceTier
        : typeof record.clearTierOnOff === "boolean"
          ? record.clearTierOnOff
          : fallback.clearServiceTier,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : fallback.updatedAt,
  };
}

export function parseFastCommand(args: string | undefined): { action: FastCommandAction } | { error: string } {
  const normalized = (args ?? "").trim().toLowerCase();
  if (normalized === "" || normalized === "status") return { action: "status" };
  if (normalized === "on") return { action: "on" };
  if (normalized === "off") return { action: "off" };
  return { error: "Usage: /fast on | /fast off | /fast status" };
}

export function isCodexProvider(model: ModelLike | undefined): boolean {
  return model?.provider === "openai-codex";
}

export function isSupportedFastModel(model: ModelLike | undefined, config: FastModeConfig): boolean {
  if (!isCodexProvider(model) || !model?.id) return false;
  return config.supportedModels.includes(model.id);
}

export function modelLabel(model: ModelLike | undefined): string {
  if (!model) return "unknown model";
  return `${model.provider ?? "unknown"}/${model.id ?? "unknown"}`;
}

export function getFastStatus(config: FastModeConfig, model: ModelLike | undefined): FastStatus {
  const codex = isCodexProvider(model);
  const supported = isSupportedFastModel(model, config);
  const reason = supported
    ? undefined
    : codex
      ? `Fast mode is currently allowlisted for: ${config.supportedModels.join(", ")}`
      : "Fast mode only applies to OpenAI Codex subscription models in Pi.";

  return {
    enabled: config.enabled,
    supported,
    reason,
    modelLabel: modelLabel(model),
    requestServiceTier: config.requestServiceTier,
    supportedModels: [...config.supportedModels],
    clearServiceTier: config.clearServiceTier,
  };
}

export function applyFastModeToPayload(
  payload: unknown,
  model: ModelLike | undefined,
  config: FastModeConfig,
): PayloadMutationResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { payload, changed: false, reason: "invalid-payload" };
  }
  if (!isCodexProvider(model)) {
    return { payload, changed: false, reason: "unsupported-provider" };
  }
  if (!isSupportedFastModel(model, config)) {
    return { payload, changed: false, reason: "unsupported-model" };
  }

  const objectPayload = payload as Record<string, unknown>;
  if (config.enabled) {
    if (objectPayload.service_tier === config.requestServiceTier) {
      return { payload, changed: false, reason: "enabled" };
    }
    return {
      payload: { ...objectPayload, service_tier: config.requestServiceTier },
      changed: true,
      reason: "enabled",
    };
  }

  if (config.clearServiceTier) {
    if (objectPayload.service_tier === null) {
      return { payload, changed: false, reason: "cleared" };
    }
    return {
      payload: { ...objectPayload, service_tier: null },
      changed: true,
      reason: "cleared",
    };
  }

  return { payload, changed: false, reason: "disabled-noop" };
}

export function formatStatus(status: FastStatus): string {
  const state = status.enabled ? "on" : "off";
  const applicability = status.supported ? "applies to current model" : `not applicable: ${status.reason}`;
  return `Fast mode: ${state} (${applicability}). Current model: ${status.modelLabel}. Request tier: ${status.requestServiceTier}.`;
}
