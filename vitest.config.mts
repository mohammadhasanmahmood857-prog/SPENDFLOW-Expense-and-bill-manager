import path from "node:path";
import { defineConfig } from "vitest/config";

// Unit tests for pure logic (money, dates, redirects). Pages and database behaviour are
// covered by the browser and migration checks, not here.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
