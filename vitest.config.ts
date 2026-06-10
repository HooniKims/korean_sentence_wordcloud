import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic"
  },
  test: {
    exclude: ["**/node_modules/**", "**/.git/**", "**/.next/**", "**/.worktrees/**"]
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  }
});
