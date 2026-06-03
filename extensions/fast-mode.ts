import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import {
  applyFastModeToPayload,
  defaultConfig,
  type FastModeConfig,
  formatStatus,
  getFastStatus,
  normalizeConfig,
  parseFastCommand,
} from "../src/fast-mode.ts";

const STATUS_KEY = "codex-fast";

type FastFlagAction = "on" | "off";

function parseFastFlag(value: unknown): FastFlagAction | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "on" || normalized === "true" || normalized === "1" || normalized === "yes") return "on";
  if (normalized === "off" || normalized === "false" || normalized === "0" || normalized === "no") return "off";
  return undefined;
}

function parseVerbosity(value: unknown): number {
  if (value === true) return 1;
  if (typeof value !== "string") return 0;
  if (value.trim() === "") return 0;
  if (value === "true") return 1;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function logVerbose(level: number, threshold: number, message: string, details?: Record<string, unknown>): void {
  if (level < threshold) return;
  const suffix = details ? ` ${JSON.stringify(details)}` : "";
  console.error(`[pi-fast:v${threshold}] ${message}${suffix}`);
}

function configPath(): string {
  return join(getAgentDir(), "fast-mode.json");
}

function loadConfig(): FastModeConfig {
  const path = configPath();
  if (!existsSync(path)) return defaultConfig();
  try {
    return normalizeConfig(JSON.parse(readFileSync(path, "utf8")));
  } catch {
    return defaultConfig();
  }
}

function saveConfig(config: FastModeConfig): void {
  const path = configPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify({ ...config, updatedAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
}

function formatFooterStatus(config: FastModeConfig, model: ExtensionContext["model"]): string {
  const status = getFastStatus(config, model);
  const prefix = status.enabled ? "⚡ " : "○ ";
  const suffix = status.supported ? "" : " (inactive)";
  return `${prefix}fast:${status.enabled ? "on" : "off"}${suffix}`;
}

function updateStatus(ctx: ExtensionContext, config: FastModeConfig): void {
  if (!ctx.hasUI) return;
  ctx.ui.setStatus(STATUS_KEY, formatFooterStatus(config, ctx.model));
}

function notifyStatus(ctx: ExtensionContext, config: FastModeConfig): void {
  const status = getFastStatus(config, ctx.model);
  ctx.ui.notify(formatStatus(status), status.enabled && !status.supported ? "warning" : "info");
}

export default function fastModeExtension(pi: ExtensionAPI) {
  let config = loadConfig();
  let lastInapplicableNoticeKey: string | undefined;
  let cliFastAction: FastFlagAction | undefined;
  let verbosity = 0;

  pi.registerFlag("fast", {
    description: "Ephemerally set Codex Fast mode for this process: --fast on|off",
    type: "string",
  });

  pi.registerFlag("fast-verbose", {
    description: "pi-fast diagnostic verbosity: --fast-verbose 0|1|2|3",
    type: "string",
    default: "0",
  });

  pi.registerCommand("fast", {
    description: "Manage OpenAI Codex Fast mode: /fast on, /fast off, /fast status",
    getArgumentCompletions(prefix) {
      const options = ["on", "off", "status"];
      return options
        .filter((option) => option.startsWith(prefix.trim().toLowerCase()))
        .map((value) => ({ value, label: value }));
    },
    handler: async (args, ctx) => {
      const parsed = parseFastCommand(args);
      if ("error" in parsed) {
        ctx.ui.notify(parsed.error, "error");
        return;
      }

      if (parsed.action === "status") {
        notifyStatus(ctx, config);
        updateStatus(ctx, config);
        return;
      }

      config = {
        ...config,
        enabled: parsed.action === "on",
        clearServiceTier: parsed.action === "off",
        updatedAt: new Date().toISOString(),
      };
      saveConfig(config);

      const status = getFastStatus(config, ctx.model);
      const message = parsed.action === "on" ? "Fast mode enabled." : "Fast mode disabled.";
      ctx.ui.notify(`${message} ${formatStatus(status)}`, status.enabled && !status.supported ? "warning" : "info");
      updateStatus(ctx, config);
    },
  });

  pi.on("session_start", (_event, ctx) => {
    config = loadConfig();
    cliFastAction = parseFastFlag(pi.getFlag("fast"));
    verbosity = parseVerbosity(pi.getFlag("fast-verbose"));

    if (typeof pi.getFlag("fast") === "string" && !cliFastAction) {
      ctx.ui.notify("Invalid --fast value. Use --fast on or --fast off.", "error");
      logVerbose(1, 1, "invalid --fast flag", { value: pi.getFlag("fast") });
    }

    if (cliFastAction) {
      config = { ...config, enabled: cliFastAction === "on", clearServiceTier: cliFastAction === "off" };
      logVerbose(verbosity, 1, "using ephemeral CLI fast mode override", { action: cliFastAction });
    } else {
      logVerbose(verbosity, 1, "using persisted fast mode config", {
        enabled: config.enabled,
        clearServiceTier: config.clearServiceTier,
        requestServiceTier: config.requestServiceTier,
      });
    }

    logVerbose(
      verbosity,
      2,
      "session model status",
      getFastStatus(config, ctx.model) as unknown as Record<string, unknown>,
    );
    updateStatus(ctx, config);
  });

  pi.on("model_select", (_event, ctx) => {
    updateStatus(ctx, config);
  });

  pi.on("before_provider_request", (event, ctx) => {
    const result = applyFastModeToPayload(event.payload, ctx.model, config);

    logVerbose(verbosity, 2, "before provider request decision", {
      model: ctx.model ? `${ctx.model.provider ?? "unknown"}/${ctx.model.id ?? "unknown"}` : "unknown",
      changed: result.changed,
      reason: result.reason,
    });
    if (verbosity >= 3 && result.payload && typeof result.payload === "object" && !Array.isArray(result.payload)) {
      const payload = result.payload as Record<string, unknown>;
      logVerbose(verbosity, 3, "sanitized payload fields", {
        model: payload.model,
        service_tier: payload.service_tier,
        stream: payload.stream,
      });
    }

    if (config.enabled && (result.reason === "unsupported-model" || result.reason === "unsupported-provider")) {
      const key = `${result.reason}:${ctx.model?.provider ?? "unknown"}:${ctx.model?.id ?? "unknown"}`;
      if (ctx.hasUI && key !== lastInapplicableNoticeKey) {
        lastInapplicableNoticeKey = key;
        ctx.ui.notify(formatStatus(getFastStatus(config, ctx.model)), "warning");
      }
    }

    if (result.changed) return result.payload;
    return undefined;
  });
}
