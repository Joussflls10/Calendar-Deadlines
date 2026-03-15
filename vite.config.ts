import { resolve } from "path";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import livereload from "rollup-plugin-livereload";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import zipPack from "vite-plugin-zip-pack";

const env = process.env;
const isDev = env.NODE_ENV === "development";
const isSrcmap = env.VITE_SOURCEMAP === "inline";
const outputDir = isDev ? "dev" : "dist";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src")
    }
  },
  plugins: [
    svelte(),
    viteStaticCopy({
      targets: [
        { src: "./README*.md", dest: "./" },
        { src: "./plugin.json", dest: "./" },
        { src: "./public/i18n/*.json", dest: "./i18n" },
        { src: "./icon.png", dest: "./" },
        { src: "./preview.png", dest: "./" }
      ]
    })
  ],
  define: {
    "process.env.DEV_MODE": JSON.stringify(isDev),
    "process.env.NODE_ENV": JSON.stringify(env.NODE_ENV)
  },
  build: {
    outDir: outputDir,
    emptyOutDir: true,
    minify: true,
    sourcemap: isSrcmap ? "inline" : false,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      fileName: "index",
      formats: ["cjs"]
    },
    rollupOptions: {
      plugins: [
        ...(isDev
          ? [livereload(outputDir)]
          : [
              zipPack({
                inDir: "./dist",
                outDir: "./",
                outFileName: "package.zip"
              })
            ])
      ],
      external: ["siyuan", "process"],
      output: {
        entryFileNames: "[name].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === "style.css") {
            return "index.css";
          }
          return assetInfo.name ?? "[name].[ext]";
        }
      }
    }
  }
});
