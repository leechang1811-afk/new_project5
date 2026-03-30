import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "brain-rank", // 앱인토스 콘솔에 등록한 앱 ID와 동일
  brand: {
    // 앱 정보 등록 시 표시 이름과 동일해야 함 (반려: 이름 불일치 방지)
    displayName: "오늘 딱 1개만 완료",
    primaryColor: "#3182F6",
    // 공통 내비게이션 바 브랜드 로고 — 배포 도메인 기준 절대 URL
    icon: "https://new-project5-six.vercel.app/app-icon-600x600.png",
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
