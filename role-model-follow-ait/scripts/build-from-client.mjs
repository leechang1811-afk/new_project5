/**
 * apps/client 를 build:ait 한 뒤 dist 만 이 패키지 ./dist 로 복사 (Granite/ brain-rank 는 건드리지 않음)
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packRoot, "..");
const clientDir = path.join(repoRoot, "apps", "client");
const sourceDist = path.join(clientDir, "dist");
const targetDist = path.join(packRoot, "dist");

if (!fs.existsSync(clientDir)) {
  console.error("apps/client 을 찾을 수 없습니다:", clientDir);
  process.exit(1);
}

execSync("npm run build:ait", { cwd: clientDir, stdio: "inherit" });

if (!fs.existsSync(sourceDist)) {
  console.error("빌드 결과가 없습니다:", sourceDist);
  process.exit(1);
}

fs.rmSync(targetDist, { recursive: true, force: true });
fs.cpSync(sourceDist, targetDist, { recursive: true });
console.log("OK (role-model-follow AIT):", sourceDist, "->", targetDist);
