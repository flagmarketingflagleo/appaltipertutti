import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Il sito gira come Worker di Cloudflare: lì non esiste node_modules, quindi
// tutte le dipendenze vanno impacchettate dentro dist/server/server.js.
export default defineConfig({
  ssr: { noExternal: true, external: ["cloudflare:workers"] },
  build: { rollupOptions: { external: [/^cloudflare:/] } },
  plugins: [
    // Il plugin di TanStack Start deve stare prima di quello di React.
    tanstackStart({ server: { entry: "server" } }),
    react(),
    tsconfigPaths(),
  ],
});
