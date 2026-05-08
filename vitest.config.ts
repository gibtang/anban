import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
