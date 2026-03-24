import { getAppConfig } from "@studio/config";
import { buildApp } from "./app.ts";

const start = async () => {
  const config = getAppConfig();
  const app = buildApp();
  await app.listen({ port: config.apiPort, host: "0.0.0.0" });
};

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
