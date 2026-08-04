// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// The preview proxy in this environment routes to the port defined by DEV_PORT
// (falling back to 5173). Outside the Lovable sandbox, the base config's default
// port (8080) is only a default and is overridden by anything we set here, so we
// pin the dev server to the port the preview actually targets.
const devPort = Number(process.env.DEV_PORT ?? process.env.PORT) || 5173;

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    server: {
      host: true,
      allowedHosts: true,
      port: devPort,
      strictPort: true,
    },
  },
});
