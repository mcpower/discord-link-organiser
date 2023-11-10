import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.{test,spec}.?(c|m)ts?(x)"],
    coverage: { enabled: true, provider: "v8", reporter: ["lcov", "text"] },
  },
});
