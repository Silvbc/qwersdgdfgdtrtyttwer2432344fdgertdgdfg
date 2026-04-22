// ══════════════════════════════════════════════════
//  game.js — 던전 어드벤처 (2층 던전, 레벨 유지)
// ══════════════════════════════════════════════════
const {createClient}=supabase;
const db=createClient(SUPABASE_URL,SUPABASE_ANON);

// ── 직업 데이터 ────────────────────────────────────
const CLS_DATA={
  전사:  {icon:'🛡️',maxHp:120,atk:[12,20],bg:'rgba(74,126,200,0.3)', b:'#4a7ec8'},
  마법사:{icon:'🔮',maxHp:80, atk:[22,38],bg:'rgba(138,74,200,0.3)',b:'#8a4ac8'},
  궁수:  {icon:'🏹',maxHp:90, atk:[16,28],bg:'rgba(74,158,106,0.3)',b:'#4a9e6a'},
  힐러:  {icon:'✨',maxHp:100,atk:[8,14], bg:'rgba(200,168,74,0.3)',b:'#c8a84a'},
};

// ── 몬스터 (1층/2층 구분) ─────────────────────────
const MONSTERS_F1=[  // 1층: 약한 몬스터
  {name:'슬라임',    icon:'🟢',hp:40, maxHp:40, atk:[5,10], exp:20, gold:10, spd:0.8,lootChance:0.3},
  {name:'고블린',    icon:'👺',hp:60, maxHp:60, atk:[8,14], exp:35, gold:18, spd:1.0,lootChance:0.4},
  {name:'오크전사',  icon:'👹',hp:100,maxHp:100,atk:[12,22],exp:60, gold:30, spd:0.8,lootChance:0.5},
];
const MONSTERS_F2=[  // 2층: 강한 몬스터
  {name:'다크나이트',icon:'🖤',hp:150,maxHp:150,atk:[18,32],exp:110,gold:70, spd:1.1,lootChance:0.55},
  {name:'드래곤',    icon:'🐲',hp:200,maxHp:200,atk:[25,45],exp:150,gold:100,spd:0.7,lootChance:0.7},
  {name:'마왕',      icon:'💀',hp:300,maxHp:300,atk:[35,60],exp:300,gold:200,spd:0.9,lootChance:0.9},
];

const ITEMS={
  '낡은 검':        {icon:'🗡️',type:'weapon',slot:'weapon',atk:5,  desc:'낡았지만 쓸 만하다',      rarity:'common'},
  '강철 검':        {icon:'⚔️',type:'weapon',slot:'weapon',atk:12, desc:'단단한 강철로 만든 검',   rarity:'uncommon'},
  '마법 지팡이':    {icon:'🪄',type:'weapon',slot:'weapon',atk:18, desc:'마법 에너지가 깃들어 있다',rarity:'rare'},
  '용사의 활':      {icon:'🏹',type:'weapon',slot:'weapon',atk:15, desc:'멀리서도 강력하다',        rarity:'uncommon'},
  '성스러운 지팡이':{icon:'✨',type:'weapon',slot:'weapon',atk:10, desc:'치유의 힘이 깃들어 있다',  rarity:'uncommon'},
  '불꽃 검':        {icon:'🔥',type:'weapon',slot:'weapon',atk:22, desc:'화염이 깃든 전설의 검',    rarity:'epic'},
  '가죽 갑옷':      {icon:'🦺',type:'armor', slot:'armor', def:3,  desc:'가벼운 가죽 갑옷',         rarity:'common'},
  '철 갑옷':        {icon:'🛡️',type:'armor', slot:'armor', def:7,  desc:'튼튼한 철 갑옷',          rarity:'uncommon'},
  '마법 로브':      {icon:'👘',type:'armor', slot:'armor', def:5,  desc:'마법사의 로브',            rarity:'uncommon'},
  '용의 비늘 갑옷': {icon:'🐉',type:'armor', slot:'armor', def:12, desc:'드래곤 비늘 갑옷',         rarity:'epic'},
  '작은 물약':      {icon:'🧪',type:'potion',hp:30,  desc:'HP 30 회복', rarity:'common'},
  '큰 물약':        {icon:'⚗️',type:'potion',hp:80,  desc:'HP 80 회복', rarity:'uncommon'},
  '엘릭서':         {icon:'💎',type:'potion',hp:9999,desc:'HP 전체 회복',rarity:'rare'},
};
const LOOT_TABLE=[
  ['낡은 검',0.15],['강철 검',0.08],['마법 지팡이',0.04],['용사의 활',0.07],
  ['가죽 갑옷',0.12],['철 갑옷',0.07],['마법 로브',0.05],
  ['작은 물약',0.25],['큰 물약',0.10],['엘릭서',0.03],
  ['불꽃 검',0.02],['용의 비늘 갑옷',0.02],
];

const MAP_W=1600,MAP_H=1200,TILE=40;
const NC=['#7ab0e0','#b07ae0','#7ade9a','#e0c07a','#e07a7a','#7ae0d8'];

// ── STATE ──────────────────────────────────────────
let me=null;
let myPos={x:300,y:400};
let myTarget=null;
let cam={x:0,y:0};
let players={};
let monsters={};
let drops={};
let currentFloor=1;   // 현재 층 (1 or 2)
let lastChatTs=0;
let activeTab='st';
let actionLock=false;
let monsterAttackLock=false;
let torchT=0;
let innTransitioning=false;
const bubbleTimers={};

const cv=document.getElementById('cv');
const ctx=cv.getContext('2d');
const elLayer=document.getElementById('el');

// ── 칼 커서 SVG (왼쪽 대각선 위 방향) ────────────
const SWORD_CURSOR="url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'%3E%3Cg transform='translate(18,18) rotate(-135) translate(-18,-18)'%3E%3Ctext x='2' y='30' font-size='28'%3E%F0%9F%97%A1%EF%B8%8F%3C/text%3E%3C/g%3E%3C/svg%3E\") 4 4, crosshair";
const FINGER_CURSOR="url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ctext y='28' font-size='26'%3E%F0%9F%91%86%3C/text%3E%3C/svg%3E\") 12 4, pointer";

// ── 맵 생성 ────────────────────────────────────────
const COLS=Math.ceil(MAP_W/TILE),ROWS=Math.ceil(MAP_H/TILE);
const mapData=[];
for(let r=0;r<ROWS;r++){
  mapData[r]=[];
  for(let c=0;c<COLS;c++){
    mapData[r][c]=(r===0||r===ROWS-1||c===0||c===COLS-1)?1:0;
  }
}
function isWall(x,y){const c=Math.floor(x/TILE),r=Math.floor(y/TILE);if(r<0||r>=ROWS||c<0||c>=COLS)return true;return mapData[r][c]===1;}
function walkable(x,y){return !isWall(x-14,y-14)&&!isWall(x+14,y-14)&&!isWall(x-14,y+14)&&!isWall(x+14,y+14);}
function safeSpawn(cx,cy,radius=60){for(let i=0;i<30;i++){const x=cx+(Math.random()-.5)*radius*2,y=cy+(Math.random()-.5)*radius*2;if(walkable(x,y))return{x,y};}return{x:cx,y:cy};}

// ── 유틸 ──────────────────────────────────────────
const rnd=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>{const dx=a.x-b.x,dy=a.y-b.y;return Math.sqrt(dx*dx+dy*dy);};
function ncol(u){if(!u)return'#8a8070';let h=0;for(const c of u)h=(h*31+c.charCodeAt(0))%NC.length;return NC[h];}
function w2s(wx,wy){return{x:wx-cam.x,y:wy-cam.y};}
function resize(){cv.width=document.getElementById('dc').clientWidth;cv.height=document.getElementById('dc').clientHeight;}
window.addEventListener('resize',resize);

// ── 스탯 (레벨 + 강화 보너스 포함) ───────────────
function forgeBonus(fullName){
  if(!fullName)return 0;
  const m=fullName.match(/\+(\d+)$/);if(!m)return 0;
  const lv=parseInt(m[1]);
  // +1마다 3, +3부터 4, +5부터 5...씩 누적
  let bonus=0;
  const fd=[3,3,4,4,5,5,6,6,7,8];
  for(let i=0;i<lv&&i<fd.length;i++)bonus+=fd[i];
  return bonus;
}
function myAtk(){
  const base=CLS_DATA[me.cls]?.atk||[10,18];
  const wName=me.equipped?.weapon;
  const wBase=wName?ITEMS[wName.replace(/ \+\d+$/,'')]:null;
  const wb=(wBase?.atk||0)+forgeBonus(wName);
  const lb=Math.floor((me.level-1)*1.5);
  return[base[0]+wb+lb,base[1]+wb+lb];
}
function myDef(){
  const aName=me.equipped?.armor;
  const aBase=aName?ITEMS[aName.replace(/ \+\d+$/,'')]:null;
  const ab=(aBase?.def||0)+forgeBonus(aName);
  return ab+Math.floor((me.level-1)*0.8);
}
function myMaxHp(){
  return(CLS_DATA[me.cls]?.maxHp||100)+(me.level-1)*10;
}

// ── SVG 캐릭터 ────────────────────────────────────
const CLS_COLORS={
  전사:  {body:'#4a7ec8',hair:'#3a2010',cloth:'#2a4a8a'},
  마법사:{body:'#8a4ac8',hair:'#1a0a2a',cloth:'#5a2a8a'},
  궁수:  {body:'#4a9e6a',hair:'#2a1a0a',cloth:'#2a6a4a'},
  힐러:  {body:'#c8a84a',hair:'#5a3a10',cloth:'#8a6a2a'},
};
function makeHumanSVG(cls,isMe){
  const cd=CLS_COLORS[cls]||CLS_COLORS['전사'];
  const glow=isMe?`filter:drop-shadow(0 0 5px ${cd.body}99);`:'';
  return`<svg viewBox="0 0 36 48" width="32" height="42" style="${glow};display:block;overflow:visible">
    <g class="body-g">
      <g class="leg-l" style="transform-origin:18px 36px"><rect x="13" y="34" width="7" height="11" rx="3" fill="${cd.cloth}" opacity="0.9"/><rect x="13" y="42" width="8" height="4" rx="2" fill="#2a1a0a"/></g>
      <g class="leg-r" style="transform-origin:18px 36px"><rect x="20" y="34" width="7" height="11" rx="3" fill="${cd.cloth}" opacity="0.9"/><rect x="20" y="42" width="8" height="4" rx="2" fill="#2a1a0a"/></g>
      <rect x="11" y="20" width="14" height="16" rx="4" fill="${cd.cloth}"/>
      <rect x="14" y="22" width="8" height="2" rx="1" fill="${cd.body}" opacity="0.6"/>
      <g class="arm-l" style="transform-origin:12px 22px"><rect x="6" y="20" width="6" height="10" rx="3" fill="${cd.body}" opacity="0.9"/><rect x="6" y="28" width="6" height="4" rx="2" fill="#d4a882"/></g>
      <g class="arm-r" style="transform-origin:24px 22px"><rect x="24" y="20" width="6" height="10" rx="3" fill="${cd.body}" opacity="0.9"/><rect x="24" y="28" width="6" height="4" rx="2" fill="#d4a882"/></g>
      <rect x="15" y="16" width="6" height="6" rx="2" fill="#d4a882"/>
      <ellipse cx="18" cy="12" rx="9" ry="10" fill="#d4a882"/>
      <ellipse cx="18" cy="5" rx="9" ry="5" fill="${cd.hair}"/>
      <rect x="9" y="4" width="4" height="8" rx="2" fill="${cd.hair}"/>
      <rect x="23" y="4" width="4" height="8" rx="2" fill="${cd.hair}"/>
      <ellipse cx="14.5" cy="12" rx="2" ry="2.2" fill="white"/>
      <ellipse cx="21.5" cy="12" rx="2" ry="2.2" fill="white"/>
      <ellipse cx="14.8" cy="12.3" rx="1.2" ry="1.4" fill="#1a0a00"/>
      <ellipse cx="21.8" cy="12.3" rx="1.2" ry="1.4" fill="#1a0a00"/>
      <circle cx="15.3" cy="11.7" r="0.4" fill="white"/>
      <circle cx="22.3" cy="11.7" r="0.4" fill="white"/>
      <path d="M15.5 16.5 Q18 18 20.5 16.5" stroke="#a06040" stroke-width="1" fill="none" stroke-linecap="round"/>
      ${isMe?`<text x="18" y="0" text-anchor="middle" font-size="7">⭐</text>`:''}
    </g>
  </svg>`;
}

// ── 플로팅 텍스트 ─────────────────────────────────
function floatTxt(text,x,y,cls){
  const d=document.createElement('div');
  d.className='fdmg '+cls;d.textContent=text;
  d.style.left=x+'px';d.style.top=y+'px';d.style.pointerEvents='none';
  elLayer.appendChild(d);setTimeout(()=>d.remove(),900);
}

// ── 말풍선 ────────────────────────────────────────
function showChatBubble(id,text){
  const el=document.getElementById('ch-'+id);if(!el)return;
  let b=el.querySelector('.chat-bub');
  if(!b){
    b=document.createElement('div');b.className='chat-bub';
    b.style.cssText=`position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);
      background:rgba(20,24,36,0.95);border:1px solid #3a4055;border-radius:8px;
      padding:4px 9px;font-size:11px;white-space:nowrap;max-width:160px;
      overflow:hidden;text-overflow:ellipsis;color:#e8e0d0;pointer-events:none;
      box-shadow:0 2px 8px rgba(0,0,0,0.5);z-index:30;animation:bubIn .15s ease;`;
    el.appendChild(b);
  }
  b.textContent=text;
  clearTimeout(bubbleTimers[id]);
  bubbleTimers[id]=setTimeout(()=>{if(b.parentNode)b.remove();},4000);
}

// ── 맵 그리기 ─────────────────────────────────────
const INN_X=80,INN_Y=400,INN_W=70,INN_H=90;
const STAIR_UP_X=1520,STAIR_UP_Y=600;
const STAIR_DOWN_X=80, STAIR_DOWN_Y=600;

// 마우스 월드 좌표 추적
let mouseWX=0,mouseWY=0;
cv.addEventListener('mousemove',e=>{
  const r=cv.getBoundingClientRect();
  mouseWX=e.clientX-r.left+cam.x;
  mouseWY=e.clientY-r.top+cam.y;
});

function drawMap(){
  torchT+=0.03;
  ctx.clearRect(0,0,cv.width,cv.height);
  ctx.fillStyle='#080a0d';ctx.fillRect(0,0,cv.width,cv.height);
  const sc=Math.max(0,Math.floor(cam.x/TILE)-1);
  const sr=Math.max(0,Math.floor(cam.y/TILE)-1);
  const ec=Math.min(COLS,sc+Math.ceil(cv.width/TILE)+2);
  const er=Math.min(ROWS,sr+Math.ceil(cv.height/TILE)+2);
  // 층별 색상 차이
  const floorCol=currentFloor===1?['#121620','#0f131a']:['#1a1020','#150d1a'];
  for(let r=sr;r<er;r++){
    for(let c=sc;c<ec;c++){
      const sx=c*TILE-cam.x,sy=r*TILE-cam.y;
      if(mapData[r][c]===1){
        ctx.fillStyle=currentFloor===1?'#181c28':'#22182a';ctx.fillRect(sx,sy,TILE,TILE);
        ctx.fillStyle='#0f1118';ctx.fillRect(sx,sy,TILE,2);ctx.fillRect(sx,sy,2,TILE);
        ctx.fillStyle='#21263a';ctx.fillRect(sx+2,sy+TILE-2,TILE-2,2);ctx.fillRect(sx+TILE-2,sy+2,2,TILE-4);
      } else {
        ctx.fillStyle=(r+c)%2===0?floorCol[0]:floorCol[1];ctx.fillRect(sx,sy,TILE,TILE);
        ctx.strokeStyle='rgba(255,255,255,0.03)';ctx.lineWidth=0.5;ctx.strokeRect(sx,sy,TILE,TILE);
        if(r%8===1&&c%10===1){
          const fl=0.5+Math.sin(torchT*3+c+r)*0.5;
          const col=currentFloor===1?`rgba(255,140,40,${0.12*fl})`:`rgba(180,80,255,${0.10*fl})`;
          const g=ctx.createRadialGradient(sx+TILE/2,sy+TILE/2,4,sx+TILE/2,sy+TILE/2,80);
          g.addColorStop(0,col);g.addColorStop(1,'transparent');
          ctx.fillStyle=g;ctx.fillRect(sx-30,sy-30,TILE+60,TILE+60);
        }
      }
    }
  }
  // 층 표시
  drawFloorLabel();
  // 1층에만 여관 입구
  if(currentFloor===1)drawInnEntrance();
  // 계단
  drawStairs();
}

function drawFloorLabel(){
  ctx.save();
  ctx.fillStyle='rgba(10,8,20,0.7)';
  ctx.beginPath();if(ctx.roundRect)ctx.roundRect(8,8,80,26,6);else ctx.rect(8,8,80,26);
  ctx.fill();
  ctx.fillStyle=currentFloor===1?'#c9a84c':'#a060ff';
  ctx.font='bold 13px Cinzel,serif';ctx.textAlign='left';
  ctx.fillText(currentFloor===1?'🏰 1층':'👿 2층',16,27);
  ctx.restore();
}

function drawInnEntrance(){
  const sx=INN_X-cam.x,sy=INN_Y-cam.y;
  if(sx+INN_W<0||sx>cv.width||sy+INN_H<0||sy>cv.height)return;
  const fl=0.7+Math.sin(torchT*2)*0.3;

  // 마우스 호버 여부
  const hovered=Math.abs(mouseWX-(INN_X+INN_W/2))<50&&Math.abs(mouseWY-(INN_Y+INN_H/2))<55;

  // 광원 (호버 시 더 밝게)
  const glow=ctx.createRadialGradient(sx+INN_W/2,sy+INN_H/2,10,sx+INN_W/2,sy+INN_H/2,hovered?130:110);
  glow.addColorStop(0,`rgba(255,${hovered?200:160},${hovered?80:60},${(hovered?0.35:0.22)*fl})`);
  glow.addColorStop(1,'transparent');
  ctx.fillStyle=glow;ctx.fillRect(sx-60,sy-60,INN_W+120,INN_H+120);

  // 건물
  ctx.fillStyle='#3a2510';ctx.fillRect(sx,sy,INN_W,INN_H);
  ctx.fillStyle='#5a3818';ctx.fillRect(sx-6,sy,INN_W+12,14);
  ctx.fillStyle='#7a5028';ctx.fillRect(sx-6,sy,INN_W+12,5);
  ctx.strokeStyle='rgba(0,0,0,0.3)';ctx.lineWidth=1.5;
  for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(sx+i*(INN_W/4),sy+14);ctx.lineTo(sx+i*(INN_W/4),sy+INN_H);ctx.stroke();}

  // 문
  const dX=sx+INN_W/2-14,dY=sy+INN_H-44,dW=28,dH=44;
  ctx.fillStyle='#1a0e06';ctx.fillRect(dX-3,dY-3,dW+6,dH+3);
  const dg=ctx.createLinearGradient(dX,dY,dX,dY+dH);
  dg.addColorStop(0,`rgba(255,180,80,${0.85*fl})`);dg.addColorStop(1,`rgba(200,120,40,${0.5*fl})`);
  ctx.fillStyle=dg;ctx.fillRect(dX,dY,dW,dH);
  ctx.fillStyle='#1a0e06';ctx.beginPath();ctx.arc(dX+dW/2,dY,dW/2+3,Math.PI,0);ctx.fill();
  const ag=ctx.createRadialGradient(dX+dW/2,dY,2,dX+dW/2,dY,dW/2);
  ag.addColorStop(0,`rgba(255,200,100,${0.9*fl})`);ag.addColorStop(1,`rgba(200,120,40,${0.4*fl})`);
  ctx.fillStyle=ag;ctx.beginPath();ctx.arc(dX+dW/2,dY,dW/2,Math.PI,0);ctx.fill();
  ctx.fillStyle='#c9a84c';ctx.beginPath();ctx.arc(dX+dW-7,dY+dH/2,3,0,Math.PI*2);ctx.fill();

  // 창문
  [[sx+8,sy+22],[sx+INN_W-24,sy+22]].forEach(([wx,wy])=>{
    ctx.fillStyle='#0f0906';ctx.fillRect(wx-1,wy-1,18,18);
    const wg=ctx.createRadialGradient(wx+8,wy+8,1,wx+8,wy+8,10);
    wg.addColorStop(0,`rgba(255,200,100,${0.7*fl})`);wg.addColorStop(1,`rgba(200,140,60,${0.2*fl})`);
    ctx.fillStyle=wg;ctx.fillRect(wx,wy,16,16);
    ctx.strokeStyle='rgba(0,0,0,0.5)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(wx+8,wy);ctx.lineTo(wx+8,wy+16);ctx.stroke();
    ctx.beginPath();ctx.moveTo(wx,wy+8);ctx.lineTo(wx+16,wy+8);ctx.stroke();
  });

  // 간판
  const sX=sx+INN_W/2,sY=sy-18;
  ctx.fillStyle='#5a3818';ctx.fillRect(sX-30,sY-10,60,20);
  ctx.strokeStyle='#c9a84c';ctx.lineWidth=1;ctx.strokeRect(sX-30,sY-10,60,20);
  ctx.strokeStyle='#7a5028';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(sX-20,sY-10);ctx.lineTo(sX-20,sy-6);ctx.stroke();
  ctx.beginPath();ctx.moveTo(sX+20,sY-10);ctx.lineTo(sX+20,sy-6);ctx.stroke();
  ctx.fillStyle='#c9a84c';ctx.font=`bold 9px Noto Sans KR,sans-serif`;ctx.textAlign='center';
  ctx.fillText('🍺 황금 용',sX,sY+4);

  // ── 호버 시 노란 테두리 글로우 ──
  if(hovered){
    ctx.save();
    ctx.strokeStyle=`rgba(255,215,0,${0.8+Math.sin(torchT*5)*0.2})`;
    ctx.lineWidth=2.5;
    ctx.shadowColor='#ffd700';
    ctx.shadowBlur=12;
    ctx.strokeRect(sx-2,sy-2,INN_W+4,INN_H+4);
    // 모서리 강조
    const cSize=8;
    [[sx-2,sy-2],[sx+INN_W-cSize+2,sy-2],[sx-2,sy+INN_H-cSize+2],[sx+INN_W-cSize+2,sy+INN_H-cSize+2]].forEach(([cx,cy])=>{
      ctx.fillStyle=`rgba(255,215,0,0.9)`;
      ctx.fillRect(cx,cy,cSize,2);ctx.fillRect(cx,cy,2,cSize);
    });
    ctx.restore();
  }

  // 근접 안내 말풍선
  if(me&&dist({x:INN_X+INN_W/2,y:INN_Y+INN_H/2},myPos)<120){
    ctx.save();ctx.globalAlpha=0.9;
    ctx.fillStyle='rgba(20,16,8,0.9)';
    ctx.beginPath();if(ctx.roundRect)ctx.roundRect(sx+INN_W/2-38,sy-48,76,22,6);else ctx.rect(sx+INN_W/2-38,sy-48,76,22);
    ctx.fill();
    ctx.strokeStyle=hovered?'#ffd700':'#c9a84c';ctx.lineWidth=1;
    ctx.beginPath();if(ctx.roundRect)ctx.roundRect(sx+INN_W/2-38,sy-48,76,22,6);else ctx.rect(sx+INN_W/2-38,sy-48,76,22);
    ctx.stroke();
    ctx.fillStyle=hovered?'#ffd700':'#e8d0a0';ctx.font='11px Noto Sans KR,sans-serif';ctx.textAlign='center';
    ctx.fillText('🚪 여관 입장',sx+INN_W/2,sy-32);
    ctx.restore();
  }
}

function drawStairs(){
  // 1층: 오른쪽에 위로 올라가는 계단
  // 2층: 왼쪽에 아래로 내려가는 계단
  const isF1=currentFloor===1;
  const sx=(isF1?STAIR_UP_X:STAIR_DOWN_X)-cam.x;
  const sy=(isF1?STAIR_UP_Y:STAIR_DOWN_Y)-cam.y;
  const fl=0.7+Math.sin(torchT*2.5)*0.3;
  const col=isF1?`rgba(100,180,255,${0.25*fl})`:`rgba(100,255,150,${0.25*fl})`;
  const g=ctx.createRadialGradient(sx,sy,5,sx,sy,80);
  g.addColorStop(0,col);g.addColorStop(1,'transparent');
  ctx.fillStyle=g;ctx.fillRect(sx-80,sy-80,160,160);
  // 계단 그리기
  const w=60,h=60;
  ctx.fillStyle=isF1?'#1a2840':'#1a3020';ctx.fillRect(sx-w/2,sy-h/2,w,h);
  ctx.strokeStyle=isF1?'#4a8ec8':'#4ac870';ctx.lineWidth=1.5;ctx.strokeRect(sx-w/2,sy-h/2,w,h);
  for(let i=0;i<5;i++){
    const ly=sy-h/2+8+i*10;
    ctx.fillStyle=isF1?`rgba(100,180,255,${0.3+i*0.08})`:`rgba(100,255,150,${0.3+i*0.08})`;
    ctx.fillRect(sx-w/2+4+i*3,ly,w-8-i*6,6);
  }
  ctx.fillStyle=isF1?'#80c0ff':'#80ffb0';
  ctx.font='20px sans-serif';ctx.textAlign='center';
  ctx.fillText(isF1?'🔼':'🔽',sx,sy+6);
  // 안내 표시
  const near=me&&dist({x:isF1?STAIR_UP_X:STAIR_DOWN_X,y:isF1?STAIR_UP_Y:STAIR_DOWN_Y},myPos)<90;
  if(near){
    ctx.save();ctx.globalAlpha=0.9;
    ctx.fillStyle='rgba(10,14,26,0.9)';
    const lbl=isF1?'2층으로 올라가기':'1층으로 내려가기';
    ctx.beginPath();if(ctx.roundRect)ctx.roundRect(sx-50,sy-52,100,22,6);else ctx.rect(sx-50,sy-52,100,22);
    ctx.fill();ctx.strokeStyle=isF1?'#4a8ec8':'#4ac870';ctx.lineWidth=1;
    ctx.beginPath();if(ctx.roundRect)ctx.roundRect(sx-50,sy-52,100,22,6);else ctx.rect(sx-50,sy-52,100,22);
    ctx.stroke();ctx.fillStyle='#e8e0d0';ctx.font='10px Noto Sans KR,sans-serif';ctx.textAlign='center';
    ctx.fillText(isF1?'🔼 2층':'🔽 1층',sx,sy-36);ctx.restore();
  }
}

// ── 커서 ──────────────────────────────────────────
function setCursor(type){
  cv.style.cursor=type==='sword'?SWORD_CURSOR:FINGER_CURSOR;
}
cv.addEventListener('mousemove',e=>{
  if(!me)return;
  const r=cv.getBoundingClientRect();
  mouseWX=e.clientX-r.left+cam.x;
  mouseWY=e.clientY-r.top+cam.y;
  // 몬스터 위
  let onMon=false;
  for(const m of Object.values(monsters)){if(!m.alive)continue;if(dist({x:mouseWX,y:mouseWY},m)<30){onMon=true;break;}}
  if(onMon){setCursor('sword');return;}
  // 여관 입구 (1층)
  if(currentFloor===1){
    const dX=INN_X+INN_W/2,dY=INN_Y+INN_H/2;
    if(Math.abs(mouseWX-dX)<50&&Math.abs(mouseWY-dY)<55){
      cv.style.cursor="url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'%3E%3Cfilter id='g'%3E%3CfeGaussianBlur stdDeviation='2' result='b'/%3E%3CfeMerge%3E%3CfeMergeNode in='b'/%3E%3CfeMergeNode in='SourceGraphic'/%3E%3C/feMerge%3E%3C/filter%3E%3Ctext y='30' font-size='26' filter='url(%23g)' fill='%23ffd700'%3E%F0%9F%91%86%3C/text%3E%3C/svg%3E\") 12 4, pointer";
      return;
    }
  }
  // 계단
  const stX=currentFloor===1?STAIR_UP_X:STAIR_DOWN_X;
  const stY=currentFloor===1?STAIR_UP_Y:STAIR_DOWN_Y;
  if(dist({x:mouseWX,y:mouseWY},{x:stX,y:stY})<45){
    cv.style.cursor="url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'%3E%3Cfilter id='g'%3E%3CfeGaussianBlur stdDeviation='2' result='b'/%3E%3CfeMerge%3E%3CfeMergeNode in='b'/%3E%3CfeMergeNode in='SourceGraphic'/%3E%3C/feMerge%3E%3C/filter%3E%3Ctext y='30' font-size='26' filter='url(%23g)' fill='%23ffd700'%3E%F0%9F%91%86%3C/text%3E%3C/svg%3E\") 12 4, pointer";
    return;
  }
  setCursor('default');
});
cv.addEventListener('mouseleave',()=>setCursor('default'));

// ── 캐릭터 DOM ─────────────────────────────────────
function getOrMakeChar(id,data){
  let e=document.getElementById('ch-'+id);
  if(!e){
    e=document.createElement('div');e.id='ch-'+id;e.className='ce';e.style.pointerEvents='none';
    e.innerHTML=makeHumanSVG(data.cls||'전사',id===me?.id)+
      `<div class="chw"><div class="chb" id="chb-${id}"></div></div>
       <div class="cn2" style="color:${ncol(data.username)}">${data.username}${id===me?.id?' ⭐':''}</div>`;
    elLayer.appendChild(e);
  }
  return e;
}
function placeChar(id,data){
  const e=getOrMakeChar(id,data);
  const s=w2s(data.x,data.y);
  e.style.left=s.x+'px';e.style.top=s.y+'px';e.style.transform='translate(-50%,-60%)';
  const hb=document.getElementById('chb-'+id);
  if(hb){const p=clamp((data.hp/(data.maxHp||100))*100,0,100);hb.style.width=p+'%';hb.style.background=p>50?'#4a9e6a':p>25?'#c8874a':'#c84a4a';}
}
function remChar(id){const e=document.getElementById('ch-'+id);if(e)e.remove();}

// ── 몬스터 DOM ─────────────────────────────────────
function getOrMakeMon(id,m){
  let e=document.getElementById('mn-'+id);
  if(!e){
    e=document.createElement('div');e.id='mn-'+id;e.className='me2';
    e.style.pointerEvents='all';e.style.cursor=SWORD_CURSOR;
    e.innerHTML=`<div class="ms" id="msp-${id}">${m.icon}</div>
      <div class="mhw"><div class="mhf" id="mhp-${id}" style="width:100%"></div></div>
      <div class="mnl">${m.name}</div>`;
    e.addEventListener('click',ev=>{ev.stopPropagation();attackMon(id);});
    e.addEventListener('mouseenter',()=>setCursor('sword'));
    e.addEventListener('mouseleave',()=>setCursor('default'));
    elLayer.appendChild(e);
  }
  return e;
}
function placeMon(id,m){
  if(!m.alive){const e=document.getElementById('mn-'+id);if(e)e.remove();return;}
  const e=getOrMakeMon(id,m);
  const s=w2s(m.x,m.y);
  e.style.left=s.x+'px';e.style.top=s.y+'px';e.style.transform='translate(-50%,-50%)';
  e.style.zIndex=Math.floor(m.y);
  const p=clamp((m.hp/m.maxHp)*100,0,100);
  const hb=document.getElementById('mhp-'+id);
  if(hb){hb.style.width=p+'%';hb.style.background=p>50?'#c84a4a':p>25?'#c8874a':'#e06060';}
}
function remMon(id){const e=document.getElementById('mn-'+id);if(e)e.remove();}

// ── 드랍 DOM ──────────────────────────────────────
function placeDrop(id,drop){
  let e=document.getElementById('dp-'+id);
  if(!e){
    e=document.createElement('div');e.id='dp-'+id;e.className='de';
    e.textContent=ITEMS[drop.item]?.icon||'📦';e.title=drop.item+' (클릭 획득)';
    e.style.pointerEvents='all';e.style.cursor='pointer';
    e.addEventListener('click',ev=>{ev.stopPropagation();tryPickup(id,drop);});
    elLayer.appendChild(e);
  }
  const s=w2s(drop.x,drop.y);e.style.left=s.x+'px';e.style.top=s.y+'px';
}
function remDrop(id){const e=document.getElementById('dp-'+id);if(e)e.remove();}

// ── 메인 루프 ─────────────────────────────────────
function loop(){
  let moving=false;
  if(myTarget){
    const dx=myTarget.x-myPos.x,dy=myTarget.y-myPos.y,d=Math.sqrt(dx*dx+dy*dy);
    if(d>4){
      const sp=3.5,nx=myPos.x+dx/d*sp,ny=myPos.y+dy/d*sp;
      if(walkable(nx,ny)){myPos.x=nx;myPos.y=ny;}
      else if(walkable(nx,myPos.y))myPos.x=nx;
      else if(walkable(myPos.x,ny))myPos.y=ny;
      moving=true;
    } else {myPos.x=myTarget.x;myPos.y=myTarget.y;myTarget=null;}
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

// ── 포탈 체크 (계단 + 여관 입구) ─────────────────
let portalCooldown=false;
function checkPortals(){
  if(!me||portalCooldown)return;
  // 여관 입구 (1층만)
  if(currentFloor===1&&!innTransitioning){
    const dX=INN_X+INN_W/2,dY=INN_Y+INN_H-10;
    if(Math.abs(myPos.x-dX)<22&&Math.abs(myPos.y-dY)<28){
      innTransitioning=true;myTarget=null;
      addLine({cls:'sy',text:'🍺 황금 용 여관으로 들어갑니다...'});
      saveProfile();
      setTimeout(()=>{window.location.href='chatroom.html?respawn=1';},800);
      return;
    }
  }
  // 계단
  const stX=currentFloor===1?STAIR_UP_X:STAIR_DOWN_X;
  const stY=currentFloor===1?STAIR_UP_Y:STAIR_DOWN_Y;
  if(dist({x:stX,y:stY},myPos)<38){
    portalCooldown=true;
    changeFloor(currentFloor===1?2:1);
    setTimeout(()=>portalCooldown=false,1500);
  }
}

function changeFloor(floor){
  currentFloor=floor;
  // 기존 몬스터 DOM 제거
  Object.keys(monsters).forEach(id=>remMon(id));
  monsters={};
  // 새 층 몬스터 스폰
  spawnMonsters();
  // 반대쪽 계단 근처에서 시작
  if(floor===2){
    myPos=safeSpawn(200,600,80);
    addLine({cls:'lv',text:'👿 2층 던전! 강한 몬스터들이 기다린다...'});
  } else {
    myPos=safeSpawn(1400,600,80);
    addLine({cls:'sy',text:'🏰 1층으로 돌아왔습니다.'});
  }
}

// ── 몬스터 AI ─────────────────────────────────────
let lastAi=0;
function monAI(){
  const now=Date.now();if(now-lastAi<350)return;lastAi=now;
  for(const[id,m]of Object.entries(monsters)){
    if(!m.alive)continue;
    const d=dist(m,myPos);
    if(d<220){
      if(d>45){
        const dx=myPos.x-m.x,dy=myPos.y-m.y,dd=Math.sqrt(dx*dx+dy*dy);
        const nx=m.x+dx/dd*m.spd*2.2,ny=m.y+dy/dd*m.spd*2.2;
        if(walkable(nx,ny)){m.x=nx;m.y=ny;}
      } else if(!monsterAttackLock){
        const def=myDef(),raw=rnd(m.atk[0],m.atk[1]),dmg=Math.max(1,raw-def);
        me.hp=Math.max(0,me.hp-dmg);
        const s=w2s(myPos.x,myPos.y);floatTxt('-'+dmg,s.x,s.y-20,'p');
        addLine({cls:'bt',text:`${m.icon}${m.name}이 ${dmg} 데미지!`});
        if(me.hp<=0)doRespawn();
        renderCurTab();
        monsterAttackLock=true;setTimeout(()=>monsterAttackLock=false,1000);
      }
    }
  }
}

function doRespawn(){
  addLine({cls:'bt',text:'💀 쓰러졌습니다! 황금 용 여관으로 이송됩니다...'});
  me.hp=Math.round(myMaxHp()*0.5);
  saveProfile();
  setTimeout(()=>{window.location.href='chatroom.html?respawn=1';},2000);
}

// ── 전투 ──────────────────────────────────────────
function attackMon(id){
  const m=monsters[id];if(!m||!m.alive)return;
  if(dist(m,myPos)>140){myTarget={x:m.x,y:m.y};setTimeout(()=>doHit(id),1000);}
  else doHit(id);
}
function doHit(id){
  const m=monsters[id];if(!m||!m.alive||actionLock)return;
  actionLock=true;setTimeout(()=>actionLock=false,500);
  const ar=myAtk(),dmg=rnd(ar[0],ar[1]);
  m.hp=Math.max(0,m.hp-dmg);
  const mel=document.getElementById('mn-'+id);
  if(mel){mel.classList.add('hit');setTimeout(()=>mel.classList.remove('hit'),300);}
  const s=w2s(m.x,m.y);floatTxt('-'+dmg,s.x,s.y-30,'e');
  addLine({cls:'bt',text:`⚔️ ${m.name}에게 ${dmg} 데미지!`});
  if(m.hp<=0){killMon(id,m);return;}
  setTimeout(()=>{
    if(!m.alive)return;
    const def=myDef(),raw=rnd(m.atk[0],m.atk[1]),dmg2=Math.max(1,raw-def);
    me.hp=Math.max(0,me.hp-dmg2);
    const ps=w2s(myPos.x,myPos.y);floatTxt('-'+dmg2,ps.x,ps.y-20,'p');
    if(me.hp<=0)doRespawn();
    renderCurTab();saveProfile();
  },350);
  renderCurTab();
}
async function killMon(id,m){
  m.alive=false;remMon(id);
  me.exp=(me.exp||0)+m.exp;me.gold=(me.gold||0)+m.gold;me.kills=(me.kills||0)+1;
  const s=w2s(m.x,m.y);
  floatTxt('+'+m.exp+'xp',s.x-10,s.y-20,'x');floatTxt('+'+m.gold+'G',s.x+10,s.y-36,'g');
  addLine({cls:'lt',text:`🎉 ${m.icon}${m.name} 처치! +${m.exp}XP +${m.gold}G`});
  checkLvUp();
  if(Math.random()<m.lootChance){const item=rollLoot();if(item){const did='d'+Date.now();drops[did]={item,x:m.x+rnd(-25,25),y:m.y+rnd(-25,25)};addLine({cls:'lt',text:`💎 ${ITEMS[item]?.icon||''}${item} 드랍!`});}}
  setTimeout(()=>{
    if(!monsters[id])return;
    const defs=currentFloor===1?MONSTERS_F1:MONSTERS_F2;
    const def=defs[rnd(0,defs.length-1)];
    const sp=safeSpawn(m.x,m.y,80);
    monsters[id]={...def,id,alive:true,hp:def.hp,maxHp:def.hp,x:sp.x,y:sp.y};
  },8000);
  renderCurTab();saveProfile();
  await db.from('chats').insert({scope:'dungeon',username:me.username,text:`${m.icon}${m.name} 처치! +${m.gold}G`,is_sys:true});
}
function rollLoot(){let r=Math.random(),acc=0;for(const[n,c]of LOOT_TABLE){acc+=c;if(r<acc)return n;}return null;}
function checkLvUp(){
  const need=me.level*100;
  if((me.exp||0)>=need){
    me.level++;me.exp=(me.exp||0)-need;
    me.maxHp=myMaxHp();me.hp=me.maxHp;
    const ar=myAtk(),def=myDef();
    addLine({cls:'lv',text:`⭐ 레벨 업! Lv.${me.level} — HP+10 공격+1.5 방어+0.8`});
    addLine({cls:'lv',text:`📊 공격 ${ar[0]}~${ar[1]} / 방어 ${def} / HP ${me.hp}`});
    const s=w2s(myPos.x,myPos.y);floatTxt('LEVEL UP!',s.x,s.y-55,'x');
    showChatBubble(me.id,`⭐ Lv.${me.level}!`);
    saveProfile();
  }
}

// ── 아이템 ────────────────────────────────────────
function tryPickup(id,drop){
  if(dist({x:drop.x,y:drop.y},myPos)>90){myTarget={x:drop.x,y:drop.y};setTimeout(()=>doPickup(id,drop),1100);}
  else doPickup(id,drop);
}
function doPickup(id,drop){
  if(!drops[id])return;
  const inv=me.inventory||[];
  if(inv.length>=20){addLine({cls:'sy',text:'인벤토리가 가득 찼습니다! (최대 20칸)'});return;}
  inv.push({name:drop.item,id:Date.now()});
  me.inventory=inv;delete drops[id];remDrop(id);
  addLine({cls:'lt',text:`📦 ${ITEMS[drop.item]?.icon||''}${drop.item} 획득!`});
  if(activeTab==='iv')renderIv();
  saveProfile();
}
function useItem(idx){
  const inv=me.inventory||[];const item=inv[idx];if(!item)return;
  const def=ITEMS[item.name];if(!def)return;
  if(def.type==='potion'){
    const healed=Math.min(def.hp,myMaxHp()-me.hp);
    me.hp=Math.min(myMaxHp(),me.hp+def.hp);
    inv.splice(idx,1);me.inventory=inv;
    addLine({cls:'hl',text:`🧪 ${item.name} 사용! HP +${healed}`});
    const s=w2s(myPos.x,myPos.y);floatTxt('+'+healed,s.x,s.y-20,'h');
    renderCurTab();saveProfile();
  } else if(def.slot) equipItem(idx);
}
function equipItem(idx){
  const inv=me.inventory||[];const item=inv[idx];if(!item)return;
  const def=ITEMS[item.name];if(!def||!def.slot)return;
  const eq=me.equipped||{};
  if(eq[def.slot])inv.push({name:eq[def.slot],id:Date.now()});
  eq[def.slot]=item.name;inv.splice(idx,1);
  me.equipped=eq;me.inventory=inv;
  addLine({cls:'lt',text:`🗡️ ${item.name} 장착!`});
  renderCurTab();saveProfile();
}
function unequip(slot){
  const eq=me.equipped||{};const nm=eq[slot];if(!nm)return;
  const inv=me.inventory||[];
  if(inv.length>=20){addLine({cls:'sy',text:'인벤토리가 가득 찼습니다!'});return;}
  inv.push({name:nm,id:Date.now()});delete eq[slot];
  me.equipped=eq;me.inventory=inv;
  addLine({cls:'sy',text:`${nm} 장착 해제`});
  renderCurTab();saveProfile();
}

// ── 탭 렌더링 ─────────────────────────────────────
function swTab(name){
  activeTab=name;
  document.querySelectorAll('.tb').forEach(t=>t.classList.remove('ac'));
  document.getElementById('tab-'+name).classList.add('ac');
  renderCurTab();
}
function renderCurTab(){if(activeTab==='st')renderSt();else if(activeTab==='eq')renderEq();else renderIv();}
function renderSt(){
  const mh=myMaxHp();me.maxHp=mh;
  const p=clamp((me.hp/mh)*100,0,100);
  const hc=p>50?'#4a9e6a':p>25?'#c8874a':'#c84a4a';
  const en=me.level*100,ep=clamp(((me.exp||0)/en)*100,0,100);
  const ar=myAtk(),def=myDef();
  const cl=CLS_DATA[me.cls]||CLS_DATA['전사'];
  const flLabel=currentFloor===1?'🏰 1층':'👿 2층';
  document.getElementById('pc').innerHTML=`
    <div class="sh"><div class="si">${cl.icon}</div><div><div class="sn">${me.username}</div><div class="sc">${me.cls} · ${flLabel}</div></div><div class="sl">Lv.${me.level}</div></div>
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
  const eq=me.equipped||{};
  const slots=[['weapon','⚔️ 무기'],['armor','🛡️ 갑옷']];
  let h='<div class="eg">';
  slots.forEach(([s,lbl])=>{
    const nm=eq[s],it=nm?ITEMS[nm]:null;
    if(it){const st=it.atk?`공격 +${it.atk}`:it.def?`방어 +${it.def}`:'';
      h+=`<div class="es hi" onclick="unequip('${s}')" onmouseenter="showTip(event,'${nm}')" onmouseleave="hideTip()"><div class="esl">${lbl}</div><div class="esi">${it.icon}</div><div class="esn">${nm}</div><div class="ess">${st}</div></div>`;
    } else h+=`<div class="es"><div class="esl">${lbl}</div><div style="font-size:22px;opacity:.3">○</div><div style="font-size:10px;color:var(--text-mute)">비어있음</div></div>`;
  });
  h+='</div><div style="font-size:11px;color:var(--text-mute)">아이템 클릭 → 장착 해제</div>';
  document.getElementById('pc').innerHTML=h;
}
function renderIv(){
  const inv=me.inventory||[];
  let h=`<div style="font-size:11px;color:var(--text-mute);margin-bottom:8px">${inv.length}/20 칸</div><div class="ig">`;
  for(let i=0;i<20;i++){
    const item=inv[i];
    if(item){const def=ITEMS[item.name]||{icon:'📦',rarity:'common'};
      h+=`<div class="ic r${def.rarity}" onclick="useItem(${i})" onmouseenter="showTip(event,'${item.name}')" onmouseleave="hideTip()"><div class="ii">${def.icon}</div><div class="in">${item.name}</div></div>`;
    } else h+=`<div class="ic em2"></div>`;
  }
  h+='</div><div style="font-size:10px;color:var(--text-mute);margin-top:8px">무기/갑옷: 장착 · 물약: 사용</div>';
  document.getElementById('pc').innerHTML=h;
}
function showTip(e,name){
  const it=ITEMS[name];if(!it)return;
  const tt=document.getElementById('tt');
  document.getElementById('tn').textContent=it.icon+' '+name;
  document.getElementById('ty').textContent=it.type==='weapon'?'무기':it.type==='armor'?'갑옷':'물약';
  document.getElementById('ts').textContent=it.atk?`⚔️ 공격력 +${it.atk}`:it.def?`🛡️ 방어력 +${it.def}`:it.hp?`💊 HP +${it.hp>=9999?'전체':it.hp}`:'';
  document.getElementById('td').textContent=it.desc;
  tt.style.display='block';tt.style.left=(e.clientX+12)+'px';tt.style.top=(e.clientY-10)+'px';
}
function hideTip(){document.getElementById('tt').style.display='none';}

// ── 클릭 이동 ─────────────────────────────────────
cv.addEventListener('click',e=>{
  if(!me)return;
  const rect=cv.getBoundingClientRect();
  const wx=e.clientX-rect.left+cam.x,wy=e.clientY-rect.top+cam.y;
  if(walkable(wx,wy))myTarget={x:wx,y:wy};
});

// ── 몬스터 스폰 ───────────────────────────────────
function spawnMonsters(){
  if(currentFloor===1){
    const pos=[[400,200],[700,200],[1100,200],[1400,200],[250,500],[600,500],[950,500],[1300,500],[1550,500],[400,800],[700,800],[1000,800],[1300,800],[1550,800],[400,1050],[700,1050],[1000,1050],[1300,1050]];
    pos.forEach((p,i)=>{
      const def=MONSTERS_F1[i%MONSTERS_F1.length];
      const sp=safeSpawn(p[0],p[1],50);
      monsters['m'+i]={...def,id:'m'+i,alive:true,hp:def.hp,maxHp:def.hp,x:sp.x,y:sp.y};
    });
  } else {
    const pos=[[300,200],[700,200],[1100,200],[1450,200],[300,500],[700,500],[1100,500],[1450,500],[300,800],[700,800],[1100,800],[1450,800],[300,1050],[700,1050],[1100,1050],[1450,1050]];
    pos.forEach((p,i)=>{
      const def=MONSTERS_F2[i%MONSTERS_F2.length];
      const sp=safeSpawn(p[0],p[1],50);
      monsters['m'+i]={...def,id:'m'+i,alive:true,hp:def.hp,maxHp:def.hp,x:sp.x,y:sp.y};
    });
  }
}

// ── 네트워크 ──────────────────────────────────────
async function saveProfile(){
  if(!me)return;
  try{
    await db.from('profiles').update({
      hp:      me.hp,
      gold:    me.gold||0,
      level:   me.level,
      kills:   me.kills||0,
      exp:     me.exp||0,
      inventory: me.inventory||[],
      equipped:  me.equipped||{},
      defense: myDef(),
    }).eq('id',me.id);
  }catch(e){console.error('saveProfile:',e);}
}
async function pollPlayers(){
  await db.from('presence').upsert({id:me.id,username:me.username,cls:me.cls,x:Math.round(myPos.x),y:Math.round(myPos.y),ts:Date.now()},{onConflict:'id'});
  const{data}=await db.from('presence').select('*').gt('ts',Date.now()-12000);
  if(!data)return;
  const on={};data.forEach(p=>{if(p.id!==me.id)on[p.id]=p;});
  for(const id of Object.keys(players)){if(!on[id]){remChar(id);delete players[id];}}
  for(const[id,p]of Object.entries(on))players[id]={...(players[id]||{}),...p};
}
function addLine(m){
  const log=document.getElementById('cl');
  const d=document.createElement('div');d.className='cl '+(m.cls||'sy');
  if(m.cn)d.innerHTML=`<span class="cn3" style="color:${ncol(m.cn)}">${m.cn}</span> ${m.text}`;
  else d.textContent=m.text;
  log.appendChild(d);log.scrollTop=log.scrollHeight;
}
async function sendChat(){
  const inp=document.getElementById('ci');const t=inp.value.trim();if(!t)return;inp.value='';
  showChatBubble(me.id,t);
  await db.from('chats').insert({scope:'dungeon',username:me.username,text:t,is_sys:false});
}
async function pollChat(){
  const{data:msgs}=await db.from('chats').select('*').eq('scope','dungeon')
    .gt('created_at',new Date(Date.now()-180000).toISOString())
    .order('created_at',{ascending:true}).limit(60);
  if(!msgs)return;
  const nw=msgs.filter(m=>new Date(m.created_at).getTime()>lastChatTs);
  if(!nw.length)return;
  lastChatTs=new Date(msgs[msgs.length-1].created_at).getTime();
  nw.forEach(m=>{
    if(m.is_sys)addLine({cls:'lt',text:m.text});
    else{
      addLine({cls:'',cn:m.username,text:m.text});
      if(m.username!==me.username){const p=Object.values(players).find(x=>x.username===m.username);if(p)showChatBubble(p.id,m.text);}
    }
  });
}

// ── 로그인/입장 ───────────────────────────────────
async function doLogin(){
  const username=document.getElementById('l-id').value.trim().toLowerCase();
  const password=document.getElementById('l-pw').value;
  document.getElementById('l-err').textContent='';
  if(!username||!password){document.getElementById('l-err').textContent='아이디와 비밀번호를 입력해주세요';return;}
  const email=username.includes('@')?username:`${username}@dungeon.game`;
  const{data,error}=await db.auth.signInWithPassword({email,password});
  if(error){document.getElementById('l-err').textContent='아이디 또는 비밀번호가 올바르지 않습니다';return;}
  await enterGame(data.user.id,username);
}

async function enterGame(uid,username){
  // DB에서 최신 프로필 불러오기 — 레벨/아이템 모두 유지
  const{data:p}=await db.from('profiles').select('*').eq('id',uid).single();
  if(p){
    me={
      id:p.id, username:p.username||username, cls:p.cls||'전사',
      hp:p.hp||120, gold:p.gold||0,
      level:p.level||1,   // ← 레벨 유지
      kills:p.kills||0,
      exp:p.exp||0,
      inventory:p.inventory||[],
      equipped:p.equipped||{},
    };
    me.maxHp=myMaxHp(); // 레벨 반영 maxHp
    me.hp=Math.min(me.hp,me.maxHp);
  } else {
    me={id:uid,username,cls:'전사',hp:120,maxHp:120,gold:0,level:1,kills:0,exp:0,inventory:[],equipped:{}};
    await db.from('profiles').insert({id:uid,username,cls:'전사',hp:120,maxHp:120,level:1,exp:0,gold:0,kills:0});
  }
  const sp=safeSpawn(280,400,60);myPos={x:sp.x,y:sp.y};
  document.getElementById('screen-login').style.display='none';
  document.getElementById('screen-game').style.display='flex';
  resize();spawnMonsters();renderSt();loop();
  setInterval(pollPlayers,1800);setInterval(pollChat,1400);setInterval(saveProfile,8000);
  pollChat();
  addLine({cls:'sy',text:`⚔️ 던전 입장! Lv.${me.level} · 📦${(me.inventory||[]).length}개 보유`});
}

async function doLogout(){
  await db.from('presence').delete().eq('id',me?.id);
  await db.auth.signOut();
  document.getElementById('screen-game').style.display='none';
  document.getElementById('screen-login').style.display='flex';
}
window.addEventListener('beforeunload',async()=>{try{await db.from('presence').delete().eq('id',me?.id);}catch(e){}});

(async()=>{
  const{data:{session}}=await db.auth.getSession();
  if(session){await enterGame(session.user.id,session.user.email.split('@')[0]);return;}
  document.getElementById('screen-login').style.display='flex';
})();
