import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { getAppConfig } from "@studio/config";
import { buildApp } from "./app.ts";

const LAN_ACCESS_PORT = 3001;
const WEB_VUE_DIST_DIR = join(process.cwd(), "apps", "web-vue", "dist");
let lanApiPort = 4100;

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf"
};

const getMimeType = (filePath: string) =>
  MIME_TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream";

const serveIndexWithInjection = (req: IncomingMessage, res: ServerResponse) => {
  const indexPath = join(WEB_VUE_DIST_DIR, "index.html");
  const requestHost = req.headers.host?.split(":")[0] ?? "127.0.0.1";
  readFile(indexPath, "utf-8")
    .then((content) => {
      const injectScript = `<script>window.__STUDIO_API_BASE_URL__="http://${requestHost}:${lanApiPort}";</script>`;
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(content.replace("<head>", `<head>${injectScript}`));
    })
    .catch(() => {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    });
};

const serveStaticFile = async (req: IncomingMessage, res: ServerResponse) => {
  let urlPath = req.url?.split("?")[0] ?? "/";

  if (urlPath === "/" || urlPath === "/index.html") {
    serveIndexWithInjection(req, res);
    return;
  }

  const filePath = join(WEB_VUE_DIST_DIR, urlPath);

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isFile()) {
      const content = await readFile(filePath);
      res.writeHead(200, {
        "Content-Type": getMimeType(filePath),
        "Cache-Control": "public, max-age=3600"
      });
      res.end(content);
      return;
    }
  } catch {
    // 文件不存在，SPA fallback
  }

  serveIndexWithInjection(req, res);
};

const startLanAccessServer = () => {
  if (!existsSync(WEB_VUE_DIST_DIR)) {
    console.warn(`[LAN Access] 前端构建产物目录不存在: ${WEB_VUE_DIST_DIR}，跳过局域网访问服务。`);
    console.warn("[LAN Access] 请先执行 npm run build --workspace @studio/web-vue 构建前端。");
    return null;
  }

  const server = createHttpServer(serveStaticFile);

  return new Promise<ReturnType<typeof createHttpServer> | null>((resolve) => {
    server.listen(LAN_ACCESS_PORT, "0.0.0.0", () => {
      console.log(`[LAN Access] 前端局域网访问已开启: http://0.0.0.0:${LAN_ACCESS_PORT}`);
      resolve(server);
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`[LAN Access] 端口 ${LAN_ACCESS_PORT} 已被占用，局域网访问服务启动失败。`);
        console.warn("[LAN Access] 请关闭占用该端口的程序后重试。");
      } else {
        console.error("[LAN Access] 局域网访问服务启动失败:", err.message);
      }
      resolve(null);
    });
  });
};

const start = async () => {
  const config = getAppConfig();
  const app = buildApp();
  await app.listen({ port: config.apiPort, host: config.apiHost });

  // 检查是否需要启动局域网访问服务
  const networkConfigPath = join(process.cwd(), config.storage.appStateDir, "network-access-config.json");
  let lanEnabled = false;
  if (existsSync(networkConfigPath)) {
    try {
      const content = await readFile(networkConfigPath, "utf-8");
      const parsed = JSON.parse(content);
      lanEnabled = typeof parsed.lanAccessEnabled === "boolean" ? parsed.lanAccessEnabled : false;
      if (typeof parsed.apiPort === "number") {
        lanApiPort = parsed.apiPort;
      }
    } catch {
      // 忽略解析错误
    }
  }

  if (lanEnabled) {
    await startLanAccessServer();
  } else {
    console.log("[LAN Access] 局域网访问未开启（可在设置页面中开启）。");
  }
};

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
