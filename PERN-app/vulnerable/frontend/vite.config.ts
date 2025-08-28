import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: [
      "5173-lennoxgonz-dockercontai-f2jvnhw7g0z.ws-us121.gitpod.io",
    ],
  },
});
