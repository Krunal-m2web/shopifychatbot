import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact({
    devToolsEnabled: false,
  }),],

  build: {
    lib: {
      entry: "./src/index.jsx",
      name: "ShopifyAIChat",
      fileName: "shopify-ai-chat",
      formats: ["iife"],
    },

    outDir: "../ai-chat-app/extensions/theme-extension/assets",
    emptyOutDir: true,

    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        passes: 2,
        pure_funcs: ["console.info", "console.debug", "console.warn"],
      },
      mangle: {
        properties: {
          regex: /^_/,
        },
      },
      format: {
        comments: false,
      },
    },

    rollupOptions: {
      output: {
        assetFileNames: "shopify-ai-chat.[ext]",
        manualChunks: undefined,
      },
    },
  },

  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});
