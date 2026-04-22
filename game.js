// ══════════════════════════════════════════════════
//  game.js — 월드맵 (마을+숲+던전)
// ══════════════════════════════════════════════════
const {createClient}=supabase;
const db=createClient(SUPABASE_URL,SUPABASE_ANON);

// ── 직업 데이터 ────────────────────────────────────
const CLS_DATA={
  전사:  {icon:'🛡️',maxHp:120,atk:[12,20],bg:'rgba(74,126,200,0.3)',b:'#4a7ec8'},
  마법사:{icon:'🔮',maxHp:80, atk:[22,38],bg:'rgba(138,74,200,0.3)',b:'#8a4ac8'},
  궁수:  {icon:'🏹',maxHp:90, atk:[16,28],bg:'rgba(74,158,106,0.3)',b:'#4a9e6a'},
  힐러:  {icon:'✨',maxHp:100,atk:[8,14], bg:'rgba(200,168,74,0.3)',b:'#c8a84a'},
};

// ── 맵 존 정의 ─────────────────────────────────────
// 월드맵: 마을(왼쪽) + 숲(중간) + 던전입구(오른쪽)
const ZONE={
  WORLD:'world',  // 마을+숲 통합 맵
  D1:'d1', D2:'d2', D3:'d3',  // 던전 1~3층
};
let currentZone=ZONE.WORLD;

// ── 몬스터 정의 ────────────────────────────────────
const MON_VILLAGE=[];  // 마을엔 몬스터 없음
const MON_FOREST=[
  {name:'늑대',      icon:'🐺',hp:70, maxHp:70, atk:[8,15], exp:40, gold:15,spd:1.2,lootChance:0.35,size:1},
  {name:'좀비',      icon:'🧟',hp:90, maxHp:90, atk:[10,18],exp:50, gold:18,spd:0.7,lootChance:0.40,size:1},
  {name:'해골',      icon:'💀',hp:80, maxHp:80, atk:[12,20],exp:55, gold:20,spd:1.0,lootChance:0.40,size:1},
  {name:'늑대인간',  icon:'🐗',hp:130,maxHp:130,atk:[18,28],exp:80, gold:35,spd:1.3,lootChance:0.50,size:1},
  {name:'거대거미',  icon:'🕷️',hp:110,maxHp:110,atk:[15,24],exp:70, gold:30,spd:0.9,lootChance:0.50,size:1},
];
const MON_FOREST_BOSS=[
  {name:'늑대인간 대장',  icon:'🦁',hp:500, maxHp:500, atk:[30,50],exp:400,gold:200,spd:1.1,lootChance:1.0,size:2,boss:true},
  {name:'거대거미 대장',  icon:'🕸️',hp:450, maxHp:450, atk:[28,45],exp:380,gold:180,spd:0.8,lootChance:1.0,size:2,boss:true},
  {name:'해골기사',       icon:'☠️',hp:600, maxHp:600, atk:[35,55],exp:500,gold:250,spd:0.9,lootChance:1.0,size:2,boss:true},
];
const MON_D1=[
  {name:'슬라임',   icon:'🟢',hp:40, maxHp:40, atk:[5,10], exp:20,gold:10,spd:0.8,lootChance:0.30,size:1},
  {name:'고블린',   icon:'👺',hp:60, maxHp:60, atk:[8,14], exp:35,gold:18,spd:1.0,lootChance:0.40,size:1},
  {name:'오크전사', icon:'👹',hp:100,maxHp:100,atk:[12,22],exp:60,gold:30,spd:0.8,lootChance:0.50,size:1},
];
const MON_D2=[
  {name:'다크나이트',icon:'🖤',hp:150,maxHp:150,atk:[18,32],exp:110,gold:70, spd:1.1,lootChance:0.55,size:1},
  {name:'드래곤',   icon:'🐲',hp:200,maxHp:200,atk:[25,45],exp:150,gold:100,spd:0.7,lootChance:0.70,size:1},
  {name:'마왕',     icon:'😈',hp:300,maxHp:300,atk:[35,60],exp:300,gold:200,spd:0.9,lootChance:0.90,size:1},
];
const MON_D3_BOSS=[
  {name:'왕 다크나이트',icon:'⚫',hp:1500,maxHp:1500,atk:[60,90], exp:2000,gold:1000,spd:1.0,lootChance:1.0,size:3,boss:true},
  {name:'왕 마왕',      icon:'👿',hp:2000,maxHp:2000,atk:[80,120],exp:3000,gold:1500,spd:0.8,lootChance:1.0,size:3,boss:true},
  {name:'왕 용',        icon:'🔴',hp:2500,maxHp:2500,atk:[100,150],exp:5000,gold:2000,spd:0.7,lootChance:1.0,size:3,boss:true},
];

// ── 아이템 정의 ────────────────────────────────────
const ITEMS={
  // 무기
  '낡은 검':        {icon:'🗡️',type:'weapon',slot:'weapon',atk:5,  desc:'낡았지만 쓸 만하다',         rarity:'c'},
  '강철 검':        {icon:'⚔️',type:'weapon',slot:'weapon',atk:12, desc:'단단한 강철로 만든 검',      rarity:'u'},
  '마법 지팡이':    {icon:'🪄',type:'weapon',slot:'weapon',atk:18, desc:'마법 에너지가 깃들어 있다',   rarity:'r'},
  '용사의 활':      {icon:'🏹',type:'weapon',slot:'weapon',atk:15, desc:'멀리서도 강력하다',           rarity:'u'},
  '성스러운 지팡이':{icon:'✨',type:'weapon',slot:'weapon',atk:10, desc:'치유의 힘이 깃들어 있다',     rarity:'u'},
  '불꽃 검':        {icon:'🔥',type:'weapon',slot:'weapon',atk:22, desc:'화염이 깃든 전설의 검',       rarity:'e'},
  '미스릴 검':      {icon:'🌟',type:'weapon',slot:'weapon',atk:35, desc:'미스릴로 제련한 성검',        rarity:'e'},
  // 방어구
  '가죽 갑옷':      {icon:'🦺',type:'armor', slot:'armor', def:3,  desc:'가벼운 가죽 갑옷',            rarity:'c'},
  '철 갑옷':        {icon:'🛡️',type:'armor', slot:'armor', def:7,  desc:'튼튼한 철 갑옷',             rarity:'u'},
  '마법 로브':      {icon:'👘',type:'armor', slot:'armor', def:5,  desc:'마법사의 로브',               rarity:'u'},
  '용의 비늘 갑옷': {icon:'🐉',type:'armor', slot:'armor', def:12, desc:'드래곤 비늘 갑옷',            rarity:'e'},
  '미스릴 갑옷':    {icon:'💠',type:'armor', slot:'armor', def:20, desc:'미스릴로 제련한 갑옷',        rarity:'e'},
  // 재료
  '미스릴 광석':    {icon:'🪨',type:'material',desc:'신비한 빛을 내는 광석. 제작에 사용된다.',         rarity:'r'},
  '늑대 발톱':      {icon:'🦴',type:'material',desc:'예리한 늑대 발톱.',                               rarity:'c'},
  '해골 뼈':        {icon:'🦷',type:'material',desc:'단단한 해골 뼈.',                                 rarity:'c'},
  '거미 독':        {icon:'☠️',type:'material',desc:'거대거미의 독.',                                  rarity:'u'},
  // 물약
  '작은 물약':      {icon:'🧪',type:'potion',hp:30,  desc:'HP 30 회복',   rarity:'c'},
  '큰 물약':        {icon:'⚗️',type:'potion',hp:80,  desc:'HP 80 회복',   rarity:'u'},
  '엘릭서':         {icon:'💎',type:'potion',hp:9999,desc:'HP 전체 회복',  rarity:'r'},
};

// 드랍 테이블 (존별)
const LOOT_FOREST=[
  ['늑대 발톱',0.30],['해골 뼈',0.25],['거미 독',0.15],
  ['미스릴 광석',0.08],
  ['작은 물약',0.20],['큰 물약',0.08],['낡은 검',0.06],['가죽 갑옷',0.05],
];
const LOOT_FOREST_BOSS=[
  ['미스릴 광석',0.50],['엘릭서',0.30],['큰 물약',0.20],
];
const LOOT_D1=[
  ['낡은 검',0.15],['강철 검',0.08],['가죽 갑옷',0.12],['철 갑옷',0.07],
  ['작은 물약',0.25],['큰 물약',0.10],['마법 지팡이',0.04],
];
const LOOT_D2=[
  ['강철 검',0.10],['마법 지팡이',0.06],['용의 비늘 갑옷',0.05],
  ['불꽃 검',0.04],['큰 물약',0.15],['엘릭서',0.05],
];
const LOOT_D3=[
  ['미스릴 광석',0.60],['미스릴 검',0.20],['미스릴 갑옷',0.20],
  ['엘릭서',0.40],['용의 비늘 갑옷',0.15],
];

// ── 제작 레시피 ────────────────────────────────────
const RECIPES=[
  {result:'미스릴 검',  materials:{'미스릴 광석':3}, gold:500, desc:'미스릴 광석 3개 + 500G'},
  {result:'미스릴 갑옷',materials:{'미스릴 광석':3}, gold:500, desc:'미스릴 광석 3개 + 500G'},
];

// ── 맵 크기 ────────────────────────────────────────
const MAP_W=2400,MAP_H=1400,TILE=40;
const NC=['#7ab0e0','#b07ae0','#7ade9a','#e0c07a','#e07a7a','#7ae0d8'];

// ── 존별 포털 위치 ─────────────────────────────────
const PORTALS={
  // 여관 입구 (월드맵 왼쪽)
  INN:     {x:120, y:600, w:70, h:90, label:'🍺 황금 용 여관', dest:'inn'},
  // 던전 입구 (월드맵 오른쪽)
  DUNGEON: {x:2300,y:700, w:80, h:100,label:'⚔️ 던전 입구',  dest:ZONE.D1},
  // 던전 계단
  D1_UP:   {x:2350,y:700, w:60, h:60, label:'🔼 2층',         dest:ZONE.D2},
  D2_UP:   {x:2350,y:700, w:60, h:60, label:'🔼 3층',         dest:ZONE.D3},
  D1_DOWN: {x:80,  y:700, w:60, h:60, label:'🔽 나가기',       dest:ZONE.WORLD},
  D2_DOWN: {x:80,  y:700, w:60, h:60, label:'🔽 1층',         dest:ZONE.D1},
  D3_DOWN: {x:80,  y:700, w:60, h:60, label:'🔽 2층',         dest:ZONE.D2},
};

// ── STATE ──────────────────────────────────────────
let me=null, myPos={x:280,y:600}, myTarget=null;
let cam={x:0,y:0}, players={}, monsters={}, drops={};
let lastChatTs=0, activeTab='st', actionLock=false;
let monsterAttackLock=false, torchT=0, innTransitioning=false;
const bubbleTimers={};
// 단축키 슬롯 (2줄 × 4칸)
let hotbar=[[null,null,null,null],[null,null,null,null]];
let hotbarRow=0; // 현재 보이는 줄

const cv=document.getElementById('cv');
const ctx=cv.getContext('2d');
const elLayer=document.getElementById('el');

// ── 커서 ──────────────────────────────────────────
const SWORD_CURSOR="url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'%3E%3Cg transform='translate(18,18) rotate(-135) translate(-18,-18)'%3E%3Ctext x='2' y='30' font-size='28'%3E%F0%9F%97%A1%EF%B8%8F%3C/text%3E%3C/g%3E%3C/svg%3E\") 4 4, crosshair";
const FINGER_CURSOR="url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ctext y='28' font-size='26'%3E%F0%9F%91%86%3C/text%3E%3C/svg%3E\") 12 4, pointer";
const GOLD_CURSOR="url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'%3E%3Cfilter id='g'%3E%3CfeGaussianBlur stdDeviation='2' result='b'/%3E%3CfeMerge%3E%3CfeMergeNode in='b'/%3E%3CfeMergeNode in='SourceGraphic'/%3E%3C/feMerge%3E%3C/filter%3E%3Ctext y='30' font-size='26' filter='url(%23g)' fill='%23ffd700'%3E%F0%9F%91%86%3C/text%3E%3C/svg%3E\") 12 4, pointer";
function setCursor(t){cv.style.cursor=t==='sword'?SWORD_CURSOR:t==='gold'?GOLD_CURSOR:FINGER_CURSOR;}

// ── 맵 생성 ────────────────────────────────────────
const COLS=Math.ceil(MAP_W/TILE), ROWS=Math.ceil(MAP_H/TILE);
const mapData=[];
for(let r=0;r<ROWS;r++){mapData[r]=[];for(let c=0;c<COLS;c++)mapData[r][c]=0;}
// 외곽 벽
for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(r===0||r===ROWS-1||c===0||c===COLS-1)mapData[r][c]=1;
function isWall(x,y){const c=Math.floor(x/TILE),r=Math.floor(y/TILE);if(r<0||r>=ROWS||c<0||c>=COLS)return true;return mapData[r][c]===1;}
function walkable(x,y){return!isWall(x-14,y-14)&&!isWall(x+14,y-14)&&!isWall(x-14,y+14)&&!isWall(x+14,y+14);}
function safeSpawn(cx,cy,r=80){for(let i=0;i<40;i++){const x=cx+(Math.random()-.5)*r*2,y=cy+(Math.random()-.5)*r*2;if(walkable(x,y))return{x,y};}return{x:cx,y:cy};}

// ── 유틸 ──────────────────────────────────────────
const rnd=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>{const dx=a.x-b.x,dy=a.y-b.y;return Math.sqrt(dx*dx+dy*dy);};
function ncol(u){if(!u)return'#8a8070';let h=0;for(const c of u)h=(h*31+c.charCodeAt(0))%NC.length;return NC[h];}
function w2s(wx,wy){return{x:wx-cam.x,y:wy-cam.y};}
function resize(){cv.width=document.getElementById('dc').clientWidth;cv.height=document.getElementById('dc').clientHeight;}
window.addEventListener('resize',resize);

// ── 스탯 계산 ─────────────────────────────────────
const FORGE_BONUS_TABLE=[3,3,4,4,5,5,6,6,7,8];
function forgeBonus(n){if(!n)return 0;const m=n.match(/\+(\d+)$/);if(!m)return 0;const lv=parseInt(m[1]);let b=0;for(let i=0;i<lv&&i<FORGE_BONUS_TABLE.length;i++)b+=FORGE_BONUS_TABLE[i];return b;}
function myAtk(){const base=CLS_DATA[me.cls]?.atk||[10,18];const wn=me.equipped?.weapon;const wb=(ITEMS[wn?.replace(/ \+\d+$/,'')]?.atk||0)+forgeBonus(wn);const lb=Math.floor((me.level-1)*1.5);return[base[0]+wb+lb,base[1]+wb+lb];}
function myDef(){const an=me.equipped?.armor;const ab=(ITEMS[an?.replace(/ \+\d+$/,'')]?.def||0)+forgeBonus(an);return ab+Math.floor((me.level-1)*0.8);}
function myMaxHp(){return(CLS_DATA[me.cls]?.maxHp||100)+(me.level-1)*10;}

// ── 플로팅 텍스트 ─────────────────────────────────
function floatTxt(text,x,y,cls){const d=document.createElement('div');d.className='fdmg '+cls;d.textContent=text;d.style.left=x+'px';d.style.top=y+'px';d.style.pointerEvents='none';elLayer.appendChild(d);setTimeout(()=>d.remove(),900);}

// ── 말풍선 ────────────────────────────────────────
function showBubble(id,text){const el=document.getElementById('ch-'+id);if(!el)return;let b=el.querySelector('.cbub');if(!b){b=document.createElement('div');b.className='cbub';el.appendChild(b);}b.textContent=text;clearTimeout(bubbleTimers[id]);bubbleTimers[id]=setTimeout(()=>{if(b.parentNode)b.remove();},4000);}

// ── SVG 캐릭터 ────────────────────────────────────
const CLS_COLORS={전사:{body:'#4a7ec8',hair:'#3a2010',cloth:'#2a4a8a'},마법사:{body:'#8a4ac8',hair:'#1a0a2a',cloth:'#5a2a8a'},궁수:{body:'#4a9e6a',hair:'#2a1a0a',cloth:'#2a6a4a'},힐러:{body:'#c8a84a',hair:'#5a3a10',cloth:'#8a6a2a'}};
function makeHumanSVG(cls,isMe){const cd=CLS_COLORS[cls]||CLS_COLORS['전사'];const glow=isMe?`filter:drop-shadow(0 0 5px ${cd.body}99);`:'';return`<svg viewBox="0 0 36 48" width="32" height="42" style="${glow};display:block;overflow:visible"><g class="body-g"><g class="leg-l" style="transform-origin:18px 36px"><rect x="13" y="34" width="7" height="11" rx="3" fill="${cd.cloth}" opacity="0.9"/><rect x="13" y="42" width="8" height="4" rx="2" fill="#2a1a0a"/></g><g class="leg-r" style="transform-origin:18px 36px"><rect x="20" y="34" width="7" height="11" rx="3" fill="${cd.cloth}" opacity="0.9"/><rect x="20" y="42" width="8" height="4" rx="2" fill="#2a1a0a"/></g><rect x="11" y="20" width="14" height="16" rx="4" fill="${cd.cloth}"/><rect x="14" y="22" width="8" height="2" rx="1" fill="${cd.body}" opacity="0.6"/><g class="arm-l" style="transform-origin:12px 22px"><rect x="6" y="20" width="6" height="10" rx="3" fill="${cd.body}" opacity="0.9"/><rect x="6" y="28" width="6" height="4" rx="2" fill="#d4a882"/></g><g class="arm-r" style="transform-origin:24px 22px"><rect x="24" y="20" width="6" height="10" rx="3" fill="${cd.body}" opacity="0.9"/><rect x="24" y="28" width="6" height="4" rx="2" fill="#d4a882"/></g><rect x="15" y="16" width="6" height="6" rx="2" fill="#d4a882"/><ellipse cx="18" cy="12" rx="9" ry="10" fill="#d4a882"/><ellipse cx="18" cy="5" rx="9" ry="5" fill="${cd.hair}"/><rect x="9" y="4" width="4" height="8" rx="2" fill="${cd.hair}"/><rect x="23" y="4" width="4" height="8" rx="2" fill="${cd.hair}"/><ellipse cx="14.5" cy="12" rx="2" ry="2.2" fill="white"/><ellipse cx="21.5" cy="12" rx="2" ry="2.2" fill="white"/><ellipse cx="14.8" cy="12.3" rx="1.2" ry="1.4" fill="#1a0a00"/><ellipse cx="21.8" cy="12.3" rx="1.2" ry="1.4" fill="#1a0a00"/><circle cx="15.3" cy="11.7" r="0.4" fill="white"/><circle cx="22.3" cy="11.7" r="0.4" fill="white"/><path d="M15.5 16.5 Q18 18 20.5 16.5" stroke="#a06040" stroke-width="1" fill="none" stroke-linecap="round"/>${isMe?`<text x="18" y="0" text-anchor="middle" font-size="7">⭐</text>`:''}</g></svg>`;}

// ── 맵 그리기 ─────────────────────────────────────
function drawMap(){
  torchT+=0.03;
  ctx.clearRect(0,0,cv.width,cv.height);
  if(currentZone===ZONE.WORLD) drawWorldMap();
  else drawDungeonMap();
  drawZoneLabel();
  drawHotbar();
}

function drawWorldMap(){
  const W=cv.width,H=cv.height;
  // 마을 구역 (왼쪽 1/2): 돌바닥
  const villageEnd=MAP_W*0.5;
  const forestEnd=MAP_W*0.85;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const wx=c*TILE-cam.x,wy=r*TILE-cam.y;
    if(wx+TILE<0||wx>W||wy+TILE<0||wy>H)continue;
    const worldX=c*TILE;
    if(mapData[r][c]===1){ctx.fillStyle='#282030';ctx.fillRect(wx,wy,TILE,TILE);}
    else if(worldX<villageEnd){// 마을: 돌길
      ctx.fillStyle=(r+c)%2===0?'#c8b890':'#b8a880';ctx.fillRect(wx,wy,TILE,TILE);
      ctx.strokeStyle='rgba(0,0,0,0.1)';ctx.lineWidth=0.5;ctx.strokeRect(wx,wy,TILE,TILE);
    } else if(worldX<forestEnd){// 숲: 풀밭
      const shade=Math.sin(r*0.7+c*0.5)*0.05;
      ctx.fillStyle=`rgb(${Math.floor(50+shade*50)},${Math.floor(90+shade*50)},${Math.floor(40+shade*30)})`;
      ctx.fillRect(wx,wy,TILE,TILE);
      // 나무 광원
      if(r%5===2&&c%6===2){const fl=0.4+Math.sin(torchT+c)*0.15;const g=ctx.createRadialGradient(wx+TILE/2,wy+TILE/2,5,wx+TILE/2,wy+TILE/2,60);g.addColorStop(0,`rgba(40,180,40,${0.1*fl})`);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(wx-30,wy-30,TILE+60,TILE+60);}
    } else {// 던전 입구 구역: 어두운 바위
      ctx.fillStyle=(r+c)%2===0?'#2a2535':'#221e2e';ctx.fillRect(wx,wy,TILE,TILE);
    }
  }
  // 건물 그리기
  drawVillageBuildings();
  // 나무들
  drawForestTrees();
  // 여관 입구
  drawInnEntrance();
  // 던전 입구
  drawDungeonEntrance();
}

function drawVillageBuildings(){
  const W=cv.width,H=cv.height;
  // 상인 상점
  drawBuilding(300,300,120,100,'#8B4513','#A0522D','🛒 상점',false);
  // 대장장이
  drawBuilding(500,300,120,100,'#696969','#808080','🔨 대장간',true);
  // 집들
  [[150,450,80,70,'#8B4513','#A0522D',''],[700,350,90,80,'#6B4A2A','#8B6040',''],[800,500,80,70,'#7A4A2A','#9B5030','']].forEach(([x,y,w,h,c1,c2,l])=>drawBuilding(x,y,w,h,c1,c2,l,false));
}

function drawBuilding(bx,by,bw,bh,wallCol,roofCol,label,hasAnvil){
  const sx=bx-cam.x,sy=by-cam.y;
  if(sx+bw<0||sx>cv.width||sy+bh<0||sy>cv.height)return;
  // 건물 벽
  ctx.fillStyle=wallCol;ctx.fillRect(sx,sy,bw,bh);
  // 지붕
  ctx.fillStyle=roofCol;ctx.beginPath();ctx.moveTo(sx-8,sy);ctx.lineTo(sx+bw/2,sy-30);ctx.lineTo(sx+bw+8,sy);ctx.closePath();ctx.fill();
  // 문
  ctx.fillStyle='#3a2010';ctx.fillRect(sx+bw/2-12,sy+bh-30,24,30);
  ctx.fillStyle='rgba(255,180,80,0.4)';ctx.fillRect(sx+bw/2-10,sy+bh-28,20,26);
  // 창문
  [[sx+10,sy+20],[sx+bw-30,sy+20]].forEach(([wx,wy])=>{ctx.fillStyle='#1a1008';ctx.fillRect(wx,wy,20,16);const fl=0.6+Math.sin(torchT*2+bx)*0.4;ctx.fillStyle=`rgba(255,200,100,${fl*0.5})`;ctx.fillRect(wx+1,wy+1,18,14);});
  // 간판
  if(label){ctx.fillStyle='rgba(10,6,2,0.85)';const lw=ctx.measureText(label).width+12;ctx.fillRect(sx+bw/2-lw/2,sy-50,lw,18);ctx.fillStyle='#e8d0a0';ctx.font='11px Noto Sans KR,sans-serif';ctx.textAlign='center';ctx.fillText(label,sx+bw/2,sy-37);}
  // 대장간 모루
  if(hasAnvil){ctx.fillStyle='#555';ctx.fillRect(sx+bw+5,sy+bh-25,25,15);ctx.fillRect(sx+bw+8,sy+bh-10,18,8);ctx.font='14px sans-serif';ctx.textAlign='center';ctx.fillText('🔥',sx+bw/2,sy+bh-38);}
}

function drawForestTrees(){
  // 숲 구역에 나무 배치
  const forestStartX=MAP_W*0.5;
  const forestEndX=MAP_W*0.85;
  const treePositions=[];
  for(let x=forestStartX+80;x<forestEndX-80;x+=120){
    for(let y=200;y<MAP_H-200;y+=110){
      treePositions.push([x+(Math.sin(x+y)*30),y+(Math.cos(x*y)*20)]);
    }
  }
  treePositions.forEach(([tx,ty])=>{
    const sx=tx-cam.x,sy=ty-cam.y;
    if(sx<-50||sx>cv.width+50||sy<-80||sy>cv.height+50)return;
    // 나무 그림자
    ctx.fillStyle='rgba(0,0,0,0.25)';ctx.beginPath();ctx.ellipse(sx+5,sy+10,20,10,0,0,Math.PI*2);ctx.fill();
    // 나무 줄기
    ctx.fillStyle='#5a3a18';ctx.fillRect(sx-5,sy-20,10,30);
    // 나무 잎
    ctx.fillStyle='#1a5c1a';ctx.beginPath();ctx.arc(sx,sy-30,22,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#2a7a2a';ctx.beginPath();ctx.arc(sx-5,sy-40,16,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#3a9a3a';ctx.beginPath();ctx.arc(sx+3,sy-35,12,0,Math.PI*2);ctx.fill();
  });
}

function drawInnEntrance(){
  const p=PORTALS.INN;
  const sx=p.x-cam.x,sy=p.y-cam.y;
  const near=dist({x:p.x+p.w/2,y:p.y+p.h/2},myPos)<100;
  const hovered=Math.abs(mouseWX-(p.x+p.w/2))<55&&Math.abs(mouseWY-(p.y+p.h/2))<55;
  const fl=0.7+Math.sin(torchT*2)*0.3;
  // 광원
  const gw=ctx.createRadialGradient(sx+p.w/2,sy+p.h/2,8,sx+p.w/2,sy+p.h/2,hovered?130:100);
  gw.addColorStop(0,`rgba(255,${hovered?210:160},${hovered?90:60},${(hovered?0.35:0.22)*fl})`);gw.addColorStop(1,'transparent');
  ctx.fillStyle=gw;ctx.fillRect(sx-60,sy-60,p.w+120,p.h+120);
  // 건물
  ctx.fillStyle='#3a2510';ctx.fillRect(sx,sy,p.w,p.h);
  ctx.fillStyle='#5a3818';ctx.fillRect(sx-6,sy,p.w+12,14);
  // 문
  const dX=sx+p.w/2-14,dY=sy+p.h-44;
  ctx.fillStyle='#1a0e06';ctx.fillRect(dX-3,dY-3,30,47);
  const dg=ctx.createLinearGradient(dX,dY,dX,dY+44);dg.addColorStop(0,`rgba(255,180,80,${0.85*fl})`);dg.addColorStop(1,`rgba(200,120,40,${0.5*fl})`);
  ctx.fillStyle=dg;ctx.fillRect(dX,dY,28,44);
  // 간판
  ctx.fillStyle='#5a3818';ctx.fillRect(sx+p.w/2-32,sy-22,64,18);
  ctx.strokeStyle=hovered?'#ffd700':'#c9a84c';ctx.lineWidth=1;ctx.strokeRect(sx+p.w/2-32,sy-22,64,18);
  ctx.fillStyle=hovered?'#ffd700':'#c9a84c';ctx.font='bold 9px Noto Sans KR,sans-serif';ctx.textAlign='center';ctx.fillText('🍺 황금 용',sx+p.w/2,sy-9);
  // 호버 테두리
  if(hovered){ctx.save();ctx.strokeStyle=`rgba(255,215,0,${0.8+Math.sin(torchT*5)*0.2})`;ctx.lineWidth=2.5;ctx.shadowColor='#ffd700';ctx.shadowBlur=12;ctx.strokeRect(sx-2,sy-2,p.w+4,p.h+4);ctx.restore();}
  // 안내
  if(near||hovered){ctx.save();ctx.fillStyle='rgba(10,8,2,0.9)';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(sx+p.w/2-38,sy-46,76,20,5);else ctx.rect(sx+p.w/2-38,sy-46,76,20);ctx.fill();ctx.strokeStyle=hovered?'#ffd700':'#c9a84c';ctx.lineWidth=1;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(sx+p.w/2-38,sy-46,76,20,5);else ctx.rect(sx+p.w/2-38,sy-46,76,20);ctx.stroke();ctx.fillStyle=hovered?'#ffd700':'#e8d0a0';ctx.font='11px Noto Sans KR,sans-serif';ctx.textAlign='center';ctx.fillText('🚪 여관 입장',sx+p.w/2,sy-31);ctx.restore();}
}

function drawDungeonEntrance(){
  const p=PORTALS.DUNGEON;
  const sx=p.x-cam.x,sy=p.y-cam.y;
  if(sx>cv.width+100||sx+p.w<-100)return;
  const hovered=Math.abs(mouseWX-(p.x+p.w/2))<60&&Math.abs(mouseWY-(p.y+p.h/2))<60;
  const fl=0.65+Math.sin(torchT*2.5)*0.35;
  const g=ctx.createRadialGradient(sx+p.w/2,sy+p.h/2,8,sx+p.w/2,sy+p.h/2,120);
  g.addColorStop(0,`rgba(180,80,255,${0.25*fl})`);g.addColorStop(1,'transparent');
  ctx.fillStyle=g;ctx.fillRect(sx-60,sy-60,p.w+120,p.h+120);
  // 문
  ctx.fillStyle='#1a1025';ctx.fillRect(sx,sy,p.w,p.h);
  ctx.fillStyle='#2a1a3a';ctx.fillRect(sx+5,sy+5,p.w-10,p.h-10);
  // 해골 장식
  ctx.font='24px sans-serif';ctx.textAlign='center';ctx.fillText('💀',sx+p.w/2,sy+40);
  ctx.fillText('⚔️',sx+p.w/2-20,sy+70);ctx.fillText('⚔️',sx+p.w/2+20,sy+70);
  // 빛
  const ag=ctx.createRadialGradient(sx+p.w/2,sy,5,sx+p.w/2,sy,p.w/2);
  ag.addColorStop(0,`rgba(180,80,255,${0.8*fl})`);ag.addColorStop(1,`rgba(100,20,150,${0.2*fl})`);
  ctx.fillStyle=ag;ctx.beginPath();ctx.arc(sx+p.w/2,sy,p.w/2,Math.PI,0);ctx.fill();
  if(hovered){ctx.save();ctx.strokeStyle=`rgba(255,215,0,${0.8+Math.sin(torchT*5)*0.2})`;ctx.lineWidth=2.5;ctx.shadowColor='#ffd700';ctx.shadowBlur=12;ctx.strokeRect(sx-2,sy-2,p.w+4,p.h+4);ctx.restore();}
  // 안내
  ctx.save();ctx.fillStyle='rgba(10,5,20,0.9)';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(sx+p.w/2-40,sy-30,80,20,5);else ctx.rect(sx+p.w/2-40,sy-30,80,20);ctx.fill();ctx.strokeStyle=hovered?'#ffd700':'#8040c0';ctx.lineWidth=1;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(sx+p.w/2-40,sy-30,80,20,5);else ctx.rect(sx+p.w/2-40,sy-30,80,20);ctx.stroke();ctx.fillStyle=hovered?'#ffd700':'#c080ff';ctx.font='11px Noto Sans KR,sans-serif';ctx.textAlign='center';ctx.fillText('⚔️ 던전 입구',sx+p.w/2,sy-15);ctx.restore();
}

function drawDungeonMap(){
  // 던전 층별 색상
  const floorCols={[ZONE.D1]:['#121620','#0f131a'],[ZONE.D2]:['#1a1020','#150d1a'],[ZONE.D3]:['#200808','#180505']};
  const wallCols={[ZONE.D1]:'#181c28',[ZONE.D2]:'#22182a',[ZONE.D3]:'#280a0a'};
  const cols=floorCols[currentZone]||floorCols[ZONE.D1];
  const wc=wallCols[currentZone]||wallCols[ZONE.D1];
  const sc=Math.max(0,Math.floor(cam.x/TILE)-1);
  const sr=Math.max(0,Math.floor(cam.y/TILE)-1);
  const ec=Math.min(COLS,sc+Math.ceil(cv.width/TILE)+2);
  const er=Math.min(ROWS,sr+Math.ceil(cv.height/TILE)+2);
  for(let r=sr;r<er;r++)for(let c=sc;c<ec;c++){
    const sx=c*TILE-cam.x,sy=r*TILE-cam.y;
    if(mapData[r][c]===1){ctx.fillStyle=wc;ctx.fillRect(sx,sy,TILE,TILE);}
    else{ctx.fillStyle=(r+c)%2===0?cols[0]:cols[1];ctx.fillRect(sx,sy,TILE,TILE);
      if(r%8===1&&c%10===1){const fl=0.4+Math.sin(torchT*3+c+r)*0.4;const col=currentZone===ZONE.D3?`rgba(255,50,20,${0.12*fl})`:currentZone===ZONE.D2?`rgba(180,80,255,${0.1*fl})`:`rgba(255,140,40,${0.12*fl})`;const g=ctx.createRadialGradient(sx+TILE/2,sy+TILE/2,4,sx+TILE/2,sy+TILE/2,80);g.addColorStop(0,col);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(sx-30,sy-30,TILE+60,TILE+60);}
    }
  }
  drawStairs();
}

function drawStairs(){
  // 위쪽 계단 (다음 층)
  let upDest, downDest, upPos, downPos;
  if(currentZone===ZONE.D1){upPos={x:2300,y:700};downPos={x:120,y:700};upDest='🔼 2층';downDest='🔽 나가기';}
  else if(currentZone===ZONE.D2){upPos={x:2300,y:700};downPos={x:120,y:700};upDest='🔼 3층';downDest='🔽 1층';}
  else{upPos=null;downPos={x:120,y:700};downDest='🔽 2층';}
  [upPos&&{...upPos,label:upDest,col:'#4a8ec8',glow:'rgba(100,180,255,0.2)',em:'🔼'},
   {x:downPos.x,y:downPos.y,label:downDest,col:'#4ac870',glow:'rgba(100,255,150,0.2)',em:'🔽'}
  ].filter(Boolean).forEach(st=>{
    const sx=st.x-cam.x,sy=st.y-cam.y;
    const fl=0.7+Math.sin(torchT*2.5)*0.3;
    const g=ctx.createRadialGradient(sx,sy,5,sx,sy,80);g.addColorStop(0,st.glow.replace('0.2',`${0.25*fl})`).replace('rgba(','rgba(').replace(/\)$/,`${0.25*fl})`));g.addColorStop(1,'transparent');
    ctx.fillStyle=`rgba(${st.col==='#4a8ec8'?'100,180,255':'100,255,150'},${0.2*fl})`;ctx.fillRect(sx-70,sy-70,140,140);
    ctx.fillStyle=st.col==='#4a8ec8'?'#1a2840':'#1a3020';ctx.fillRect(sx-30,sy-30,60,60);
    ctx.strokeStyle=st.col;ctx.lineWidth=1.5;ctx.strokeRect(sx-30,sy-30,60,60);
    ctx.font='22px sans-serif';ctx.textAlign='center';ctx.fillText(st.em,sx,sy+8);
    const near=dist({x:st.x,y:st.y},myPos)<90;
    if(near){ctx.save();ctx.fillStyle='rgba(10,14,26,0.9)';const lw=80;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(sx-lw/2,sy-52,lw,20,5);else ctx.rect(sx-lw/2,sy-52,lw,20);ctx.fill();ctx.strokeStyle=st.col;ctx.lineWidth=1;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(sx-lw/2,sy-52,lw,20,5);else ctx.rect(sx-lw/2,sy-52,lw,20);ctx.stroke();ctx.fillStyle='#e8e0d0';ctx.font='10px Noto Sans KR,sans-serif';ctx.fillText(st.label,sx,sy-37);ctx.restore();}
  });
}

function drawZoneLabel(){
  const labels={[ZONE.WORLD]:'🏘️ 마을 & 숲',[ZONE.D1]:'🏰 던전 1층',[ZONE.D2]:'👿 던전 2층',[ZONE.D3]:'💀 던전 3층 (보스)'};
  const cols={[ZONE.WORLD]:'#c9a84c',[ZONE.D1]:'#c9a84c',[ZONE.D2]:'#a060ff',[ZONE.D3]:'#ff4040'};
  const label=labels[currentZone]||'';
  ctx.save();ctx.fillStyle='rgba(10,8,20,0.75)';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(8,8,160,28,6);else ctx.rect(8,8,160,28);ctx.fill();ctx.fillStyle=cols[currentZone]||'#c9a84c';ctx.font='bold 13px Cinzel,serif';ctx.textAlign='left';ctx.fillText(label,16,28);ctx.restore();
}

// ── 하단 HUD (HP바 + 단축키) ──────────────────────
function drawHotbar(){
  if(!me)return;
  const W=cv.width, H=cv.height;
  const slotSize=48, gap=6, cols=4;
  const totalW=cols*(slotSize+gap)-gap;
  const startX=(W-totalW)/2;
  const barY=H-110; // HP바 Y
  const hotbarY=H-58; // 단축키 Y

  // HP 바 (중앙 하단)
  const mh=myMaxHp(), p=clamp(me.hp/mh,0,1);
  const barW=totalW+20, barH=14;
  const barX=startX-10;
  // 배경
  ctx.fillStyle='rgba(10,8,20,0.82)';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(barX-6,barY-8,barW+12,barH+30,8);else ctx.rect(barX-6,barY-8,barW+12,barH+30);ctx.fill();
  // HP 바
  ctx.fillStyle='rgba(255,255,255,0.08)';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(barX,barY,barW,barH,6);else ctx.rect(barX,barY,barW,barH);ctx.fill();
  const hpCol=p>0.5?'#4a9e6a':p>0.25?'#c8874a':'#c84a4a';
  ctx.fillStyle=hpCol;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(barX,barY,barW*p,barH,6);else ctx.rect(barX,barY,barW*p,barH);ctx.fill();
  // HP 텍스트
  ctx.fillStyle='#e8e0d0';ctx.font='bold 11px Noto Sans KR,sans-serif';ctx.textAlign='center';
  ctx.fillText(`❤️ ${me.hp} / ${mh}`,barX+barW/2,barY+11);

  // 단축키 줄 표시 (Tab으로 전환)
  ctx.fillStyle='rgba(255,255,255,0.5)';ctx.font='9px Noto Sans KR,sans-serif';ctx.textAlign='right';
  ctx.fillText(`Tab: ${hotbarRow===0?'줄2':'줄1'}으로`,barX-10,hotbarY-4);
  // 현재 줄 번호
  ctx.fillStyle='rgba(255,255,255,0.4)';ctx.textAlign='left';
  ctx.fillText(`줄 ${hotbarRow+1}/2`,barX,hotbarY-4);

  // 슬롯 그리기
  for(let i=0;i<cols;i++){
    const sx=startX+i*(slotSize+gap);
    const item=hotbar[hotbarRow][i];
    const def=item?ITEMS[item.replace(/ \+\d+$/,'')]||{}:{};
    // 슬롯 배경
    ctx.fillStyle=item?'rgba(60,40,20,0.9)':'rgba(20,18,30,0.85)';
    ctx.strokeStyle=item?'#c9a84c':'#3a3850';ctx.lineWidth=1.5;
    ctx.beginPath();if(ctx.roundRect)ctx.roundRect(sx,hotbarY,slotSize,slotSize,5);else ctx.rect(sx,hotbarY,slotSize,slotSize);ctx.fill();ctx.stroke();
    // 단축키 번호
    ctx.fillStyle='rgba(255,255,255,0.4)';ctx.font='9px Noto Sans KR,sans-serif';ctx.textAlign='left';ctx.fillText('QWER'[i],sx+3,hotbarY+11);
    // 아이템
    if(item){
      ctx.font='22px sans-serif';ctx.textAlign='center';ctx.fillText(def.icon||'📦',sx+slotSize/2,hotbarY+34);
      if(def.type==='potion'&&def.hp){ctx.fillStyle='rgba(74,158,106,0.9)';ctx.font='bold 9px sans-serif';ctx.fillText(`+${def.hp>=9999?'Full':def.hp}`,sx+slotSize/2,hotbarY+slotSize-3);}
    }
  }
}

// 단축키 Q,W,E,R 사용
document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT')return;
  const key=e.key.toLowerCase();
  // 단축키 사용
  const slot={'q':0,'w':1,'e':2,'r':3}[key];
  if(slot!==undefined){const item=hotbar[hotbarRow][slot];if(item)useHotbarItem(slot);return;}
  // Tab: 줄 전환
  if(key==='tab'){e.preventDefault();hotbarRow=hotbarRow===0?1:0;return;}
});

function useHotbarItem(slot){
  const itemName=hotbar[hotbarRow][slot];if(!itemName||!me)return;
  const def=ITEMS[itemName];if(!def)return;
  if(def.type==='potion'){
    const mh=myMaxHp(),healed=Math.min(def.hp||0,mh-me.hp);
    if(healed<=0){addLine({cls:'sy',text:'HP가 이미 가득 찼습니다!'});return;}
    me.hp=Math.min(mh,me.hp+(def.hp||0));
    // 인벤에서 제거
    const idx=me.inventory.findIndex(it=>it.name===itemName);
    if(idx>=0){me.inventory.splice(idx,1);if(!me.inventory.some(it=>it.name===itemName))hotbar[hotbarRow][slot]=null;}
    const s=w2s(myPos.x,myPos.y);floatTxt('+'+healed,s.x,s.y-30,'h');
    addLine({cls:'hl',text:`🧪 ${itemName} 사용! HP +${healed}`});
    renderCurTab();saveProfile();
  }
}

// 인벤 아이템을 단축키 슬롯에 등록 (인벤에서 우클릭)
function setHotbar(itemName,row,slot){hotbar[row][slot]=itemName;addLine({cls:'sy',text:`[${row+1}줄-${'QWER'[slot]}] ${itemName} 등록`});}

// ── 마우스 ────────────────────────────────────────
let mouseWX=0,mouseWY=0;
cv.addEventListener('mousemove',e=>{
  const r=cv.getBoundingClientRect();
  mouseWX=e.clientX-r.left+cam.x;mouseWY=e.clientY-r.top+cam.y;
  if(!me)return;
  let onMon=false;
  for(const m of Object.values(monsters)){if(!m.alive)continue;if(dist({x:mouseWX,y:mouseWY},m)<30*(m.size||1)){onMon=true;break;}}
  if(onMon){setCursor('sword');return;}
  // 포털 골든 커서
  if(currentZone===ZONE.WORLD){
    const p=PORTALS.INN;if(Math.abs(mouseWX-(p.x+p.w/2))<55&&Math.abs(mouseWY-(p.y+p.h/2))<55){setCursor('gold');return;}
    const d=PORTALS.DUNGEON;if(Math.abs(mouseWX-(d.x+d.w/2))<65&&Math.abs(mouseWY-(d.y+d.h/2))<65){setCursor('gold');return;}
    // 마을 NPC
    [[300+60,300+60],[500+60,300+60]].forEach(([nx,ny])=>{if(dist({x:mouseWX,y:mouseWY},{x:nx,y:ny})<55)setCursor('gold');});
  }
  setCursor('default');
});
cv.addEventListener('mouseleave',()=>setCursor('default'));

// ── 캐릭터 DOM ─────────────────────────────────────
function getOrMakeChar(id,data){let e=document.getElementById('ch-'+id);if(!e){e=document.createElement('div');e.id='ch-'+id;e.className='ce';e.style.pointerEvents='none';e.innerHTML=makeHumanSVG(data.cls||'전사',id===me?.id)+`<div class="chw"><div class="chb" id="chb-${id}"></div></div><div class="cn2" style="color:${ncol(data.username)}">${data.username}${id===me?.id?' ⭐':''}</div>`;elLayer.appendChild(e);}return e;}
function placeChar(id,data){const e=getOrMakeChar(id,data);const s=w2s(data.x,data.y);e.style.left=s.x+'px';e.style.top=s.y+'px';e.style.transform='translate(-50%,-60%)';const hb=document.getElementById('chb-'+id);if(hb){const p=clamp((data.hp/(data.maxHp||100))*100,0,100);hb.style.width=p+'%';hb.style.background=p>50?'#4a9e6a':p>25?'#c8874a':'#c84a4a';}}
function remChar(id){const e=document.getElementById('ch-'+id);if(e)e.remove();}

// ── 몬스터 DOM ─────────────────────────────────────
function getOrMakeMon(id,m){let e=document.getElementById('mn-'+id);if(!e){e=document.createElement('div');e.id='mn-'+id;e.className='me2';e.style.pointerEvents='all';e.style.cursor=SWORD_CURSOR;const sz=m.size||1;const fontSize=sz===3?36:sz===2?28:22;e.innerHTML=`<div class="ms" id="msp-${id}" style="font-size:${fontSize}px">${m.icon}</div><div class="mhw" style="width:${40+sz*10}px"><div class="mhf" id="mhp-${id}" style="width:100%"></div></div><div class="mnl${m.boss?' boss-lbl':''}">${m.name}${m.boss?' 👑':''}</div>`;e.addEventListener('click',ev=>{ev.stopPropagation();attackMon(id);});e.addEventListener('mouseenter',()=>setCursor('sword'));e.addEventListener('mouseleave',()=>setCursor('default'));elLayer.appendChild(e);}return e;}
function placeMon(id,m){if(!m.alive){const e=document.getElementById('mn-'+id);if(e)e.remove();return;}const e=getOrMakeMon(id,m);const s=w2s(m.x,m.y);e.style.left=s.x+'px';e.style.top=s.y+'px';e.style.transform='translate(-50%,-50%)';e.style.zIndex=Math.floor(m.y);const p=clamp((m.hp/m.maxHp)*100,0,100);const hb=document.getElementById('mhp-'+id);if(hb){hb.style.width=p+'%';hb.style.background=p>50?'#c84a4a':p>25?'#c8874a':'#e06060';}}
function remMon(id){const e=document.getElementById('mn-'+id);if(e)e.remove();}

// ── 드랍 DOM ──────────────────────────────────────
function placeDrop(id,drop){let e=document.getElementById('dp-'+id);if(!e){e=document.createElement('div');e.id='dp-'+id;e.className='de';const def=ITEMS[drop.item]||{};e.textContent=def.icon||'📦';e.title=drop.item+' (클릭 획득)';e.style.pointerEvents='all';e.style.cursor='pointer';e.addEventListener('click',ev=>{ev.stopPropagation();tryPickup(id,drop);});elLayer.appendChild(e);}const s=w2s(drop.x,drop.y);e.style.left=s.x+'px';e.style.top=s.y+'px';}
function remDrop(id){const e=document.getElementById('dp-'+id);if(e)e.remove();}

// ── 메인 루프 ─────────────────────────────────────
function loop(){
  let moving=false;
  if(myTarget){
    const dx=myTarget.x-myPos.x,dy=myTarget.y-myPos.y,d=Math.sqrt(dx*dx+dy*dy);
    if(d>4){const sp=3.5,nx=myPos.x+dx/d*sp,ny=myPos.y+dy/d*sp;if(walkable(nx,ny)){myPos.x=nx;myPos.y=ny;}else if(walkable(nx,myPos.y))myPos.x=nx;else if(walkable(myPos.x,ny))myPos.y=ny;moving=true;}
    else{myPos.x=myTarget.x;myPos.y=myTarget.y;myTarget=null;}
  }
  cam.x=clamp(myPos.x-cv.width/2,0,Math.max(0,MAP_W-cv.width));
  cam.y=clamp(myPos.y-cv.height/2,0,Math.max(0,MAP_H-cv.height));
  monAI();drawMap();checkPortals();
  const ac={...players,[me.id]:{...me,x:myPos.x,y:myPos.y}};
  for(const[id,d]of Object.entries(ac))placeChar(id,d);
  for(const[id,m]of Object.entries(monsters))placeMon(id,m);
  for(const[id,d]of Object.entries(drops))placeDrop(id,d);
  const myEl=document.getElementById('ch-'+me.id);if(myEl)myEl.classList.toggle('wk',moving);
  requestAnimationFrame(loop);
}

// ── 포털 체크 ─────────────────────────────────────
let portalCool=false;
function checkPortals(){
  if(!me||portalCool||innTransitioning)return;
  if(currentZone===ZONE.WORLD){
    // 여관 입구
    const p=PORTALS.INN;
    if(Math.abs(myPos.x-(p.x+p.w/2))<25&&Math.abs(myPos.y-(p.y+p.h-10))<30){
      innTransitioning=true;myTarget=null;addLine({cls:'sy',text:'🍺 황금 용 여관으로 들어갑니다...'});saveProfile();setTimeout(()=>window.location.href='chatroom.html?respawn=1',800);return;
    }
    // 마을 상인
    if(dist({x:mouseWX,y:mouseWY},{x:300+60,y:300+60})<55&&cv.onclick){}
    // 던전 입구
    const d=PORTALS.DUNGEON;
    if(dist(myPos,{x:d.x+d.w/2,y:d.y+d.h/2})<50){portalCool=true;changeZone(ZONE.D1);setTimeout(()=>portalCool=false,1500);return;}
  } else {
    // 던전 계단
    let upX,downX;
    if(currentZone===ZONE.D1){upX=2300;downX=120;}
    else if(currentZone===ZONE.D2){upX=2300;downX=120;}
    else{upX=null;downX=120;}
    if(upX&&dist(myPos,{x:upX,y:700})<45){portalCool=true;changeZone(currentZone===ZONE.D1?ZONE.D2:ZONE.D3);setTimeout(()=>portalCool=false,1500);return;}
    if(dist(myPos,{x:downX,y:700})<45){portalCool=true;changeZone(currentZone===ZONE.D1?ZONE.WORLD:currentZone===ZONE.D2?ZONE.D1:ZONE.D2);setTimeout(()=>portalCool=false,1500);return;}
  }
}

function changeZone(zone){
  currentZone=zone;
  Object.keys(monsters).forEach(id=>remMon(id));monsters={};
  Object.keys(drops).forEach(id=>remDrop(id));drops={};
  spawnMonsters();
  // 시작 위치
  if(zone===ZONE.WORLD)myPos=safeSpawn(280,600,80);
  else if(zone===ZONE.D1)myPos=safeSpawn(200,700,80);
  else if(zone===ZONE.D2)myPos=safeSpawn(200,700,80);
  else if(zone===ZONE.D3)myPos=safeSpawn(400,700,80);
  const msgs={[ZONE.WORLD]:'🏘️ 마을으로 돌아왔습니다.',[ZONE.D1]:'🏰 던전 1층 입장!',[ZONE.D2]:'👿 던전 2층! 더 강한 몬스터입니다.',[ZONE.D3]:'💀 던전 3층! 보스가 기다립니다!'};
  addLine({cls:'sy',text:msgs[zone]||''});
}

// ── 몬스터 AI ─────────────────────────────────────
let lastAi=0;
function monAI(){
  const now=Date.now();if(now-lastAi<350)return;lastAi=now;
  for(const[id,m]of Object.entries(monsters)){
    if(!m.alive)continue;
    const d=dist(m,myPos);
    const aggroRange=m.boss?350:220;
    if(d<aggroRange){
      if(d>45){const dx=myPos.x-m.x,dy=myPos.y-m.y,dd=Math.sqrt(dx*dx+dy*dy);const nx=m.x+dx/dd*m.spd*2.2,ny=m.y+dy/dd*m.spd*2.2;if(walkable(nx,ny)){m.x=nx;m.y=ny;}}
      else if(!monsterAttackLock){
        const def=myDef(),raw=rnd(m.atk[0],m.atk[1]),dmg=Math.max(1,raw-def);
        me.hp=Math.max(0,me.hp-dmg);
        const s=w2s(myPos.x,myPos.y);floatTxt('-'+dmg,s.x,s.y-20,'p');
        addLine({cls:'bt',text:`${m.icon}${m.name}이 ${dmg} 데미지!`});
        if(me.hp<=0)doRespawn();
        renderCurTab();monsterAttackLock=true;setTimeout(()=>monsterAttackLock=false,m.boss?700:1000);
      }
    }
  }
}

function doRespawn(){addLine({cls:'bt',text:'💀 쓰러졌습니다! 여관으로 이송됩니다...'});me.hp=Math.round(myMaxHp()*0.5);saveProfile();setTimeout(()=>window.location.href='chatroom.html?respawn=1',2000);}

// ── 전투 ──────────────────────────────────────────
function attackMon(id){const m=monsters[id];if(!m||!m.alive)return;if(dist(m,myPos)>150){myTarget={x:m.x,y:m.y};setTimeout(()=>doHit(id),1000);}else doHit(id);}
function doHit(id){
  const m=monsters[id];if(!m||!m.alive||actionLock)return;
  actionLock=true;setTimeout(()=>actionLock=false,500);
  const ar=myAtk(),dmg=rnd(ar[0],ar[1]);m.hp=Math.max(0,m.hp-dmg);
  const mel=document.getElementById('mn-'+id);if(mel){mel.classList.add('hit');setTimeout(()=>mel.classList.remove('hit'),300);}
  const s=w2s(m.x,m.y);floatTxt('-'+dmg,s.x,s.y-30,'e');
  addLine({cls:'bt',text:`⚔️ ${m.name}에게 ${dmg} 데미지!`});
  if(m.hp<=0){killMon(id,m);return;}
  setTimeout(()=>{if(!m.alive)return;const def=myDef(),dmg2=Math.max(1,rnd(m.atk[0],m.atk[1])-def);me.hp=Math.max(0,me.hp-dmg2);const ps=w2s(myPos.x,myPos.y);floatTxt('-'+dmg2,ps.x,ps.y-20,'p');if(me.hp<=0)doRespawn();renderCurTab();saveProfile();},350);
  renderCurTab();
}

async function killMon(id,m){
  m.alive=false;remMon(id);
  me.exp=(me.exp||0)+m.exp;me.gold=(me.gold||0)+m.gold;me.kills=(me.kills||0)+1;
  const s=w2s(m.x,m.y);floatTxt('+'+m.exp+'xp',s.x-10,s.y-20,'x');floatTxt('+'+m.gold+'G',s.x+10,s.y-36,'g');
  addLine({cls:'lt',text:`🎉 ${m.icon}${m.name} 처치! +${m.exp}XP +${m.gold}G`});
  if(m.boss)addLine({cls:'lv',text:`👑 보스 ${m.name} 처치! 특별 보상!`});
  checkLvUp();
  // 드랍
  const lootTable=getLootTable();
  if(Math.random()<m.lootChance){
    const item=rollLoot(lootTable);
    if(item){const did='d'+Date.now();drops[did]={item,x:m.x+rnd(-25,25),y:m.y+rnd(-25,25)};addLine({cls:'lt',text:`💎 ${ITEMS[item]?.icon||''}${item} 드랍!`});}
  }
  if(m.boss){// 보스 추가 드랍
    const ex=rollLoot(lootTable);if(ex){const did='d'+Date.now()+'b';drops[did]={item:ex,x:m.x+rnd(-40,40),y:m.y+rnd(-40,40)};addLine({cls:'lt',text:`✨ 보너스 드랍: ${ITEMS[ex]?.icon||''}${ex}!`});}
  }
  // 보스는 리스폰 없음, 일반 몬스터는 10초 후 리스폰
  if(!m.boss){setTimeout(()=>{if(!monsters[id])return;const defs=getMonDefs();const def=defs[rnd(0,defs.length-1)];const sp=safeSpawn(m.x,m.y,100);monsters[id]={...def,id,alive:true,hp:def.hp,maxHp:def.hp,x:sp.x,y:sp.y};},10000);}
  renderCurTab();saveProfile();
  await db.from('chats').insert({scope:'dungeon',username:me.username,text:`${m.icon}${m.name} 처치! +${m.gold}G`,is_sys:true}).catch(()=>{});
}

function getLootTable(){
  if(currentZone===ZONE.WORLD)return LOOT_FOREST;
  if(currentZone===ZONE.D1)return LOOT_D1;
  if(currentZone===ZONE.D2)return LOOT_D2;
  return LOOT_D3;
}
function getMonDefs(){
  if(currentZone===ZONE.WORLD)return MON_FOREST;
  if(currentZone===ZONE.D1)return MON_D1;
  if(currentZone===ZONE.D2)return MON_D2;
  return[];
}
function rollLoot(table){let r=Math.random(),acc=0;for(const[n,c]of table){acc+=c;if(r<acc)return n;}return null;}

function checkLvUp(){
  const need=me.level*100;
  if((me.exp||0)>=need){
    me.level++;me.exp=(me.exp||0)-need;me.maxHp=myMaxHp();me.hp=me.maxHp;
    addLine({cls:'lv',text:`⭐ 레벨 업! Lv.${me.level} — HP+10 공격+1.5 방어+0.8`});
    const s=w2s(myPos.x,myPos.y);floatTxt('LEVEL UP!',s.x,s.y-55,'x');
    showBubble(me.id,`⭐ Lv.${me.level}!`);saveProfile();
  }
}

// ── 아이템 ────────────────────────────────────────
function tryPickup(id,drop){if(dist({x:drop.x,y:drop.y},myPos)>100){myTarget={x:drop.x,y:drop.y};setTimeout(()=>doPickup(id,drop),1200);}else doPickup(id,drop);}
function doPickup(id,drop){
  if(!drops[id])return;
  const inv=me.inventory||[];
  if(inv.length>=20){addLine({cls:'sy',text:'인벤토리가 가득 찼습니다! (최대 20칸)'});return;}
  inv.push({name:drop.item,id:Date.now()});me.inventory=inv;delete drops[id];remDrop(id);
  addLine({cls:'lt',text:`📦 ${ITEMS[drop.item]?.icon||''}${drop.item} 획득!`});
  if(activeTab==='iv')renderIv();saveProfile();
}

// ── 스폰 ──────────────────────────────────────────
function spawnMonsters(){
  if(currentZone===ZONE.WORLD){
    // 숲 구역 (맵 오른쪽)
    const forestPositions=[];
    for(let x=1300;x<2100;x+=200)for(let y=200;y<1200;y+=200)forestPositions.push([x,y]);
    forestPositions.forEach((pos,i)=>{
      const def=MON_FOREST[i%MON_FOREST.length];const sp=safeSpawn(pos[0],pos[1],80);
      monsters['f'+i]={...def,id:'f'+i,alive:true,hp:def.hp,maxHp:def.hp,x:sp.x,y:sp.y};
    });
    // 숲 보스 (고정 위치)
    [[1600,400],[1800,800],[2000,600]].forEach((pos,i)=>{
      const def=MON_FOREST_BOSS[i];const sp=safeSpawn(pos[0],pos[1],50);
      monsters['fb'+i]={...def,id:'fb'+i,alive:true,hp:def.hp,maxHp:def.hp,x:sp.x,y:sp.y};
    });
  } else if(currentZone===ZONE.D1){
    const pos=[[400,300],[700,300],[1100,300],[1500,300],[400,700],[700,700],[1100,700],[1500,700],[400,1100],[700,1100],[1100,1100],[1500,1100]];
    pos.forEach((p,i)=>{const def=MON_D1[i%MON_D1.length];const sp=safeSpawn(p[0],p[1],60);monsters['m'+i]={...def,id:'m'+i,alive:true,hp:def.hp,maxHp:def.hp,x:sp.x,y:sp.y};});
  } else if(currentZone===ZONE.D2){
    const pos=[[400,300],[700,300],[1100,300],[1500,300],[400,700],[700,700],[1100,700],[1500,700],[400,1100],[700,1100]];
    pos.forEach((p,i)=>{const def=MON_D2[i%MON_D2.length];const sp=safeSpawn(p[0],p[1],60);monsters['m'+i]={...def,id:'m'+i,alive:true,hp:def.hp,maxHp:def.hp,x:sp.x,y:sp.y};});
  } else if(currentZone===ZONE.D3){
    // 3층: 보스 3마리만
    [[600,700],[1200,700],[1800,700]].forEach((pos,i)=>{
      const def=MON_D3_BOSS[i];const sp=safeSpawn(pos[0],pos[1],60);
      monsters['boss'+i]={...def,id:'boss'+i,alive:true,hp:def.hp,maxHp:def.hp,x:sp.x,y:sp.y};
    });
  }
}

// ── 마을 NPC 클릭 ─────────────────────────────────
cv.addEventListener('click',e=>{
  if(!me)return;
  const rect=cv.getBoundingClientRect();
  const cx=e.clientX-rect.left,cy=e.clientY-rect.top;
  const wx=cx+cam.x,wy=cy+cam.y;
  // 마을 상인 (상점 탭 열기)
  if(currentZone===ZONE.WORLD&&dist({x:wx,y:wy},{x:360,y:360})<60){
    swTab('sh');addLine({cls:'sy',text:'🛒 상인: 무엇을 찾으시나요?'});return;
  }
  // 마을 대장장이 (강화 탭 열기)
  if(currentZone===ZONE.WORLD&&dist({x:wx,y:wy},{x:560,y:360})<60){
    swTab('fg');addLine({cls:'sy',text:'🔨 대장장이: 뭘 강화해드릴까요?'});return;
  }
  if(walkable(wx,wy))myTarget={x:wx,y:wy};
});

// ── 탭 ────────────────────────────────────────────
function swTab(name){
  activeTab=name;
  document.querySelectorAll('.tb').forEach(t=>t.classList.remove('ac'));
  const tb=document.getElementById('tab-'+name);if(tb)tb.classList.add('ac');
  renderCurTab();
}
function renderCurTab(){if(activeTab==='st')renderSt();else if(activeTab==='eq')renderEq();else if(activeTab==='iv')renderIv();else if(activeTab==='sh')renderSh();else if(activeTab==='fg')renderFg();else if(activeTab==='cf')renderCf();}

function renderSt(){
  const mh=myMaxHp();me.maxHp=mh;
  const p=clamp((me.hp/mh)*100,0,100);const hc=p>50?'#4a9e6a':p>25?'#c8874a':'#c84a4a';
  const en=me.level*100,ep=clamp(((me.exp||0)/en)*100,0,100);
  const ar=myAtk(),def=myDef();const cl=CLS_DATA[me.cls]||CLS_DATA['전사'];
  const zoneLabel={[ZONE.WORLD]:'🏘️ 마을',[ZONE.D1]:'🏰 1층',[ZONE.D2]:'👿 2층',[ZONE.D3]:'💀 3층 보스'}[currentZone]||'';
  document.getElementById('pc').innerHTML=`
    <div class="sh"><div class="si">${cl.icon}</div><div><div class="sn">${me.username}</div><div class="sc">${me.cls} · ${zoneLabel}</div></div><div class="sl">Lv.${me.level}</div></div>
    <div style="font-size:11px;color:var(--text-dim);margin-bottom:3px">HP ${me.hp} / ${mh}</div>
    <div class="ht"><div class="hf2" style="width:${p}%;background:${hc}"></div></div>
    <div style="font-size:10px;color:var(--text-mute);margin-top:4px;margin-bottom:2px">경험치 ${me.exp||0} / ${en}</div>
    <div class="et"><div class="ef" style="width:${ep}%"></div></div>
    <div class="sn2">
      <div class="sn3">공격력<b>${ar[0]}~${ar[1]}</b></div>
      <div class="sn3">방어력<b>${def}</b></div>
      <div class="sn3">💰 골드<b>${me.gold||0}G</b></div>
      <div class="sn3">💀 킬<b>${me.kills||0}</b></div>
    </div>
    <div style="margin-top:12px;font-size:11px;color:var(--text-mute);line-height:2">
      무기: <span style="color:var(--gold)">${me.equipped?.weapon||'없음'}</span><br>
      갑옷: <span style="color:var(--gold)">${me.equipped?.armor||'없음'}</span>
    </div>`;
}

function renderEq(){
  const eq=me.equipped||{};const slots=[['weapon','⚔️ 무기'],['armor','🛡️ 갑옷']];
  let h='<div class="eg">';
  slots.forEach(([s,lbl])=>{
    const nm=eq[s];
    const baseName=nm?nm.replace(/ \+\d+$/,''):null;
    const it=baseName?ITEMS[baseName]:null;
    if(nm&&baseName&&it){
      const bonus=forgeBonus(nm);
      const st=it.atk?`공격 +${it.atk+bonus}`:it.def?`방어 +${it.def+bonus}`:'';
      h+=`<div class="es hi" onclick="unequip('${s}')" onmouseenter="showTip(event,'${nm}')" onmouseleave="hideTip()">
        <div class="esl">${lbl}</div><div class="esi">${it.icon}</div>
        <div class="esn">${nm}</div><div class="ess">${st}</div></div>`;
    } else if(nm&&!it){
      // ITEMS에 없는 경우 (구버전 데이터) - 그냥 이름만 표시
      h+=`<div class="es hi" onclick="unequip('${s}')">
        <div class="esl">${lbl}</div><div class="esi">📦</div>
        <div class="esn">${nm}</div></div>`;
    } else {
      h+=`<div class="es"><div class="esl">${lbl}</div><div style="font-size:22px;opacity:.3">○</div><div style="font-size:10px;color:var(--text-mute)">비어있음</div></div>`;
    }
  });
  h+='</div><div style="font-size:11px;color:var(--text-mute)">클릭 → 장착 해제</div>';
  document.getElementById('pc').innerHTML=h;
}

function renderIv(){
  const inv=me.inventory||[];
  let h=`<div style="font-size:11px;color:var(--text-dim);margin-bottom:8px">${inv.length}/20칸 · <span style="font-size:10px;color:var(--text-mute)">우클릭→단축키 등록</span></div><div class="ig">`;
  for(let i=0;i<20;i++){
    const item=inv[i];
    if(item){
      const bn=item.name.replace(/ \+\d+$/,''),def=ITEMS[bn]||{icon:'📦',rarity:'common'};
      const rc=def.rarity==='epic'?'repic':def.rarity==='rare'?'rrare':def.rarity==='uncommon'?'runcommon':'rcommon';
      h+=`<div class="ic ${rc}" onclick="useItem(${i})" oncontextmenu="showHotbarMenu(event,${i})" onmouseenter="showTip(event,'${item.name}')" onmouseleave="hideTip()"><div class="ii">${def.icon}</div><div class="in">${item.name}</div></div>`;
    } else h+=`<div class="ic em2"></div>`;
  }
  h+='</div><div style="font-size:10px;color:var(--text-mute);margin-top:8px">무기/갑옷: 장착 · 물약: 사용</div>';
  document.getElementById('pc').innerHTML=h;
}

// 단축키 등록 메뉴 (우클릭)
function showHotbarMenu(e,invIdx){
  e.preventDefault();
  const inv=me.inventory||[];const item=inv[invIdx];if(!item)return;
  const def=ITEMS[item.name.replace(/ \+\d+$/,'')];
  if(def?.type!=='potion'){addLine({cls:'sy',text:'물약만 단축키에 등록 가능합니다.'});return;}
  // 간단 선택: 1줄Q/W/E/R, 2줄Q/W/E/R
  const choices=['1줄-Q','1줄-W','1줄-E','1줄-R','2줄-Q','2줄-W','2줄-E','2줄-R'];
  const chosen=choices[Math.floor(Math.random()*4)]; // 자동으로 1줄에 순서대로
  // 빈 슬롯 찾기
  for(let row=0;row<2;row++)for(let slot=0;slot<4;slot++){
    if(!hotbar[row][slot]){setHotbar(item.name,row,slot);addLine({cls:'sy',text:`[${row+1}줄-${'QWER'[slot]}] ${item.name} 등록`});return;}
  }
  addLine({cls:'sy',text:'단축키 슬롯이 가득 찼습니다!'});
}

function renderSh(){
  const gold=me.gold||0;
  const SHOP=[
    {name:'강철 검',price:120,sell:40},{name:'마법 지팡이',price:280,sell:90},
    {name:'용사의 활',price:200,sell:65},{name:'불꽃 검',price:500,sell:160},
    {name:'미스릴 검',price:1200,sell:400},{name:'가죽 갑옷',price:80,sell:25},
    {name:'철 갑옷',price:200,sell:65},{name:'마법 로브',price:160,sell:52},
    {name:'용의 비늘 갑옷',price:600,sell:195},{name:'미스릴 갑옷',price:1500,sell:500},
    {name:'작은 물약',price:30,sell:8},{name:'큰 물약',price:80,sell:22},{name:'엘릭서',price:300,sell:95},
  ];
  let h=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--border)"><span style="font-size:12px;font-weight:500">🛒 상점</span><span style="color:var(--gold);font-size:12px">💰 ${gold}G</span></div>
  <div style="display:flex;gap:4px;margin-bottom:8px"><button style="flex:1;padding:5px;background:${shopMode==='buy'?'rgba(200,135,74,0.15)':'transparent'};border:1px solid ${shopMode==='buy'?'var(--amber-dim)':'var(--border)'};border-radius:4px;color:${shopMode==='buy'?'var(--amber)':'var(--text-mute)'};font-size:10px;cursor:pointer;font-family:inherit" onclick="shopMode='buy';renderSh()">구매</button><button style="flex:1;padding:5px;background:${shopMode==='sell'?'rgba(74,158,106,0.15)':'transparent'};border:1px solid ${shopMode==='sell'?'#4a7e4a':'var(--border)'};border-radius:4px;color:${shopMode==='sell'?'#4a9e6a':'var(--text-mute)'};font-size:10px;cursor:pointer;font-family:inherit" onclick="shopMode='sell';renderSh()">판매</button></div>`;
  if(shopMode==='buy'){
    SHOP.forEach((s,i)=>{const it=ITEMS[s.name];if(!it)return;const st=it.atk?`⚔️+${it.atk}`:it.def?`🛡️+${it.def}`:it.hp?`💊+${it.hp>=9999?'전체':it.hp}`:'';const ok=gold>=s.price;
      h+=`<div style="display:flex;align-items:center;gap:8px;padding:7px 8px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:6px;margin-bottom:5px"><div style="font-size:18px">${it.icon}</div><div style="flex:1;min-width:0"><div style="font-size:11px;font-weight:500;color:var(--text)">${s.name}</div><div style="font-size:10px;color:var(--green)">${st}</div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px"><div style="font-size:11px;color:var(--amber)">💰${s.price}G</div><button style="padding:3px 8px;background:rgba(200,135,74,0.2);border:1px solid var(--amber-dim);border-radius:4px;color:var(--amber);font-size:10px;cursor:pointer;font-family:inherit" onclick="buyItem(${i})" ${ok?'':'disabled'}>구매</button></div></div>`;
    });
  } else {
    const inv=me.inventory||[];if(!inv.length)h+=`<div style="text-align:center;padding:2rem;color:var(--text-mute)">판매할 아이템 없음</div>`;
    inv.forEach((item,idx)=>{const bn=item.name.replace(/ \+\d+$/,'');const it=ITEMS[bn]||{icon:'📦'};const sp=Math.max(5,Math.floor((it.atk||0)*3+(it.def||0)*5+(it.hp||0)*0.3));const st=it.atk?`⚔️+${it.atk}`:it.def?`🛡️+${it.def}`:it.hp?`💊+${it.hp>=9999?'전체':it.hp}`:'';
      h+=`<div style="display:flex;align-items:center;gap:7px;padding:7px 8px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:5px;margin-bottom:5px"><div style="font-size:17px">${it.icon}</div><div style="flex:1;min-width:0"><div style="font-size:11px;font-weight:500">${item.name}</div><div style="font-size:10px;color:var(--green)">${st}</div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px"><div style="font-size:11px;color:var(--amber)">+${sp}G</div><button style="padding:3px 8px;background:rgba(74,158,106,0.2);border:1px solid #4a7e4a;border-radius:4px;color:#4a9e6a;font-size:10px;cursor:pointer;font-family:inherit" onclick="sellItem(${idx})">판매</button></div></div>`;
    });
  }
  document.getElementById('pc').innerHTML=h;
}

let shopMode='buy';
const SHOP_LIST=[{name:'강철 검',price:120,sell:40},{name:'마법 지팡이',price:280,sell:90},{name:'용사의 활',price:200,sell:65},{name:'불꽃 검',price:500,sell:160},{name:'미스릴 검',price:1200,sell:400},{name:'가죽 갑옷',price:80,sell:25},{name:'철 갑옷',price:200,sell:65},{name:'마법 로브',price:160,sell:52},{name:'용의 비늘 갑옷',price:600,sell:195},{name:'미스릴 갑옷',price:1500,sell:500},{name:'작은 물약',price:30,sell:8},{name:'큰 물약',price:80,sell:22},{name:'엘릭서',price:300,sell:95}];
function buyItem(i){const s=SHOP_LIST[i];if(!s)return;const inv=me.inventory||[];if(inv.length>=20){addLine({cls:'sy',text:'인벤토리가 가득 찼습니다!'});return;}if((me.gold||0)<s.price){addLine({cls:'sy',text:'💰 금화가 부족합니다!'});return;}me.gold-=s.price;inv.push({name:s.name,id:Date.now()});me.inventory=inv;saveProfile();renderSh();addLine({cls:'lt',text:`🛒 ${ITEMS[s.name]?.icon||''}${s.name} 구매! (-${s.price}G)`});}
function sellItem(idx){const inv=me.inventory||[];const item=inv[idx];if(!item)return;const bn=item.name.replace(/ \+\d+$/,'');const it=ITEMS[bn]||{};const sp=Math.max(5,Math.floor((it.atk||0)*3+(it.def||0)*5+(it.hp||0)*0.3));me.gold=(me.gold||0)+sp;inv.splice(idx,1);me.inventory=inv;saveProfile();renderSh();addLine({cls:'lt',text:`💰 ${item.name} 판매! (+${sp}G)`});}

// ── 강화 ──────────────────────────────────────────
const FORGE_DATA=[{cost:50,rate:90,stat:3},{cost:100,rate:80,stat:3},{cost:180,rate:70,stat:4},{cost:300,rate:55,stat:4},{cost:500,rate:40,stat:5},{cost:800,rate:30,stat:5},{cost:1200,rate:20,stat:6},{cost:2000,rate:15,stat:6},{cost:3000,rate:10,stat:7},{cost:5000,rate:7,stat:8}];
const MAX_FORGE=10;
function parseItem(n){const m=n.match(/^(.+?) \+(\d+)$/);return m?{base:m[1],lv:parseInt(m[2])}:{base:n,lv:0};}
function mkItem(base,lv){return lv>0?`${base} +${lv}`:base;}
function plusColor(lv){if(lv>=10)return'#ff80ff';if(lv>=5)return'#e04040';if(lv>=3)return'#e0c040';if(lv>=2)return'#80e080';if(lv>=1)return'#a0c8e0';return'';}

function renderFg(){
  const gold=me.gold||0;const forgeables=[];
  (me.inventory||[]).forEach((item,idx)=>{const{base,lv}=parseItem(item.name);const it=ITEMS[base];if(it&&(it.type==='weapon'||it.type==='armor')&&lv<MAX_FORGE)forgeables.push({name:item.name,idx,base,lv,loc:'inv'});});
  const eq=me.equipped||{};Object.entries(eq).forEach(([slot,nm])=>{const{base,lv}=parseItem(nm);const it=ITEMS[base];if(it&&lv<MAX_FORGE)forgeables.push({name:nm,idx:slot,base,lv,loc:'equip',slot});});
  let h=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--border)"><span style="font-size:12px;font-weight:500">🔨 대장장이</span><span style="color:var(--gold);font-size:12px">💰 ${gold}G</span></div>`;
  if(!forgeables.length){h+=`<div style="text-align:center;padding:2rem;color:var(--text-mute);font-size:12px">강화 가능한 무기/방어구 없음</div>`;}
  else forgeables.forEach((entry,i)=>{
    const it=ITEMS[entry.base]||{};const fd=FORGE_DATA[entry.lv]||FORGE_DATA[FORGE_DATA.length-1];const ok=(me.gold||0)>=fd.cost;const pc=plusColor(entry.lv+1);
    h+=`<div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><div style="font-size:22px">${it.icon||'📦'}</div><div style="flex:1"><div style="font-size:12px;font-weight:500">${entry.base} ${entry.lv>0?`<span style="color:${plusColor(entry.lv)}">+${entry.lv}</span>`:''} → <span style="color:${pc}">+${entry.lv+1}</span></div><div style="font-size:10px;color:var(--text-mute)">${entry.loc==='equip'?'[장착중]':''}</div></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-bottom:8px;font-size:10px">
        <div style="background:rgba(0,0,0,0.2);border-radius:4px;padding:4px;text-align:center"><div style="color:var(--text-mute)">비용</div><div style="color:var(--amber);font-weight:500">${fd.cost}G</div></div>
        <div style="background:rgba(0,0,0,0.2);border-radius:4px;padding:4px;text-align:center"><div style="color:var(--text-mute)">성공률</div><div style="color:${fd.rate>=70?'#4a9e6a':fd.rate>=40?'#c8874a':'#c84a4a'};font-weight:500">${fd.rate}%</div></div>
        <div style="background:rgba(0,0,0,0.2);border-radius:4px;padding:4px;text-align:center"><div style="color:var(--text-mute)">스탯</div><div style="color:var(--green);font-weight:500">+${fd.stat}</div></div>
      </div>
      <button style="width:100%;padding:7px;background:${ok?'rgba(200,135,74,0.2)':'rgba(60,60,60,0.2)'};border:1px solid ${ok?'var(--amber-dim)':'var(--border)'};border-radius:5px;color:${ok?'var(--amber)':'var(--text-mute)'};font-size:12px;cursor:${ok?'pointer':'not-allowed'};font-family:inherit" onclick="forgeItem(${i})" ${ok?'':'disabled'}>🔨 강화 +${entry.lv} → +${entry.lv+1}</button></div>`;
  });
  document.getElementById('pc').innerHTML=h;
}

function forgeItem(idx){
  const forgeables=[];
  (me.inventory||[]).forEach((item,i)=>{const{base,lv}=parseItem(item.name);const it=ITEMS[base];if(it&&(it.type==='weapon'||it.type==='armor')&&lv<MAX_FORGE)forgeables.push({name:item.name,i,base,lv,loc:'inv'});});
  const eq=me.equipped||{};Object.entries(eq).forEach(([slot,nm])=>{const{base,lv}=parseItem(nm);const it=ITEMS[base];if(it&&lv<MAX_FORGE)forgeables.push({name:nm,i:slot,base,lv,loc:'equip',slot});});
  const entry=forgeables[idx];if(!entry)return;
  const fd=FORGE_DATA[entry.lv];if(!fd)return;
  if((me.gold||0)<fd.cost){addLine({cls:'sy',text:'💰 금화 부족!'});return;}
  me.gold-=fd.cost;
  const success=Math.random()*100<fd.rate;
  if(success){
    const newName=mkItem(entry.base,entry.lv+1);
    if(entry.loc==='inv'){const inv=me.inventory||[];const it=inv.find(x=>x.name===entry.name);if(it)it.name=newName;me.inventory=inv;}
    else{const eq2=me.equipped||{};eq2[entry.slot]=newName;me.equipped=eq2;}
    addLine({cls:'lv',text:`✨ 강화 성공! ${entry.name} → ${newName} (-${fd.cost}G)`});
  } else {
    const newLv=Math.max(0,entry.lv-1);const newName=mkItem(entry.base,newLv);
    if(entry.loc==='inv'){const inv=me.inventory||[];const it=inv.find(x=>x.name===entry.name);if(it)it.name=newName;me.inventory=inv;}
    else{const eq2=me.equipped||{};eq2[entry.slot]=newName;me.equipped=eq2;}
    addLine({cls:'bt',text:`💔 강화 실패... ${entry.name} → ${newName} (-${fd.cost}G)`});
  }
  saveProfile();renderFg();if(activeTab==='eq')renderEq();if(activeTab==='iv')renderIv();
}

// ── 제작 ──────────────────────────────────────────
function renderCf(){
  let h=`<div style="font-size:12px;font-weight:500;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border)">⚒️ 아이템 제작</div>`;
  RECIPES.forEach((r,i)=>{
    const it=ITEMS[r.result]||{};const inv=me.inventory||[];
    const matOk=Object.entries(r.materials).every(([mat,cnt])=>inv.filter(x=>x.name===mat).length>=cnt);
    const goldOk=(me.gold||0)>=r.gold;const ok=matOk&&goldOk;
    const matStr=Object.entries(r.materials).map(([mat,cnt])=>{const have=inv.filter(x=>x.name===mat).length;return`${ITEMS[mat]?.icon||''}${mat} ${have}/${cnt}`;}).join(', ');
    h+=`<div style="background:rgba(255,255,255,0.03);border:1px solid ${ok?'var(--amber-dim)':'var(--border)'};border-radius:8px;padding:10px;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><div style="font-size:24px">${it.icon||'📦'}</div><div><div style="font-size:12px;font-weight:500;color:var(--gold)">${r.result}</div><div style="font-size:10px;color:var(--green)">${it.atk?`⚔️ 공격력 +${it.atk}`:it.def?`🛡️ 방어력 +${it.def}`:''}</div></div></div>
      <div style="font-size:10px;color:${matOk?'var(--text-dim)':'#c84a4a'};margin-bottom:4px">재료: ${matStr}</div>
      <div style="font-size:10px;color:${goldOk?'var(--amber)':'#c84a4a'};margin-bottom:8px">금화: ${me.gold||0}/${r.gold}G</div>
      <button style="width:100%;padding:7px;background:${ok?'rgba(200,168,74,0.2)':'rgba(60,60,60,0.2)'};border:1px solid ${ok?'var(--gold-dim)':'var(--border)'};border-radius:5px;color:${ok?'var(--gold)':'var(--text-mute)'};font-size:12px;cursor:${ok?'pointer':'not-allowed'};font-family:inherit" onclick="craftItem(${i})" ${ok?'':'disabled'}>⚒️ 제작</button></div>`;
  });
  document.getElementById('pc').innerHTML=h;
}

function craftItem(idx){
  const r=RECIPES[idx];if(!r)return;
  const inv=me.inventory||[];
  const matOk=Object.entries(r.materials).every(([mat,cnt])=>inv.filter(x=>x.name===mat).length>=cnt);
  if(!matOk){addLine({cls:'sy',text:'재료가 부족합니다!'});return;}
  if((me.gold||0)<r.gold){addLine({cls:'sy',text:'💰 금화가 부족합니다!'});return;}
  // 재료 제거
  Object.entries(r.materials).forEach(([mat,cnt])=>{let removed=0;for(let i=inv.length-1;i>=0&&removed<cnt;i--){if(inv[i].name===mat){inv.splice(i,1);removed++;}}});
  me.gold-=r.gold;
  if(inv.length>=20){addLine({cls:'sy',text:'인벤토리가 가득 찼습니다!'});return;}
  inv.push({name:r.result,id:Date.now()});me.inventory=inv;
  saveProfile();renderCf();renderIv();
  addLine({cls:'lv',text:`⚒️ ${ITEMS[r.result]?.icon||''}${r.result} 제작 성공! (-${r.gold}G)`});
}

// ── useItem/unequip ────────────────────────────────
function useItem(idx){const inv=me.inventory||[];const item=inv[idx];if(!item)return;const def=ITEMS[item.name.replace(/ \+\d+$/,'')];if(!def)return;if(def.type==='potion'){const h2=Math.min(def.hp||0,myMaxHp()-me.hp);me.hp=Math.min(myMaxHp(),me.hp+(def.hp||0));inv.splice(idx,1);me.inventory=inv;addLine({cls:'hl',text:`🧪 ${item.name} 사용! HP +${h2}`});const s=w2s(myPos.x,myPos.y);floatTxt('+'+h2,s.x,s.y-20,'h');renderCurTab();saveProfile();}else if(def.slot){const eq=me.equipped||{};if(eq[def.slot])inv.push({name:eq[def.slot],id:Date.now()});eq[def.slot]=item.name;inv.splice(idx,1);me.equipped=eq;me.inventory=inv;addLine({cls:'lt',text:`🗡️ ${item.name} 장착!`});renderCurTab();saveProfile();}}
function unequip(slot){const eq=me.equipped||{};const nm=eq[slot];if(!nm)return;const inv=me.inventory||[];if(inv.length>=20){addLine({cls:'sy',text:'인벤토리가 가득 찼습니다!'});return;}inv.push({name:nm,id:Date.now()});delete eq[slot];me.equipped=eq;me.inventory=inv;addLine({cls:'sy',text:`${nm} 장착 해제`});renderCurTab();saveProfile();}

// ── 툴팁 ──────────────────────────────────────────
function showTip(e,name){const bn=name.replace(/ \+\d+$/,'');const lv=name.match(/\+(\d+)$/)?parseInt(name.match(/\+(\d+)$/)[1]):0;const it=ITEMS[bn];if(!it)return;const tt=document.getElementById('tt');document.getElementById('tn').textContent=it.icon+' '+name;document.getElementById('ty').textContent=it.type==='weapon'?'무기':it.type==='armor'?'갑옷':it.type==='material'?'재료':'물약';const b=forgeBonus(name);const st=it.atk?`⚔️ 공격력 +${it.atk+b}${lv>0?` (기본${it.atk}+강화${b})`:''}`:it.def?`🛡️ 방어력 +${it.def+b}${lv>0?` (기본${it.def}+강화${b})`:''}`:it.hp?`💊 HP +${it.hp>=9999?'전체':it.hp}`:'';document.getElementById('ts').textContent=st;document.getElementById('td').textContent=it.desc+(lv>0?` (강화 +${lv})`:'');tt.style.display='block';const tw=200,x=e.clientX+12;tt.style.left=(x+tw>window.innerWidth?e.clientX-tw-8:x)+'px';tt.style.top=(e.clientY-10)+'px';}
function hideTip(){document.getElementById('tt').style.display='none';}

// ── 네트워크 ──────────────────────────────────────
async function saveProfile(){if(!me)return;try{await db.from('profiles').update({hp:me.hp,gold:me.gold||0,level:me.level,kills:me.kills||0,exp:me.exp||0,inventory:me.inventory||[],equipped:me.equipped||{},defense:myDef()}).eq('id',me.id);}catch(e){console.error('save:',e);}}
async function pollPlayers(){await db.from('presence').upsert({id:me.id,username:me.username,cls:me.cls,x:Math.round(myPos.x),y:Math.round(myPos.y),ts:Date.now()},{onConflict:'id'});const{data}=await db.from('presence').select('*').gt('ts',Date.now()-12000);if(!data)return;const on={};data.forEach(p=>{if(p.id!==me.id)on[p.id]=p;});for(const id of Object.keys(players)){if(!on[id]){remChar(id);delete players[id];}}for(const[id,p]of Object.entries(on))players[id]={...(players[id]||{}),...p};}
function addLine(m){const log=document.getElementById('cl');const d=document.createElement('div');d.className='cl '+(m.cls||'sy');if(m.cn)d.innerHTML=`<span class="cn3" style="color:${ncol(m.cn)}">${m.cn}</span> ${m.text}`;else d.textContent=m.text;log.appendChild(d);log.scrollTop=log.scrollHeight;}
async function sendChat(){const inp=document.getElementById('ci');const t=inp.value.trim();if(!t)return;inp.value='';showBubble(me.id,t);await db.from('chats').insert({scope:'dungeon',username:me.username,text:t,is_sys:false}).catch(()=>{});}
async function pollChat(){const{data:msgs}=await db.from('chats').select('*').eq('scope','dungeon').gt('created_at',new Date(Date.now()-180000).toISOString()).order('created_at',{ascending:true}).limit(60).catch(()=>({data:null}));if(!msgs)return;const nw=msgs.filter(m=>new Date(m.created_at).getTime()>lastChatTs);if(!nw.length)return;lastChatTs=new Date(msgs[msgs.length-1].created_at).getTime();nw.forEach(m=>{if(m.is_sys)addLine({cls:'lt',text:m.text});else{addLine({cls:'',cn:m.username,text:m.text});if(m.username!==me.username){const p=Object.values(players).find(x=>x.username===m.username);if(p)showBubble(p.id,m.text);}}});}

// ── 로그인/입장 ───────────────────────────────────
async function doLogin(){const u=document.getElementById('l-id').value.trim().toLowerCase();const pw=document.getElementById('l-pw').value;document.getElementById('l-err').textContent='';if(!u||!pw){document.getElementById('l-err').textContent='아이디와 비밀번호를 입력해주세요';return;}const email=u.includes('@')?u:`${u}@dungeon.game`;const{data,error}=await db.auth.signInWithPassword({email,password:pw});if(error){document.getElementById('l-err').textContent='아이디 또는 비밀번호가 올바르지 않습니다';return;}await enterGame(data.user.id,u);}

async function enterGame(uid,username){
  const{data:p}=await db.from('profiles').select('*').eq('id',uid).single();
  if(p){me={...p,inventory:p.inventory||[],equipped:p.equipped||{},level:p.level||1,exp:p.exp||0,gold:p.gold||0,kills:p.kills||0};me.maxHp=myMaxHp();me.hp=Math.min(me.hp,me.maxHp);}
  else{me={id:uid,username,cls:'전사',hp:120,maxHp:120,gold:0,level:1,kills:0,exp:0,inventory:[],equipped:{}};await db.from('profiles').insert({id:uid,username,cls:'전사',hp:120,maxHp:120,level:1,exp:0,gold:0,kills:0}).catch(()=>{});}
  myPos=safeSpawn(280,600,80);
  document.getElementById('screen-login').style.display='none';
  document.getElementById('screen-game').style.display='flex';
  resize();spawnMonsters();renderSt();loop();
  setInterval(pollPlayers,2000);setInterval(pollChat,1500);setInterval(saveProfile,8000);pollChat();
  addLine({cls:'sy',text:`⚔️ 마을 입장! Lv.${me.level} | 💰${me.gold}G | 📦${me.inventory.length}개`});
  addLine({cls:'sy',text:`🏘️ 마을(상점/대장간) → 숲(재료) → 던전(오른쪽 끝)`});
}

async function doLogout(){await db.from('presence').delete().eq('id',me?.id).catch(()=>{});await db.auth.signOut();document.getElementById('screen-game').style.display='none';document.getElementById('screen-login').style.display='flex';}
window.addEventListener('beforeunload',async()=>{try{await db.from('presence').delete().eq('id',me?.id);}catch(e){}});

(async()=>{const{data:{session}}=await db.auth.getSession();if(session){await enterGame(session.user.id,session.user.email.split('@')[0]);return;}document.getElementById('screen-login').style.display='flex';})();
