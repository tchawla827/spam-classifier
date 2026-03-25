import { spawn } from "node:child_process";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

const origin = process.env.NEXT_DEV_WARMUP_ORIGIN ?? `http://127.0.0.1:${process.env.PORT ?? "3000"}`;
const routes = [
  "/",
  "/app",
  "/app/classify",
  "/app/history",
  "/app/gmail",
  "/app/insights",
  "/app/settings",
  "/app/how-it-works",
];

const child = spawn("pnpm", ["run", "dev:turbo"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));

void warmRoutes();

async function warmRoutes() {
  const ready = await waitForServer();
  if (!ready) {
    console.warn(`[warmup] skipped route warmup because ${origin} never became ready`);
    return;
  }

  console.log(`[warmup] compiling ${routes.length} routes against ${origin}`);

  for (const route of routes) {
    try {
      const response = await fetch(`${origin}${route}`, {
        redirect: "follow",
        headers: { "user-agent": "dev-route-warmup" },
      });
      console.log(`[warmup] ${route} -> ${response.status}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[warmup] ${route} failed: ${message}`);
    }
  }

  console.log("[warmup] route warmup complete");
}

async function waitForServer() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(origin, {
        redirect: "manual",
        headers: { "user-agent": "dev-route-warmup" },
      });
      if (response.status < 500) {
        return true;
      }
    } catch {
      // Server not ready yet.
    }

    await delay(1000);
  }

  return false;
}
