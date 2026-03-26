import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  // apps/client/granite.config.ts 와 동일 (콘솔 앱 ID: naedunoe-myeot-deung)
  appName: "naedunoe-myeot-deung",
  brand: {
    displayName: "내 두뇌 몇 등?",
    primaryColor: "#3182F6",
    icon: "", // 콘솔에서 업로드한 이미지 URL로 교체하세요 (앱 정보 > 이미지 우클릭 > 링크 복사)
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
