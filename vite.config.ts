import ssg from "@hono/vite-ssg";
import tailwindcss from "@tailwindcss/vite";
import honox from "honox/vite";
import client from "honox/vite/client";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  if (mode === "client") {
    return {
      build: {
        rollupOptions: {
          input: ["/app/style.css"],
          output: {
            assetFileNames: "static/assets/[name].[ext]",
          },
        },
      },
      plugins: [client(), tailwindcss()],
    };
  } else {
    return {
      build: {
        emptyOutDir: false,
      },
      plugins: [honox(), ssg({ entry: "./app/server.ts" }), tailwindcss()],
    };
  }
});
