import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  // apps/client/granite.config.ts 와 동일 (콘솔 앱 ID: brain-rank)
  appName: "brain-rank",
  brand: {
    displayName: "내 두뇌 몇 등?",
    primaryColor: "#3182F6",
    icon: "https://korea-quiz-client.vercel.app/brand-logo.png",
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite",
      build: "vite build",
    },
  },
  outdir: "dist",
  permissions: [],
  webViewProps: {
    type: "game",
  },
});
