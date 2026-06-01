import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import {
  applyFastModeToPayload,
  defaultConfig,
  formatStatus,
  getFastStatus,
  normalizeConfig,
  parseFastCommand,
  type FastModeConfig,
} from "../src/fast-mode.ts";

const STATUS_KEY = "codex-fast";

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

function updateStatus(ctx: ExtensionContext, config: FastModeConfig): void {
  if (!ctx.hasUI) return;
  const status = getFastStatus(config, ctx.model);
  const icon = status.enabled ? "⚡" : "fast";
  const suffix = status.supported ? "" : " (inactive)";
  ctx.ui.setStatus(STATUS_KEY, `${icon} ${status.enabled ? "fast:on" : "fast:off"}${suffix}`);
}

function notifyStatus(ctx: ExtensionContext, config: FastModeConfig): void {
  const status = getFastStatus(config, ctx.model);
  ctx.ui.notify(formatStatus(status), status.enabled && !status.supported ? "warning" : "info");
}

export default function fastModeExtension(pi: ExtensionAPI) {
  let config = loadConfig();
  let lastInapplicableNoticeKey: string | undefined;

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
    updateStatus(ctx, config);
  });

  pi.on("model_select", (_event, ctx) => {
    updateStatus(ctx, config);
  });

  pi.on("before_provider_request", (event, ctx) => {
    const result = applyFastModeToPayload(event.payload, ctx.model, config);

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
