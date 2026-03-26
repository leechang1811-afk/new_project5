import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "brain-rank", // 앱인토스 콘솔에 등록한 앱 ID와 동일
  brand: {
    displayName: "내 두뇌 몇 등?",
    primaryColor: "#3182F6",
    icon: "", // 콘솔에서 업로드한 이미지 URL로 교체하세요 (앱 정보 > 이미지 우클릭 > 링크 복사)
  },
  web: {
    host: "localhost",
    port: 5010,
    commands: {
      dev: "vite",
      build: "npm run build:ait",
    },
  },
  outdir: "dist",
  permissions: [],
  webViewProps: {
    type: "game",
  },
});
