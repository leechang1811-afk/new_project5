#!/usr/bin/env node
/**
 * Render에 DATABASE_URL 환경변수 설정
 * 사용: RENDER_API_KEY=your_key node apps/server/scripts/set-render-env.mjs
 * API Key: https://dashboard.render.com/settings/api-keys
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const RENDER_SERVICE_ID = 'srv-d6o3kqshg0os73ch9bcg';
const apiKey = process.env.RENDER_API_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!apiKey) {
  console.error('❌ RENDER_API_KEY 환경변수가 필요합니다.');
  console.log('   https://dashboard.render.com/settings/api-keys 에서 API Key 발급');
  console.log('   RENDER_API_KEY=your_key node apps/server/scripts/set-render-env.mjs');
  process.exit(1);
}

// DATABASE_URL 없어도 Start Command 업데이트는 진행

const START_CMD = 'node --dns-result-order=ipv4first apps/server/dist/index.js';

async function main() {
  // 1. Start Command 업데이트 (IPv4 우선 - ENETUNREACH 방지)
  const patchRes = await fetch(
    `https://api.render.com/v1/services/${RENDER_SERVICE_ID}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        serviceDetails: {
          envSpecificDetails: {
            startCommand: START_CMD,
          },
        },
      }),
    }
  );
  if (patchRes.ok) {
    console.log('✅ Render Start Command 업데이트 완료 (IPv4 우선)');
  } else {
    const err = await patchRes.text();
    console.warn('⚠️ Start Command 업데이트 실패 (무시하고 진행):', err.slice(0, 100));
  }

  // 2. DATABASE_URL 설정 (있는 경우만)
  if (databaseUrl) {
    const res = await fetch(
      `https://api.render.com/v1/services/${RENDER_SERVICE_ID}/env-vars/DATABASE_URL`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          value: databaseUrl,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('❌ Render API 오류 (DATABASE_URL):', res.status, err);
      process.exit(1);
    }

    console.log('✅ Render에 DATABASE_URL 설정 완료');
  } else {
    console.log('   (DATABASE_URL 없음 - Start Command만 업데이트됨)');
  }

  // 재배포 트리거
  const deployRes = await fetch(
    `https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({}),
    }
  );

  if (deployRes.ok) {
    console.log('✅ 재배포 트리거 완료 (1~2분 후 반영)');
  } else {
    console.log('   수동 재배포: https://dashboard.render.com/web/srv-d6o3kqshg0os73ch9bcg → Deploy');
  }
}

main();
