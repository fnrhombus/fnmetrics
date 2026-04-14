import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/extension.ts"],
  format: ["cjs"],
  target: "node20",
  clean: true,
  sourcemap: true,
  dts: false,
  minify: false,
  external: ["vscode"],
  noExternal: [],
});
