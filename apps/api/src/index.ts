import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getAppConfig } from "@studio/config";
import { buildApp } from "./app.ts";

const VITE_DEV_PORT = 3001;

const start = async () => {
  const config = getAppConfig();
  const app = buildApp();
  await app.listen({ port: config.apiPort, host: config.apiHost });

  const networkConfigPath = join(process.cwd(), config.storage.appStateDir, "network-access-config.json");
  let lanEnabled = false;
  if (existsSync(networkConfigPath)) {
    try {
      const content = await readFile(networkConfigPath, "utf-8");
      const parsed = JSON.parse(content);
      lanEnabled = typeof parsed.lanAccessEnabled === "boolean" ? parsed.lanAccessEnabled : false;
    } catch {
      // 忽略解析错误
    }
  }

  if (lanEnabled) {
    console.log(`[LAN Access] 前端统一由 Vite 开发服务提供: http://0.0.0.0:${VITE_DEV_PORT}`);
  } else {
    console.log("[LAN Access] 局域网访问未开启（可在设置页面中开启）。");
  }
};

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
