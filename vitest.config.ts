import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic"
  },
  test: {
    exclude: ["**/node_modules/**", "**/.git/**", "**/.next/**", "**/.worktrees/**"],
    setupFiles: ["./src/test/setup.ts"],
    environmentOptions: {
      jsdom: {
        url: "http://localhost"
      }
    }
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  }
});
