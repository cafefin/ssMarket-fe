import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

const apiUrl = process.env.API_URL;
if (!apiUrl) {
  console.error("API_URL is not set. Copy .env.example to .env.local first.");
  process.exit(1);
}

execFileSync(
  "pnpm",
  [
    "exec",
    "openapi-typescript",
    `${apiUrl}/docs-json`,
    "-o",
    "src/lib/api/schema.d.ts",
  ],
  { stdio: "inherit" },
);
