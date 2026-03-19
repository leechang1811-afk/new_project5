#!/usr/bin/env node
/** Fix corrupted chars (�) in translations-lev-num-deut.json */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LND_PATH = path.join(__dirname, 'translations-lev-num-deut.json');

const lnd = JSON.parse(fs.readFileSync(LND_PATH, 'utf8'));

const FIXES = {
  "leviticus,5,16": "성물에 대한 범과를 갚되 그것에 오분 일을 더하여 제사장에게 줄 것이요 제사장은 그 속건제의 수양으로 그를 위하여 속한즉 그가 사함을 얻으리라",
  "leviticus,14,49": "그는 그 집을 정결케 하기 위하여 새 두마리와 백향목과 홍색실과 우슬초를 취하고",
  "leviticus,21,23": "장 안에 들어가지 못할 것이요 단에 가까이 못할지니 이는 그가 흠이 있음이라 이와 같이 그가 나의 성소를 더럽히지 못할 것은 나는 그들을 거룩하게 하는 여호와임이니라",
  "leviticus,27,5": "오 세로 이십 세까지의 남자이면 그 값을 이십 세겔로 하고 여자이면 십 세겔로 하며",
  "numbers,6,10": "제팔일에 산비둘기 두 마리나 집비둘기 새끼 두 마리를 가지고 회중의 성막문에 와서 제사장에게 줄 것이요",
  "numbers,8,9": "레위인을 회중의 성막 앞에 나오게 하고 이스라엘 자손의 온 회중을 모으고",
  "numbers,11,21": "모세가 가로되 나와 함께 있는 이 백성의 보행자가 육십만 명이온데 주의 말씀이 일 개월간 고기를 주어 먹게 하겠다 하시오니",
  "numbers,14,42": "여호와께서 너희 중에 계시지 아니하니 올라가지 말라 너희 대적 앞에서 패할까 하노라",
  "numbers,23,16": "여호와께서 발람에게 임하사 그 입에 말씀을 주어 가라사대 발락에게로 돌아가서 이렇게 말할지니라",
  "numbers,26,50": "이는 그 종족을 따른 납달리 가족들이라 계수함을 입은 자가 사만 오천사백 명이었더라",
  "numbers,30,2": "사람이 여호와께 서원하였거나 마음을 제어하기로 서약하였거든 파약하지 말고 그 입에서 나온 대로 다 행할 것이니라",
  "deuteronomy,3,7": "오직 모든 육축과 그 성읍들에서 탈취한 것은 우리의 소유로 삼았으며",
  "deuteronomy,5,15": "너는 기억하라 네가 애굽 땅에서 종이 되었더니 너의 하나님 여호와가 강한 손과 편 팔로 너를 거기서 인도하여 내었나니 그러므로 너의 하나님 여호와가 너를 명하여 안식일을 지키라 하느니라",
  "deuteronomy,8,17": "또 두렵건대 네가 마음에 이르되 내 능과 내 손의 힘으로 내가 이 재물을 얻었다 할까 하노라",
  "deuteronomy,11,32": "내가 오늘날 너희 앞에 베푸는 모든 규례와 법도를 너희는 지켜 행할지니라",
  "deuteronomy,15,11": "땅에는 언제든지 가난한 자가 그치지 아니하겠으므로 내가 네게 명하여 이르노니 너는 반드시 네 경내 네 형제의 곤궁한 자와 궁핍한 자에게 네 손을 펼지니라",
  "deuteronomy,19,13": "네 눈이 그를 긍휼히 보지 말고 무죄한 피 흘린 죄를 이스라엘에서 제하라 그리하면 네게 복이 있으리라",
  "deuteronomy,23,13": "너의 기구에 작은 삽을 더하여 진에 나가서 대변을 통할 때에 그것으로 땅을 팔 것이요 몸을 돌이켜 그 배설물을 덮을지니",
  "deuteronomy,27,15": "장색의 손으로 조각하였거나 부어 만든 우상은 여호와께 가증하니 그것을 만들어 은밀히 세우는 자는 저주를 받을 것이라 할 것이요 모든 백성은 응답하여 아멘 할지니라",
  "deuteronomy,29,14": "내가 이 언약과 맹세를 너희에게만 세우는 것이 아니라",
};

for (const [key, val] of Object.entries(FIXES)) {
  lnd[key] = val;
}

fs.writeFileSync(LND_PATH, JSON.stringify(lnd, null, 2), 'utf8');
console.log('Fixed', Object.keys(FIXES).length, 'verses');
