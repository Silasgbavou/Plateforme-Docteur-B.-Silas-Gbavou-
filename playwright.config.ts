import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { tmpdir } from "node:os";
import { hashPassword } from "./lib/server/password";

process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
const E2E_DIR = path.join(tmpdir(), "ministere-e2e");
export const ADMIN = { email: "admin@test.local", password: "mot-de-passe-e2e-solide" };

const serverEnv = {
  NODE_ENV: "production",
  NEXT_TELEMETRY_DISABLED: "1",
  SITE_URL: "http://localhost:3100",
  SITE_AUDIENCE: "private",
  E2E_DIR,
  DATABASE_PATH: path.join(E2E_DIR, "e2e.sqlite"),
  STORAGE_DIR: path.join(E2E_DIR, "storage"),
  SESSION_SECRET: "e2e-session-secret-e2e-session-secret-0001",
  ADMIN_EMAIL: ADMIN.email,
  ADMIN_PASSWORD_HASH: hashPassword(ADMIN.password),
  LLM_PROVIDER: "gemini",
  GEMINI_API_KEY: "cle-factice-e2e",
  GEMINI_MODELS: "modele-e2e",
  GEMINI_API_BASE: "http://127.0.0.1:4555/v1beta",
};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    launchOptions: { executablePath: process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium" },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    { command: "node tests/e2e/mock-llm.mjs", port: 4555, reuseExistingServer: false },
    {
      command: "pnpm tsx --conditions=react-server tests/e2e/prepare.ts && pnpm next start -p 3100",
      url: "http://localhost:3100/hors-ligne",
      timeout: 120_000,
      reuseExistingServer: false,
      env: serverEnv,
    },
  ],
});
