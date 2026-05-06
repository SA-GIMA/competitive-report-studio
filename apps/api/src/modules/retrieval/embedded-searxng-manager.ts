import { createWriteStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import type { RetrievalRuntimeConfig } from "@studio/shared";

export interface EmbeddedSearxngStatus {
  mode: "remote" | "embedded";
  installed: boolean;
  running: boolean;
  healthy: boolean;
  endpoint: string;
  port: number;
  autoStart: boolean;
  engines: string[];
  autocomplete: string;
  installDir: string;
  logPath: string;
  message: string;
}

export class EmbeddedSearxngManager {
  private readonly rootDir: string;
  private readonly repoDir: string;
  private readonly venvDir: string;
  private readonly configDir: string;
  private readonly settingsPath: string;
  private readonly logPath: string;
  private child: ChildProcess | null = null;
  private pendingStart: Promise<EmbeddedSearxngStatus> | null = null;
  private cleanupRegistered = false;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    this.repoDir = join(rootDir, "repo");
    this.venvDir = join(rootDir, "venv");
    this.configDir = join(rootDir, "config");
    this.settingsPath = join(this.configDir, "settings.yml");
    this.logPath = join(rootDir, "searxng.log");
  }

  async getStatus(config: RetrievalRuntimeConfig): Promise<EmbeddedSearxngStatus> {
    const normalized = normalizeEmbeddedConfig(config);
    const endpoint = buildEmbeddedEndpoint(normalized.searxngPort);
    const healthy = normalized.searxngMode === "embedded" ? await this.checkHealth(endpoint) : false;
    return {
      mode: normalized.searxngMode ?? "embedded",
      installed: this.isInstalled(),
      running: healthy,
      healthy,
      endpoint,
      port: normalized.searxngPort ?? DEFAULT_SEARXNG_PORT,
      autoStart: normalized.searxngAutoStart ?? true,
      engines: normalized.searxngEngines ?? [...DEFAULT_SEARXNG_ENGINES],
      autocomplete: normalized.searxngAutocomplete ?? DEFAULT_SEARXNG_AUTOCOMPLETE,
      installDir: this.rootDir,
      logPath: this.logPath,
      message:
        normalized.searxngMode !== "embedded"
          ? "当前使用外部 SearXNG Endpoint。"
          : healthy
            ? "内置 SearXNG 运行正常。"
            : this.isInstalled()
              ? "内置 SearXNG 已安装，但当前未运行。"
              : "内置 SearXNG 尚未安装。"
    };
  }

  async ensureReady(config: RetrievalRuntimeConfig): Promise<EmbeddedSearxngStatus> {
    const normalized = normalizeEmbeddedConfig(config);
    if (normalized.searxngMode !== "embedded") {
      return this.getStatus(normalized);
    }

    const endpoint = buildEmbeddedEndpoint(normalized.searxngPort);
    if (await this.checkHealth(endpoint)) {
      return this.getStatus(normalized);
    }

    if (this.pendingStart) {
      return this.pendingStart;
    }

    this.pendingStart = this.ensureReadyInternal(normalized).finally(() => {
      this.pendingStart = null;
    });
    return this.pendingStart;
  }

  async stop(config: RetrievalRuntimeConfig): Promise<EmbeddedSearxngStatus> {
    if (this.child && !this.child.killed) {
      this.child.kill("SIGTERM");
      await wait(1_000);
    }
    this.child = null;
    return this.getStatus(config);
  }

  private async ensureReadyInternal(
    config: RetrievalRuntimeConfig
  ): Promise<EmbeddedSearxngStatus> {
    await this.installIfNeeded();
    this.writeSettings(config);
    this.registerCleanup();

    const endpoint = buildEmbeddedEndpoint(config.searxngPort);
    const pythonPath = join(this.venvDir, "bin", "python");
    const logStream = createWriteStream(this.logPath, { flags: "a" });
    const child = spawn(pythonPath, ["searx/webapp.py"], {
      cwd: this.repoDir,
      env: {
        ...process.env,
        SEARXNG_SETTINGS_PATH: this.settingsPath
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    this.child = child;
    child.stdout?.pipe(logStream);
    child.stderr?.pipe(logStream);
    child.once("exit", () => {
      this.child = null;
    });

    const ready = await waitFor(async () => this.checkHealth(endpoint), 30_000, 1_000);
    if (!ready) {
      throw new Error(
        `内置 SearXNG 启动失败。请检查日志：${this.logPath}`
      );
    }

    return this.getStatus(config);
  }

  private async installIfNeeded() {
    mkdirSync(this.rootDir, { recursive: true });
    mkdirSync(this.configDir, { recursive: true });
    if (!existsSync(this.repoDir)) {
      await runCommand("git", ["clone", "--depth", "1", SEARXNG_REPO_URL, this.repoDir], {
        cwd: this.rootDir
      });
    }
    if (!existsSync(join(this.venvDir, "bin", "python"))) {
      await runCommand("python3", ["-m", "venv", this.venvDir], {
        cwd: this.rootDir
      });
    }
    const pipPath = join(this.venvDir, "bin", "pip");
    await runCommand(pipPath, ["install", "-U", "pip", "setuptools", "wheel"], {
      cwd: this.rootDir
    });
    await runCommand(
      pipPath,
      ["install", "-U", "pyyaml", "msgspec", "typing-extensions", "pybind11"],
      {
        cwd: this.rootDir
      }
    );
    await runCommand(
      pipPath,
      ["install", "--use-pep517", "--no-build-isolation", "-e", this.repoDir],
      {
        cwd: this.rootDir
      }
    );
  }

  private writeSettings(config: RetrievalRuntimeConfig) {
    mkdirSync(this.configDir, { recursive: true });
    const settings = [
      "use_default_settings: true",
      "general:",
      "  debug: false",
      '  instance_name: "Competitive Report Studio Embedded SearXNG"',
      "search:",
      "  safe_search: 0",
      `  autocomplete: "${escapeYaml(config.searxngAutocomplete ?? DEFAULT_SEARXNG_AUTOCOMPLETE)}"`,
      '  default_lang: "zh-CN"',
      "  formats:",
      "    - html",
      "    - json",
      "server:",
      `  port: ${config.searxngPort ?? DEFAULT_SEARXNG_PORT}`,
      '  bind_address: "127.0.0.1"',
      "  base_url: false",
      "  limiter: false",
      "  public_instance: false",
      `  secret_key: "${randomBytes(16).toString("hex")}"`,
      "  image_proxy: false"
    ].join("\n");

    writeFileSync(this.settingsPath, settings, "utf8");
  }

  private isInstalled() {
    return existsSync(this.repoDir) && existsSync(join(this.venvDir, "bin", "python"));
  }

  private async checkHealth(endpoint: string) {
    try {
      const url = new URL(endpoint);
      url.searchParams.set("q", "中国互联网 检索");
      url.searchParams.set("format", "json");
      const response = await fetch(url, {
        method: "GET"
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private registerCleanup() {
    if (this.cleanupRegistered) {
      return;
    }
    this.cleanupRegistered = true;
    const shutdown = () => {
      if (this.child && !this.child.killed) {
        this.child.kill("SIGTERM");
      }
    };
    process.once("exit", shutdown);
    process.once("SIGINT", () => {
      shutdown();
      process.exit(0);
    });
    process.once("SIGTERM", () => {
      shutdown();
      process.exit(0);
    });
  }
}

export const DEFAULT_SEARXNG_PORT = 18080;
export const DEFAULT_SEARXNG_ENGINES = ["bing", "baidu"];
export const DEFAULT_SEARXNG_AUTOCOMPLETE = "baidu";

const SEARXNG_REPO_URL = "https://github.com/searxng/searxng.git";

export const normalizeEmbeddedConfig = (
  config: RetrievalRuntimeConfig
): RetrievalRuntimeConfig => ({
  ...config,
  searxngMode: config.searxngMode === "remote" ? "remote" : "embedded",
  searxngAutoStart: config.searxngAutoStart ?? true,
  searxngPort: config.searxngPort ?? DEFAULT_SEARXNG_PORT,
  searxngEngines:
    config.searxngEngines && config.searxngEngines.length > 0
      ? config.searxngEngines
      : [...DEFAULT_SEARXNG_ENGINES],
  searxngAutocomplete: config.searxngAutocomplete ?? DEFAULT_SEARXNG_AUTOCOMPLETE
});

export const buildEmbeddedEndpoint = (port = DEFAULT_SEARXNG_PORT) =>
  `http://127.0.0.1:${port}/search`;

const runCommand = (
  command: string,
  args: string[],
  options: { cwd: string }
) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stderr = "";
    let stdout = "";
    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.once("error", (error) => reject(error));
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `命令执行失败: ${command} ${args.join(" ")}\n${(stderr || stdout).trim()}`
        )
      );
    });
  });

const waitFor = async (
  predicate: () => Promise<boolean>,
  timeoutMs: number,
  intervalMs: number
) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) {
      return true;
    }
    await wait(intervalMs);
  }
  return false;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const escapeYaml = (value: string) => value.replace(/"/g, '\\"');
