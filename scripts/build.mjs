import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
for (const script of [
  "node_modules/typescript/bin/tsc",
  "node_modules/vite/bin/vite.js",
]) {
  const args = script.includes("typescript") ? ["--noEmit"] : ["build"];
  const result = spawnSync(process.execPath, [resolve(script), ...args], {
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
