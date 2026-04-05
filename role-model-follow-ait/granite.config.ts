import { defineConfig } from "@apps-in-toss/web-framework/config";

/** 콘솔: 한글 롤모델따라하기 / 영문 Role Model Follow / App ID role-model-follow */
export default defineConfig({
  appName: "role-model-follow",
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
