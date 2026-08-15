import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules", ".next", ".git"],
    coverage: {
      provider: "v8",
      include: [
        "src/lib/api.ts",
        "src/lib/rate-limit.ts",
        "src/server/coding/harness.ts",
        "src/server/scoring/score-engine.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
