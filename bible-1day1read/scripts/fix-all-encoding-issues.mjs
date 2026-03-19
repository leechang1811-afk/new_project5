#!/usr/bin/env node
/**
 * Fix encoding issues: Chinese chars → Korean, ��� → correct chars from KRV.
 * Run: node scripts/fix-all-encoding-issues.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KRV_PATH = path.join(__dirname, '..', 'public', 'bible', 'krv.json');
const SCRIPT_DIR = path.join(__dirname);

const CHINESE_TO_KOREAN = {
  '眼中': '안중',
  '皮的': '포피',
  '旷野': '광야',
  '鉴察': '감찰',
  '喘息': '한숨',
  '不可': '불가',
  '可憎物': '가증한 것',
  '代言자(대언자)': '대언자',
  '代言자': '대언자',
  '瘟疫': '염병',
  '混雜': '혼잡',
  '我的手': '내 손',
  '亞麻': '아마',
  '路程': '노정',
  '忙하여': '바쁘매',
  '普디엘': '부디엘',
  '毁坏': '훼패',
  '甚한': '심한',
  '猛한': '맹렬한',
  '每日取하고': '매일 거두고',
  '櫃': '궤',
  '名號': '이름',
  '寓居': '우거',
  '代하여': '대신하여',
  '千夫長': '천부장',
  '百夫長': '백부장',
  '五十夫長': '오십부장',
  '十夫長': '십부장',
  '恒常': '항상',
  '警戒': '경고',
  '聖別케': '성별케',
  '限하고': '한하고',
  '自由할지니라': '자유할지니라',
  '医治': '치료',
  '银': '징',
  '侵占': '침점',
  '在你 앞에': '네 앞에',
  '之内': '이내',
  '脯': '포',
  '神': '신',
  '얻으리��': '얻으리라',
};

const FILES = [
  'translations-lev-num-deut.json',
  'translations-joshua-judges-ruth.json',
  'translations-1sam-2chr.json',
  'translations-remaining-ot.json',
  'translations-nt.json',
  'translations-exodus-gaps.json',
];

// Also fix in generate-all-translations.mjs inline TRANSLATIONS for genesis, exodus
const GENESIS_EXODUS_FIXES = [
  ['眼中', '안중'],
  ['皮的', '포피'],
  ['旷野', '광야'],
  ['鉴察', '감찰'],
  ['代言자(대언자)', '대언자'],
  ['喘息', '한숨'],
  ['不可', '불가'],
  ['可憎物', '가증한 것'],
  ['瘟疫', '염병'],
  ['混雜', '혼잡'],
  ['我的手', '내 손'],
  ['亞麻', '아마'],
  ['路程', '노정'],
  ['忙하여', '바쁘매'],
  ['普', '부'],
  ['毁坏', '훼패'],
  ['甚한', '심한'],
  ['猛한', '맹렬한'],
  ['每日取하고', '매일 거두고'],
  ['櫃', '궤'],
  ['名號', '이름'],
  ['寓居', '우거'],
  ['代하여', '대신하여'],
  ['千夫長', '천부장'],
  ['百夫長', '백부장'],
  ['五十夫長', '오십부장'],
  ['十夫長', '십부장'],
  ['恒常', '항상'],
  ['警戒', '경고'],
  ['聖別케', '성별케'],
  ['限하고', '한하고'],
  ['自由할지니라', '자유할지니라'],
  ['医治', '치료'],
  ['银', '징'],
  ['侵占', '침점'],
  ['在你 앞에', '네 앞에'],
  ['之内', '이내'],
  ['脯', '포'],
  ['bring하고', '가져오고'],
  ['神', '신'],
  ['얻으리��', '얻으리라'],
];

let totalFixed = 0;
let krv = JSON.parse(fs.readFileSync(KRV_PATH, 'utf8'));

// Repair krv.json using apps/client KRV where ours has �
const KRV_CLIENT = path.join(__dirname, '..', '..', 'apps', 'client', 'public', 'bible', 'krv.json');
if (fs.existsSync(KRV_CLIENT)) {
  const krvClient = JSON.parse(fs.readFileSync(KRV_CLIENT, 'utf8'));
  let repaired = 0;
  for (const k of Object.keys(krv)) {
    if ((krv[k].includes('�') || /[\uFFFD]/.test(krv[k])) && krvClient[k] && !/�|[\uFFFD]/.test(krvClient[k])) {
      krv[k] = krvClient[k].replace(/&#x27;/g, "'").replace(/`/g, "'").replace(/&#39;/g, "'");
      repaired++;
    }
  }
  if (repaired > 0) {
    fs.writeFileSync(KRV_PATH, JSON.stringify(krv, null, 0), 'utf8');
    krv = JSON.parse(fs.readFileSync(KRV_PATH, 'utf8'));
    totalFixed += repaired;
    console.log(`Repaired ${repaired} verses in krv.json from apps/client`);
  }
}

function fixChineseChars(obj) {
  let count = 0;
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value !== 'string') continue;
    let v = value;
    for (const [cn, ko] of Object.entries(CHINESE_TO_KOREAN)) {
      if (v.includes(cn)) {
        v = v.split(cn).join(ko);
        count++;
      }
    }
    // Replace ��� with KRV value when we have it
    if ((v.includes('�') || /[\u4e00-\u9fff]/.test(v)) && krv[key]) {
      obj[key] = krv[key];
      count++;
    } else if (count > 0 || v !== value) {
      obj[key] = v;
    }
  }
  return count;
}

// Fix JSON files
for (const f of FILES) {
  const fp = path.join(SCRIPT_DIR, f);
  if (!fs.existsSync(fp)) continue;
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const n = fixChineseChars(data);
  if (n > 0) {
    fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
    totalFixed += n;
    console.log(`Fixed ${n} in ${f}`);
  }
}

// Fix generate-all-translations.mjs inline
const genPath = path.join(SCRIPT_DIR, 'generate-all-translations.mjs');
let genContent = fs.readFileSync(genPath, 'utf8');
for (const [cn, ko] of GENESIS_EXODUS_FIXES) {
  if (genContent.includes(cn)) {
    genContent = genContent.split(cn).join(ko);
    totalFixed++;
  }
}
fs.writeFileSync(genPath, genContent, 'utf8');

// Manual fixes for verses where KRV is missing or different
const MANUAL_FIXES = {
  '1peter,5,4': '그리하면 목자장이 나타나실 때에 시들지 아니하는 영광의 면류관을 얻으리라',
};

// For ��� in JSON files - use KRV or manual fix to overwrite
for (const f of FILES) {
  const fp = path.join(SCRIPT_DIR, f);
  if (!fs.existsSync(fp)) continue;
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  let overwrote = 0;
  for (const key of Object.keys(data)) {
    const fix = MANUAL_FIXES[key] || (krv[key] && (data[key].includes('�') || /[\u4e00-\u9fff]/.test(data[key])));
    if (fix) {
      data[key] = typeof fix === 'string' ? fix : krv[key];
      overwrote++;
    }
  }
  if (overwrote > 0) {
    fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
    totalFixed += overwrote;
    console.log(`Overwrote ${overwrote} corrupted from KRV in ${f}`);
  }
}

console.log(`\nTotal fixes: ${totalFixed}`);
console.log('Run: npm run generate-translations');
