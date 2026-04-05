import { defineConfig } from "@apps-in-toss/web-framework/config";

/** leechang1811-afk/new_project5 — 신규 앱인토스 앱. 콘솔 App ID와 동일해야 함. */
export default defineConfig({
  appName: "rolmodel-follow",
  brand: {
    displayName: "롤모델따라하기",
    primaryColor: "#3182F6",
    icon: "https://new-project5-six.vercel.app/app-icon-600x600.png",
  },
  web: {
    host: "localhost",
    port: 5010,
    commands: {
      dev: "npm run dev --prefix ../apps/client",
      build: "npm run build",
    },
  },
  outdir: "dist",
  permissions: [],
  webViewProps: {
    type: "game",
  },
});
