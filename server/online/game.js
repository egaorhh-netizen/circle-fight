// ---- CIRCLE FIGHT — UNIFIED CLIENT ----
const CANVAS_W=760,CANVAS_H=480,RADIUS=28,SWORD_LEN=44,SWORD_W=6,MAX_HP=100;
const ATTACK_RANGE=RADIUS*2+SWORD_LEN+10,ATTACK_DMG=12,ATTACK_CD=600;
const KNOCKBACK=10,IFRAME_TIME=200,PLAYER_SPEED=3.5;
const DASH_SPEED=28,DASH_DMG=20,DASH_DUR=200;
const ORB_DMG=15,ORB_SPEED=5.0,ORB_RADIUS=10,ORB_HOMING=0.08;
const SPIN_DMG=20,SPIN_DUR=600,SPIN_RANGE=(RADIUS+SWORD_LEN+14)*1.5;
const SHIELD_MAX=5;
const MAX_RATING=12500,RATING_PER_WIN=15;

// ---- STORAGE ----
let ratingBot    = parseInt(localStorage.getItem("cf_rating")        || "0");
let ratingOnline = parseInt(localStorage.getItem("cf_rating_online") || "0");
let nickname     = localStorage.getItem("cf_nickname") || "player";
let currentTheme = localStorage.getItem("cf_theme")   || "dark";
let currentLang  = localStorage.getItem("cf_lang")    || "ru";

function saveAll() {
  localStorage.setItem("cf_rating",        ratingBot);
  localStorage.setItem("cf_rating_online", ratingOnline);
  localStorage.setItem("cf_nickname",      nickname);
  localStorage.setItem("cf_theme",         currentTheme);
  localStorage.setItem("cf_lang",          currentLang);
}

// ---- INIT ----
document.body.className = currentTheme;
document.getElementById("nickname-display").textContent = nickname;
updateRatingDisplay();

function updateRatingDisplay() {
  const b = document.getElementById("rating-bot-display");
  const o = document.getElementById("rating-online-display");
  if (b) b.textContent = "🤖 MMR: " + ratingBot;
  if (o) o.textContent = "🌐 MMR: " + ratingOnline;
}

function editNickname() {
  const inp=document.getElementById("nickname-input"),disp=document.getElementById("nickname-display");
  inp.value=nickname; disp.style.display="none"; inp.style.display="block"; inp.focus(); inp.select();
}
function saveNickname() {
  nickname=document.getElementById("nickname-input").value.trim()||"player";
  saveAll();
  document.getElementById("nickname-input").style.display="none";
  document.getElementById("nickname-display").style.display="";
  document.getElementById("nickname-display").textContent=nickname;
}
function changeLanguage(lang){
  currentLang=lang;saveAll();
  const isEn=lang==="en";
  document.getElementById("title").textContent="Circle Fight";
  document.querySelector("#menu button:nth-child(3)").textContent=isEn?"Play vs Bot":"Играть с ботом";
  document.querySelector("#menu button:nth-child(4)").textContent=isEn?"Play Online":"Играть онлайн";
  document.querySelector("#menu button:nth-child(5)").textContent=isEn?"Inventory":"Инвентарь";
  document.querySelector("#menu button:nth-child(6)").textContent=isEn?"Settings":"Настройки";
  document.getElementById("theme-btn").textContent=currentTheme==="dark"?(isEn?"Light":"Светлая"):(isEn?"Dark":"Тёмная");
}
function toggleTheme(){
  currentTheme=currentTheme==="dark"?"light":"dark";
  document.body.className=currentTheme;
  document.getElementById("theme-btn").textContent=currentTheme==="dark"?"Светлая":"Тёмная";
  saveAll();
}

// ---- SCREENS ----
function show(id){document.getElementById(id)?.classList.remove("hidden");}
function hide(id){document.getElementById(id)?.classList.add("hidden");}

function showMenu() {
  ["inventory","settings","game-screen","online-screen","gameover"].forEach(hide);
  show("menu"); stopBotGame(); updateRatingDisplay();
  document.getElementById("search-bar").classList.remove("visible");
}
function showInventory(){hide("menu");show("inventory");buildInventory();}
function showSettings(){hide("menu");show("settings");}

function buildInventory() {
  const grid=document.getElementById("sword-grid"); grid.innerHTML="";
  SWORD_SKINS.forEach(sword=>{
    const unlocked = sword.onlineOnly
      ? ratingOnline >= sword.unlockRating
      : ratingBot >= sword.unlockRating || ratingOnline >= sword.unlockRating;
    const selected=sword.id===selectedSwordId;
    const card=document.createElement("div");
    card.className=`sword-card rarity-${sword.rarity}${selected?" selected":""}${!unlocked?" locked":""}`;
    card.onclick=()=>{if(!unlocked)return;selectedSwordId=sword.id;localStorage.setItem("cf_sword",sword.id);buildInventory();};
    const cv=document.createElement("canvas"); cv.width=140;cv.height=60;
    const cx=cv.getContext("2d"); cx.save();cx.translate(20,30);sword.draw(cx,10,80,null,0,true,null);cx.restore();
    card.appendChild(cv);
    const nm=document.createElement("div");nm.className="sword-name";nm.textContent=sword.name;card.appendChild(nm);
    const rr=document.createElement("div");rr.className="sword-rarity";
    rr.style.color=RARITY_COLOR[sword.rarity]?.startsWith("linear")?"#ff88cc":RARITY_COLOR[sword.rarity];
    rr.textContent=sword.rarity;card.appendChild(rr);
    if(!unlocked){const lk=document.createElement("div");lk.className="sword-lock";lk.textContent=`${sword.onlineOnly?"🌐":"🤖"} ${sword.unlockRating} MMR`;card.appendChild(lk);}
    else if(selected){const sl=document.createElement("div");sl.className="sword-lock";sl.textContent="✓ Выбран";card.appendChild(sl);}
    grid.appendChild(card);
  });
}

// ======== BOT GAME ========
let canvas,ctx,animId,lastTime=0,keys={},player,bot,gameRunning=false,particles=[],orbs=[];

function botStats(){
  const tier=Math.floor(ratingBot/100),tc=Math.min(tier,5),ag=tier>=3;
  return{speed:2+tc,attackCd:Math.max(300,1000-tier*30),reactionTime:Math.max(50,600-tier*20),
    blockChance:Math.min(0.95,0.1+tier*0.05),blockDuration:Math.min(2000,200+tier*80),
    damage:8+tc,retreatHp:ag?0:0.15,turtlePatience:Math.max(300,2000-tier*50),
    aggroDist:ATTACK_RANGE+40+tier*5,strafeSpeed:Math.min(1.5,0.4+tier*0.05),dashChance:Math.min(0.9,tier*0.05)};
}
function pickBotSword(){
  const tier=Math.floor(ratingBot/100),pool=[];
  SWORD_SKINS.forEach(s=>{
    let w=s.unlockRating===0?40:s.unlockRating<=200?25:s.unlockRating<=600?15+tier:s.unlockRating<=2000?5+tier*0.5:Math.max(0,tier-40);
    if(w>0)pool.push({sword:s,w});
  });
  const total=pool.reduce((a,b)=>a+b.w,0);let r=Math.random()*total;
  for(const{sword,w}of pool){r-=w;if(r<=0)return sword;}return SWORD_SKINS[0];
}

function startBotGame(){
  hide("menu");show("game-screen");
  canvas=document.getElementById("canvas");
  canvas.width=CANVAS_W;canvas.height=CANVAS_H;ctx=canvas.getContext("2d");
  const bs=botStats(),bsw=pickBotSword();
  player={x:180,y:CANVAS_H/2,vx:0,vy:0,hp:MAX_HP,attackTimer:0,iframeTimer:0,angle:0,
    attackAnim:0,attackPhase:null,attackPhaseTimer:0,blocking:false,blockHoldTime:0,
    dashUsed:false,dashTimer:0,dashVx:0,dashVy:0,orbUsed:false,spinUsed:false,spinTimer:0,spinAngle:0,shieldHp:SHIELD_MAX};
  bot={x:CANVAS_W-180,y:CANVAS_H/2,vx:0,vy:0,hp:MAX_HP,attackTimer:0,iframeTimer:0,angle:Math.PI,
    attackAnim:0,attackPhase:null,attackPhaseTimer:0,blocking:false,blockTimer:0,reactionTimer:0,
    stateTimer:0,dashUsed:false,dashTimer:0,dashVx:0,dashVy:0,
    dashCooldown:3000+Math.random()*4000,orbUsed:false,orbCooldown:5000+Math.random()*5000,
    spinUsed:false,spinTimer:0,spinAngle:0,spinCooldown:4000+Math.random()*4000,sword:bsw,stats:bs,shieldHp:SHIELD_MAX};
  particles=[];orbs=[];gameRunning=true;
  updateBotHUD();
  canvas.addEventListener("mousedown",onMouseDown);
  canvas.addEventListener("mousemove",onMouseMove);
  if(animId)cancelAnimationFrame(animId);
  lastTime=performance.now();animId=requestAnimationFrame(botLoop);
}

function stopBotGame(){
  gameRunning=false;if(animId){cancelAnimationFrame(animId);animId=null;}
  if(canvas){canvas.removeEventListener("mousedown",onMouseDown);canvas.removeEventListener("mousemove",onMouseMove);}
  keys={};
}

function restartGame(){
  hide("gameover");
  if(lastGameMode==="bot") startBotGame();
  else findMatch();
}

let lastGameMode="bot";

function botLoop(ts){
  const dt=Math.min(ts-lastTime,50);lastTime=ts;
  if(!gameRunning)return;
  updateBot(dt);renderBot();
  animId=requestAnimationFrame(botLoop);
}

function updateBotHUD(){
  const ph=Math.max(0,player.hp),bh=Math.max(0,bot.hp);
  document.getElementById("player-hp-bar").style.width=(ph/MAX_HP*100)+"%";
  document.getElementById("bot-hp-bar").style.width=(bh/MAX_HP*100)+"%";
  document.getElementById("player-hp-text").textContent=Math.round(ph);
  document.getElementById("bot-hp-text").textContent=Math.round(bh);
  const psb=document.getElementById("player-shield-bar");
  const bsb=document.getElementById("bot-shield-bar");
  if(psb){psb.style.width=(player.shieldHp/SHIELD_MAX*100)+"%";psb.classList.toggle("broken",player.shieldHp<=0);}
  if(bsb){bsb.style.width=(bot.shieldHp/SHIELD_MAX*100)+"%";bsb.classList.toggle("broken",bot.shieldHp<=0);}
  const psi=document.getElementById("player-shield-icon");const bsi=document.getElementById("bot-shield-icon");
  if(psi)psi.textContent=player.shieldHp>0?"🛡":"💔";
  if(bsi)bsi.textContent=bot.shieldHp>0?"🛡":"💔";
  const di=document.getElementById("dash-icon");if(di)di.classList.toggle("used",!!player.dashUsed);
  const oi=document.getElementById("orb-icon");if(oi)oi.classList.toggle("used",!!player.orbUsed);
  const si=document.getElementById("spin-icon");if(si)si.classList.toggle("used",!!player.spinUsed);
}

function updateBot(dt){
  player.blocking=!!keys["KeyF"]&&(player.shieldHp||0)>0;
  if(player.blocking)player.blockHoldTime=(player.blockHoldTime||0)+dt;else player.blockHoldTime=0;
  if(player.dashTimer>0){
    player.dashTimer-=dt;
    player.x=clamp(player.x+player.dashVx,RADIUS,CANVAS_W-RADIUS);
    player.y=clamp(player.y+player.dashVy,RADIUS,CANVAS_H-RADIUS);
    const dd=Math.hypot(bot.x-player.x,bot.y-player.y);
    if(dd<RADIUS*2.2&&bot.iframeTimer<=0){
      bot.hp=Math.max(0,bot.hp-DASH_DMG);bot.iframeTimer=IFRAME_TIME*2;
      const nx=(bot.x-player.x)/dd,ny=(bot.y-player.y)/dd;
      bot.x=clamp(bot.x+nx*20,RADIUS,CANVAS_W-RADIUS);bot.y=clamp(bot.y+ny*20,RADIUS,CANVAS_H-RADIUS);
      player.dashTimer=0;spawnParticles(player.x,player.y,"rgba(80,160,255,0.9)");
      updateBotHUD();if(bot.hp<=0){endBotGame(true);return;}
    }
    if(Math.random()<0.6)particles.push({x:player.x+(Math.random()-.5)*10,y:player.y+(Math.random()-.5)*10,vx:-player.dashVx*.2+(Math.random()-.5),vy:-player.dashVy*.2+(Math.random()-.5),life:1,color:"rgba(100,180,255,0.8)",size:Math.random()*5+2,type:"spark"});
  }else{
    const spd=player.blocking?PLAYER_SPEED*.5:PLAYER_SPEED;
    player.vx=0;player.vy=0;
    if(keys["KeyW"]||keys["ArrowUp"])player.vy=-spd;
    if(keys["KeyS"]||keys["ArrowDown"])player.vy=spd;
    if(keys["KeyA"]||keys["ArrowLeft"])player.vx=-spd;
    if(keys["KeyD"]||keys["ArrowRight"])player.vx=spd;
    player.x=clamp(player.x+player.vx,RADIUS,CANVAS_W-RADIUS);
    player.y=clamp(player.y+player.vy,RADIUS,CANVAS_H-RADIUS);
  }
  if(bot.dashTimer>0){
    bot.dashTimer-=dt;bot.x=clamp(bot.x+bot.dashVx,RADIUS,CANVAS_W-RADIUS);bot.y=clamp(bot.y+bot.dashVy,RADIUS,CANVAS_H-RADIUS);
    const dd=Math.hypot(player.x-bot.x,player.y-bot.y);
    if(dd<RADIUS*2.2&&player.iframeTimer<=0&&!player.blocking){
      player.hp=Math.max(0,player.hp-DASH_DMG);player.iframeTimer=IFRAME_TIME*2;
      const nx=(player.x-bot.x)/dd,ny=(player.y-bot.y)/dd;
      player.x=clamp(player.x+nx*20,RADIUS,CANVAS_W-RADIUS);player.y=clamp(player.y+ny*20,RADIUS,CANVAS_H-RADIUS);
      spawnParticles(bot.x,bot.y,"rgba(255,80,80,0.9)");updateBotHUD();bot.dashTimer=0;
      if(player.hp<=0){endBotGame(false);return;}
    }
  }
  if(player.attackTimer>0)player.attackTimer-=dt;if(player.iframeTimer>0)player.iframeTimer-=dt;
  if(bot.attackTimer>0)bot.attackTimer-=dt;if(bot.iframeTimer>0)bot.iframeTimer-=dt;
  if(bot.blockTimer>0)bot.blockTimer-=dt;if(bot.reactionTimer>0)bot.reactionTimer-=dt;
  if(bot.dashCooldown>0)bot.dashCooldown-=dt;if(bot.orbCooldown>0)bot.orbCooldown-=dt;if(bot.spinCooldown>0)bot.spinCooldown-=dt;
  tickAttackAnim(player,dt);tickAttackAnim(bot,dt);
  if(player.spinTimer>0){
    player.spinTimer-=dt;player.spinAngle=(1-player.spinTimer/SPIN_DUR)*Math.PI*2;
    if(!player._spinHit){const d=Math.hypot(bot.x-player.x,bot.y-player.y);
      if(d<SPIN_RANGE&&bot.iframeTimer<=0&&!bot.blocking){bot.hp=Math.max(0,bot.hp-SPIN_DMG);bot.iframeTimer=IFRAME_TIME*2;player._spinHit=true;spawnParticles(player.x,player.y,"rgba(80,200,255,0.9)");updateBotHUD();if(bot.hp<=0){endBotGame(true);return;}}}
    if(player.spinTimer<=0){player.spinTimer=0;player.spinAngle=0;player._spinHit=false;}
  }
  if(bot.spinTimer>0){
    bot.spinTimer-=dt;bot.spinAngle=(1-bot.spinTimer/SPIN_DUR)*Math.PI*2;
    if(!bot._spinHit){const d=Math.hypot(player.x-bot.x,player.y-bot.y);
      if(d<SPIN_RANGE&&player.iframeTimer<=0&&!player.blocking){player.hp=Math.max(0,player.hp-SPIN_DMG);player.iframeTimer=IFRAME_TIME*2;bot._spinHit=true;spawnParticles(bot.x,bot.y,"rgba(255,80,80,0.9)");updateBotHUD();if(player.hp<=0){endBotGame(false);return;}}}
    if(bot.spinTimer<=0){bot.spinTimer=0;bot.spinAngle=0;bot._spinHit=false;}
  }
  updateOrbsBot(dt);updateBotAI(dt);separateCircles(player,bot);updateBotHUD();
}

function updateOrbsBot(dt){
  for(let i=orbs.length-1;i>=0;i--){
    const o=orbs[i],target=o.fromPlayer?bot:player;
    const dx=target.x-o.x,dy=target.y-o.y,dist=Math.hypot(dx,dy)||1;
    o.vx+=(dx/dist)*ORB_HOMING;o.vy+=(dy/dist)*ORB_HOMING;
    const spd=Math.hypot(o.vx,o.vy);if(spd>ORB_SPEED*1.5){o.vx=o.vx/spd*ORB_SPEED*1.5;o.vy=o.vy/spd*ORB_SPEED*1.5;}
    o.trail.push({x:o.x,y:o.y});if(o.trail.length>18)o.trail.shift();
    o.x+=o.vx;o.y+=o.vy;
    if(o.x<0||o.x>CANVAS_W||o.y<0||o.y>CANVAS_H){orbs.splice(i,1);continue;}
    const hitDist=Math.hypot(target.x-o.x,target.y-o.y);
    if(hitDist<RADIUS+ORB_RADIUS&&target.iframeTimer<=0&&!target.blocking){
      target.hp=Math.max(0,target.hp-ORB_DMG);target.iframeTimer=IFRAME_TIME;
      spawnParticles(o.x,o.y,o.fromPlayer?"rgba(80,160,255,0.9)":"rgba(255,80,80,0.9)");
      orbs.splice(i,1);updateBotHUD();
      if(target.hp<=0){endBotGame(o.fromPlayer);return;}
    }
  }
}

function updateBotAI(dt){
  const dx=player.x-bot.x,dy=player.y-bot.y,dist=Math.hypot(dx,dy),bs=bot.stats;
  bot.angle=Math.atan2(dy,dx);bot.stateTimer-=dt;
  const dashDist=ATTACK_RANGE*(1.5+(1-bs.dashChance)*1.5);
  if(!bot.dashUsed&&bot.dashCooldown<=0&&dist<dashDist&&bot.dashTimer<=0){
    bot.dashUsed=true;bot.dashTimer=DASH_DUR;const nx=dx/dist,ny=dy/dist;
    bot.dashVx=nx*DASH_SPEED;bot.dashVy=ny*DASH_SPEED;spawnParticles(bot.x,bot.y,"rgba(255,80,80,0.9)");return;
  }
  if(bot.dashTimer>0)return;
  if(!bot.orbUsed&&bot.orbCooldown<=0){bot.orbUsed=true;orbs.push({x:bot.x,y:bot.y,vx:-(dx/dist)*ORB_SPEED,vy:-(dy/dist)*ORB_SPEED,fromPlayer:false,hue:0,trail:[]});}
  if(!bot.spinUsed&&bot.spinCooldown<=0&&dist<SPIN_RANGE+20){bot.spinUsed=true;bot.spinTimer=SPIN_DUR;bot._spinHit=false;}
  if(player.attackPhase==="swing"&&bot.blockTimer<=0&&bot.reactionTimer<=0){if(Math.random()<bs.blockChance)bot.blockTimer=bs.blockDuration;bot.reactionTimer=bs.reactionTime;}
  bot.blocking=bot.blockTimer>0;
  const spd=bot.blocking?bs.speed*.3:bs.speed,lowHp=bs.retreatHp>0&&bot.hp<MAX_HP*bs.retreatHp,justHit=bot.iframeTimer>0,canAttack=bot.attackTimer<=0&&!bot.blocking,turtling=player.blockHoldTime>bs.turtlePatience;
  if(lowHp&&dist<bs.aggroDist)botMv(-dx,-dy,dist,spd);
  else if(justHit)botMv(-dx,-dy,dist,spd*1.8);
  else if(turtling){if(dist<ATTACK_RANGE*1.8)botMv(-dx,-dy,dist,spd*.6);else{if(bot.stateTimer<=0)bot.stateTimer=400+Math.random()*400;const side=bot.stateTimer>200?1:-1;bot.x=clamp(bot.x+(-dy/dist)*spd*side*bs.strafeSpeed,RADIUS,CANVAS_W-RADIUS);bot.y=clamp(bot.y+(dx/dist)*spd*side*bs.strafeSpeed,RADIUS,CANVAS_H-RADIUS);}}
  else if(canAttack&&dist<=ATTACK_RANGE)doBotAIAttack();
  else if(canAttack)botMv(dx,dy,dist,spd);
  else{if(bot.stateTimer<=0)bot.stateTimer=Math.max(200,600-ratingBot*.3)+Math.random()*400;const side=1;const kd=dist>ATTACK_RANGE+15?spd*.5:dist<ATTACK_RANGE-15?-spd*.5:0;let mx=(-dy/dist)*spd*side*bs.strafeSpeed+(dx/dist)*kd,my=(dx/dist)*spd*side*bs.strafeSpeed+(dy/dist)*kd;const m=80,wf=spd*1.5;if(bot.x<m)mx+=wf*(1-bot.x/m);if(bot.x>CANVAS_W-m)mx-=wf*(1-(CANVAS_W-bot.x)/m);if(bot.y<m)my+=wf*(1-bot.y/m);if(bot.y>CANVAS_H-m)my-=wf*(1-(CANVAS_H-bot.y)/m);bot.x=clamp(bot.x+mx,RADIUS,CANVAS_W-RADIUS);bot.y=clamp(bot.y+my,RADIUS,CANVAS_H-RADIUS);}
}
function botMv(dx,dy,dist,spd){if(!dist)return;let mx=(dx/dist)*spd,my=(dy/dist)*spd;const m=80,wf=spd*1.2;if(bot.x<m)mx+=wf*(1-bot.x/m);if(bot.x>CANVAS_W-m)mx-=wf*(1-(CANVAS_W-bot.x)/m);if(bot.y<m)my+=wf*(1-bot.y/m);if(bot.y>CANVAS_H-m)my-=wf*(1-(CANVAS_H-bot.y)/m);bot.x=clamp(bot.x+mx,RADIUS,CANVAS_W-RADIUS);bot.y=clamp(bot.y+my,RADIUS,CANVAS_H-RADIUS);}
function doBotAIAttack(){
  if(bot.attackTimer>0||bot.blocking)return;
  const bs=bot.stats;bot.attackTimer=bs.attackCd;bot.attackAnim=1;bot.attackPhase="windup";bot.attackPhaseTimer=120;
  if(player.iframeTimer>0)return;
  const dx=player.x-bot.x,dy=player.y-bot.y,dist=Math.hypot(dx,dy);if(dist>ATTACK_RANGE)return;
  if(player.blocking&&(player.shieldHp||0)>0){const a=Math.atan2(bot.y-player.y,bot.x-player.x);if(Math.abs(normalizeAngle(player.angle-a))<Math.PI/1.8){player.shieldHp--;playSound(player.shieldHp<=0?"shieldBreak":"block");updateBotHUD();return;}}
  player.hp=Math.max(0,player.hp-bs.damage);player.iframeTimer=IFRAME_TIME;
  player.x=clamp(player.x+(dx/dist)*KNOCKBACK,RADIUS,CANVAS_W-RADIUS);player.y=clamp(player.y+(dy/dist)*KNOCKBACK,RADIUS,CANVAS_H-RADIUS);
  playSound("hit");
  updateBotHUD();if(player.hp<=0)endBotGame(false);
}

function endBotGame(won){
  gameRunning=false;cancelAnimationFrame(animId);lastGameMode="bot";
  if(won)ratingBot=Math.min(ratingBot+RATING_PER_WIN,MAX_RATING);
  else ratingBot=Math.max(ratingBot-RATING_PER_WIN,0);
  saveAll();hide("game-screen");show("gameover");
  document.getElementById("gameover-text").textContent=won?"Вы победили!":"Вы проиграли!";
  document.getElementById("gameover-rating").textContent="🤖 MMR: "+ratingBot;
  playSound(won?"win":"lose");
  document.getElementById("gameover-again").onclick=()=>{hide("gameover");startBotGame();};
}

// ======== ONLINE GAME ========
const socket=io();
let roomId=null,mySide=null,onlineRunning=false,onlineCanvas,onlineCtx;
let localState=null,onlineParticles=[];
let myDashUsed=false,myOrbUsed=false,mySpinUsed=false,myAngle=0;
let searchInterval=null,searchSeconds=0;
let opponentNickname="Соперник";

// Буфер состояний соперника для интерполяции
const OPP_BUFFER_DELAY = 60; // мс задержки рендера соперника
let oppBuffer = []; // [{time, state}]
let oppRendered = null; // текущее интерполированное состояние соперника

// FPS / Ping
let showFps=localStorage.getItem("cf_showfps")==="1";
let fpsFrames=0,fpsLast=performance.now(),currentFps=0,currentPing=0,pingStart=0;

function toggleFpsDisplay(){
  showFps=!showFps;
  localStorage.setItem("cf_showfps",showFps?"1":"0");
  document.getElementById("show-fps-btn").textContent=showFps?"Вкл":"Выкл";
  const ov=document.getElementById("fps-overlay");
  if(ov)ov.style.display=showFps&&onlineRunning?"block":"none";
}

setInterval(()=>{
  if(!onlineRunning)return;
  pingStart=performance.now();
  socket.emit("ping_check");
},2000);
socket.on("pong_check",()=>{
  currentPing=Math.round(performance.now()-pingStart);
  const pv=document.getElementById("ping-val");
  if(pv)pv.textContent="Пинг: "+currentPing+"ms";
});

// Локальное предсказание позиции игрока
let localMe=null;

socket.on("connect_error",()=>{document.getElementById("online-msg").style.display="block";document.getElementById("online-msg").textContent="⚠ Нет соединения с сервером";});
socket.on("waiting",()=>startSearchTimer());
socket.on("matchFound",({roomId:rid,side,opponent})=>{
  roomId=rid;mySide=side;
  opponentNickname=opponent?.nickname||"Соперник";
  stopSearchTimer();
  setTimeout(startOnlineGame,800);
});
socket.on("state",(state)=>{
  if(!localState){ localState=state; return; }

  // Плавная интерполяция обоих игроков
  const lerp=(a,b,t)=>a+(b-a)*t;
  for(let i=0;i<2;i++){
    localState.players[i].x=lerp(localState.players[i].x,state.players[i].x,0.35);
    localState.players[i].y=lerp(localState.players[i].y,state.players[i].y,0.35);
    localState.players[i].hp=state.players[i].hp;
    localState.players[i].blocking=state.players[i].blocking;
    localState.players[i].iframeTimer=state.players[i].iframeTimer;
    localState.players[i].attackPhase=state.players[i].attackPhase;
    localState.players[i].attackAnim=state.players[i].attackAnim;
    localState.players[i].spinTimer=state.players[i].spinTimer;
    // Угол — только для соперника с сервера, свой — от мыши
    if(i!==mySide) localState.players[i].angle=state.players[i].angle;
    localState.players[i].swordId=i===mySide?selectedSwordId:(state.players[i].swordId||"default");
  }
  localState.orbs=state.orbs;

  // localMe = просто ссылка на наш слот в localState
  localMe=localState.players[mySide];
});
socket.on("gameOver",({won})=>{
  onlineRunning=false;stopOnlineGame();lastGameMode="online";
  if(won)ratingOnline=Math.min(ratingOnline+RATING_PER_WIN,MAX_RATING);
  else ratingOnline=Math.max(ratingOnline-RATING_PER_WIN,0);
  saveAll();hide("online-screen");show("gameover");
  document.getElementById("gameover-text").textContent=won?"Вы победили!":"Вы проиграли!";
  document.getElementById("gameover-rating").textContent="🌐 MMR: "+ratingOnline;
  document.getElementById("gameover-again").onclick=()=>{hide("gameover");findMatch();};
});
socket.on("opponentLeft",()=>{
  onlineRunning=false;stopOnlineGame();
  ratingOnline=Math.min(ratingOnline+RATING_PER_WIN,MAX_RATING);saveAll();
  hide("online-screen");show("gameover");
  document.getElementById("gameover-text").textContent="Соперник вышел. Победа!";
  document.getElementById("gameover-rating").textContent="🌐 MMR: "+ratingOnline;
  document.getElementById("gameover-again").onclick=()=>{hide("gameover");findMatch();};
});

function startSearchTimer(){
  clearInterval(searchInterval); // убиваем старый если был
  searchSeconds=0;document.getElementById("search-bar").classList.add("visible");
  searchInterval=setInterval(()=>{searchSeconds++;const m=Math.floor(searchSeconds/60),s=searchSeconds%60;document.getElementById("search-timer").textContent=m+":"+(s<10?"0":"")+s;},1000);
}
function stopSearchTimer(){clearInterval(searchInterval);document.getElementById("search-bar").classList.remove("visible");}

function findMatch(){
  lastGameMode="online";
  hide("gameover");document.getElementById("online-msg").style.display="none";
  myDashUsed=false;myOrbUsed=false;mySpinUsed=false;
  socket.emit("findMatch",{nickname,rating:ratingOnline,swordId:selectedSwordId});
}
function cancelSearch(){stopSearchTimer();socket.emit("cancelSearch");}
function leaveOnlineGame(){onlineRunning=false;stopOnlineGame();hide("online-screen");showMenu();}

function startOnlineGame(){
  hide("menu");hide("gameover");show("online-screen");
  onlineCanvas=document.getElementById("online-canvas");
  onlineCanvas.width=CANVAS_W;onlineCanvas.height=CANVAS_H;onlineCtx=onlineCanvas.getContext("2d");
  onlineParticles=[];myDashUsed=false;myOrbUsed=false;mySpinUsed=false;onlineRunning=true;
  oppBuffer=[];oppRendered=null;localMe=null;
  // Показать FPS оверлей если включён
  const ov=document.getElementById("fps-overlay");
  if(ov)ov.style.display=showFps?"block":"none";
  document.getElementById("show-fps-btn").textContent=showFps?"Вкл":"Выкл";
  // Показать ник соперника
  const bl=document.getElementById("online-bot-label");
  if(bl)bl.textContent=opponentNickname;
  const pl=document.getElementById("online-player-label");
  if(pl)pl.textContent=nickname;
  updateOnlineSkillBar();
  onlineCanvas.addEventListener("mousemove",onOnlineMouseMove);
  onlineCanvas.addEventListener("mousedown",onOnlineMouseDown);
  document.addEventListener("keydown",onOnlineKeyDown);
  document.addEventListener("keyup",onOnlineKeyUp);
  sendOnlineInput();
}
function stopOnlineGame(){
  onlineRunning=false;
  if(onlineCanvas){onlineCanvas.removeEventListener("mousemove",onOnlineMouseMove);onlineCanvas.removeEventListener("mousedown",onOnlineMouseDown);}
  document.removeEventListener("keydown",onOnlineKeyDown);document.removeEventListener("keyup",onOnlineKeyUp);
  onlineKeys={};
}

let onlineKeys={};
function onOnlineKeyDown(e){
  onlineKeys[e.code]=true;
  if(["KeyW","KeyA","KeyS","KeyD","KeyF","KeyQ","KeyE","KeyR"].includes(e.code))e.preventDefault();
  if(!onlineRunning)return;
  if(e.code==="KeyQ")doOnlineAction("dash");
  if(e.code==="KeyE")doOnlineAction("orb");
  if(e.code==="KeyR")doOnlineAction("spin");
}
function onOnlineKeyUp(e){onlineKeys[e.code]=false;}
let lastMouseX=0, lastMouseY=0;

function onOnlineMouseMove(e){
  if(!onlineCanvas)return;
  const r=onlineCanvas.getBoundingClientRect();
  const scaleX=CANVAS_W/r.width, scaleY=CANVAS_H/r.height;
  lastMouseX=(e.clientX-r.left)*scaleX;
  lastMouseY=(e.clientY-r.top)*scaleY;
  const px=localMe?localMe.x:(localState?.players[mySide]?.x||CANVAS_W/2);
  const py=localMe?localMe.y:(localState?.players[mySide]?.y||CANVAS_H/2);
  myAngle=Math.atan2(lastMouseY-py, lastMouseX-px);
  if(localMe)localMe.angle=myAngle;
  socket.emit("action",{roomId,action:{type:"angle",angle:myAngle}});
}

function updateOnlineAngle(){
  if(!localMe||(!lastMouseX&&!lastMouseY))return;
  myAngle=Math.atan2(lastMouseY-localMe.y, lastMouseX-localMe.x);
  localMe.angle=myAngle;
}
function onOnlineMouseDown(e){if(e.button===0)doOnlineAction("attack");}
function doOnlineAction(type){
  if(!onlineRunning)return;
  if(type==="dash"&&myDashUsed)return;
  if(type==="orb"&&myOrbUsed)return;
  if(type==="spin"&&mySpinUsed)return;
  // Нельзя атаковать в блоке
  if(type==="attack"&&localMe?.blocking)return;
  if(type==="dash"){
    myDashUsed=true;
    if(localMe){localMe.dashTimer=DASH_DUR;localMe.dashVx=Math.cos(myAngle)*DASH_SPEED;localMe.dashVy=Math.sin(myAngle)*DASH_SPEED;}
  }
  if(type==="orb") myOrbUsed=true;
  if(type==="spin"){
    mySpinUsed=true;
    if(localMe){localMe.spinTimer=SPIN_DUR;localMe._spinHit=false;}
  }
  if(type==="attack"&&localMe){
    localMe.attackPhase="windup";localMe.attackPhaseTimer=100;localMe.attackAnim=1;
  }
  socket.emit("action",{roomId,action:{type}});
  updateOnlineSkillBar();
}
function updateOnlineSkillBar(){
  document.getElementById("online-dash-icon")?.classList.toggle("used",myDashUsed);
  document.getElementById("online-orb-icon")?.classList.toggle("used",myOrbUsed);
  document.getElementById("online-spin-icon")?.classList.toggle("used",mySpinUsed);
}

let lastFrameTime=performance.now();

function sendOnlineInput(){
  if(!onlineRunning)return;
  const now=performance.now();
  const dt=Math.min(now-lastFrameTime,50);
  lastFrameTime=now;

  const inp={
    up:!!(onlineKeys["KeyW"]||onlineKeys["ArrowUp"]),
    down:!!(onlineKeys["KeyS"]||onlineKeys["ArrowDown"]),
    left:!!(onlineKeys["KeyA"]||onlineKeys["ArrowLeft"]),
    right:!!(onlineKeys["KeyD"]||onlineKeys["ArrowRight"]),
    block:!!onlineKeys["KeyF"],
    angle:myAngle
  };
  socket.emit("input",{roomId,input:inp});

  // Только анимации локально — позиция с сервера
  if(localMe){
    if(lastMouseX||lastMouseY){
      myAngle=Math.atan2(lastMouseY-localMe.y,lastMouseX-localMe.x);
      localMe.angle=myAngle;
    }
    localMe.blocking=inp.block;
    if(localMe.iframeTimer>0)localMe.iframeTimer-=dt;
    tickAttackAnim(localMe,dt);
    if(localMe.spinTimer>0){
      localMe.spinTimer-=dt;
      if(localMe.spinTimer<=0){localMe.spinTimer=0;localMe._spinHit=false;}
    }
  }

  // FPS
  fpsFrames++;
  if(now-fpsLast>=1000){
    currentFps=fpsFrames;fpsFrames=0;fpsLast=now;
    const fv=document.getElementById("fps-val");
    if(fv)fv.textContent="FPS: "+currentFps;
  }

  if(localState&&mySide!==null){
    const opp=getInterpolatedOpp()||localState.players[1-mySide];
    const me=localMe||localState.players[mySide];
    renderOnline(me,opp,localState.orbs);
  }

  requestAnimationFrame(sendOnlineInput);
}

function renderOnline(me, opp, orbs){
  if(!onlineCtx)return;
  onlineCtx.clearRect(0,0,CANVAS_W,CANVAS_H);
  document.getElementById("online-player-hp-bar").style.width=(Math.max(0,me.hp)/MAX_HP*100)+"%";
  document.getElementById("online-bot-hp-bar").style.width=(Math.max(0,opp.hp)/MAX_HP*100)+"%";
  document.getElementById("online-player-hp-text").textContent=Math.round(Math.max(0,me.hp));
  document.getElementById("online-bot-hp-text").textContent=Math.round(Math.max(0,opp.hp));
  // Щит онлайн
  const psb=document.getElementById("online-player-shield-bar");
  const bsb=document.getElementById("online-bot-shield-bar");
  if(psb){const sh=me.shieldHp!=null?me.shieldHp:SHIELD_MAX;psb.style.width=(sh/SHIELD_MAX*100)+"%";psb.classList.toggle("broken",sh<=0);}
  if(bsb){const sh=opp.shieldHp!=null?opp.shieldHp:SHIELD_MAX;bsb.style.width=(sh/SHIELD_MAX*100)+"%";bsb.classList.toggle("broken",sh<=0);}
  updateOnlineParticles();
  (orbs||[]).forEach(o=>{
    const hue=o.owner===mySide?200:0;onlineCtx.save();onlineCtx.shadowColor=`hsl(${hue+20},100%,65%)`;onlineCtx.shadowBlur=20;
    const grad=onlineCtx.createRadialGradient(o.x,o.y,0,o.x,o.y,12);grad.addColorStop(0,`hsl(${hue+60},100%,95%)`);grad.addColorStop(1,`hsl(${hue},100%,40%)`);
    onlineCtx.beginPath();onlineCtx.arc(o.x,o.y,10,0,Math.PI*2);onlineCtx.fillStyle=grad;onlineCtx.fill();onlineCtx.restore();
  });
  drawEntity(onlineCtx,me,"#ffffff",true,me.swordId||selectedSwordId,onlineParticles);
  drawEntity(onlineCtx,opp,"#e74c3c",false,opp.swordId||"default",onlineParticles);
}
function updateOnlineParticles(){
  for(let i=onlineParticles.length-1;i>=0;i--){const p=onlineParticles[i];p.x+=p.vx;p.y+=p.vy;p.life-=0.04;if(p.life<=0){onlineParticles.splice(i,1);continue;}onlineCtx.save();onlineCtx.globalAlpha=p.life*.9;onlineCtx.shadowColor=p.color;onlineCtx.shadowBlur=6;onlineCtx.beginPath();onlineCtx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2);onlineCtx.fillStyle=p.color;onlineCtx.fill();onlineCtx.restore();}
}

function getInterpolatedOpp(){
  if(oppBuffer.length === 0) return oppRendered;
  const renderTime = performance.now() - OPP_BUFFER_DELAY;
  // Найти два соседних состояния для интерполяции
  let before = null, after = null;
  for(let i = 0; i < oppBuffer.length; i++){
    if(oppBuffer[i].time <= renderTime) before = oppBuffer[i];
    else { after = oppBuffer[i]; break; }
  }
  if(!before) return oppBuffer[0].p;
  if(!after)  return before.p;
  // Интерполируем между before и after
  const t = (renderTime - before.time) / (after.time - before.time);
  const lerp = (a,b,t) => a + (b-a)*t;
  const r = Object.assign({}, after.p);
  r.x = lerp(before.p.x, after.p.x, t);
  r.y = lerp(before.p.y, after.p.y, t);
  return r;
}

function renderBot(){
  ctx.clearRect(0,0,CANVAS_W,CANVAS_H);
  updateParticlesDraw(ctx,particles);
  renderOrbsBot();
  drawEntity(ctx,player,currentTheme==="dark"?"#ffffff":"#222",true,selectedSwordId,particles);
  drawEntity(ctx,bot,"#e74c3c",false,bot.sword?.id||"default",particles);
}
function renderOrbsBot(){
  orbs.forEach(o=>{
    ctx.save();ctx.shadowColor=`hsl(${o.hue+20},100%,65%)`;ctx.shadowBlur=28;
    const pulse=1+Math.sin(Date.now()/80)*.15,r=ORB_RADIUS*pulse;
    const glow=ctx.createRadialGradient(o.x,o.y,0,o.x,o.y,r*2.5);glow.addColorStop(0,`hsla(${o.hue},100%,80%,.4)`);glow.addColorStop(1,`hsla(${o.hue},100%,50%,0)`);
    ctx.beginPath();ctx.arc(o.x,o.y,r*2.5,0,Math.PI*2);ctx.fillStyle=glow;ctx.fill();
    const grad=ctx.createRadialGradient(o.x-r*.3,o.y-r*.3,0,o.x,o.y,r);grad.addColorStop(0,`hsl(${o.hue+60},100%,95%)`);grad.addColorStop(1,`hsl(${o.hue},100%,40%)`);
    ctx.beginPath();ctx.arc(o.x,o.y,r,0,Math.PI*2);ctx.fillStyle=grad;ctx.fill();ctx.restore();
  });
}
function updateParticlesDraw(c,arr){
  for(let i=arr.length-1;i>=0;i--){const p=arr[i];p.x+=p.vx;p.y+=p.vy;p.life-=0.04;if(p.life<=0){arr.splice(i,1);continue;}c.save();c.globalAlpha=p.life*.9;c.shadowColor=p.color;c.shadowBlur=6;c.beginPath();c.arc(p.x,p.y,p.size*p.life,0,Math.PI*2);c.fillStyle=p.color;c.fill();c.restore();}
}

function drawEntity(c,entity,color,isMe,swordId,ptcls){
  const{x,y,angle,attackAnim,iframeTimer,blocking,spinTimer}=entity;
  const sword=SWORD_SKINS.find(s=>s.id===swordId)||SWORD_SKINS[0];
  c.save();c.translate(x,y);
  if(iframeTimer>0&&Math.floor(iframeTimer/80)%2===0)c.globalAlpha=0.4;
  if(blocking){c.beginPath();c.arc(0,0,RADIUS+8,0,Math.PI*2);c.fillStyle=isMe?"rgba(80,160,255,0.25)":"rgba(255,80,80,0.25)";c.fill();}
  c.beginPath();c.arc(0,0,RADIUS,0,Math.PI*2);c.fillStyle=color;c.fill();
  c.strokeStyle="rgba(255,255,255,0.15)";c.lineWidth=2;c.stroke();
  if(blocking){c.save();c.rotate(angle);c.beginPath();c.arc(0,0,RADIUS+10,-Math.PI/2.5,Math.PI/2.5);c.strokeStyle=isMe?"#4af":"#f44";c.lineWidth=5;c.stroke();c.restore();}
  if(spinTimer>0){
    const progress=1-spinTimer/SPIN_DUR,spinA=progress*Math.PI*2,gc=isMe?"#4488ff":"#ff4444";
    for(let i=7;i>=1;i--){c.save();c.rotate(angle+spinA-(i/7)*Math.PI*.9);c.globalAlpha=(1-i/7)*.45;c.shadowColor=gc;c.shadowBlur=8;sword.draw(c,RADIUS,SWORD_LEN,null,0,isMe,null);c.restore();}
    c.save();c.rotate(angle+spinA);c.globalAlpha=1;c.shadowColor=gc;c.shadowBlur=20;sword.draw(c,RADIUS,SWORD_LEN,null,0,isMe,null);c.restore();c.globalAlpha=1;
    if(ptcls&&Math.random()<.7){const pa=angle+spinA+(Math.random()-.5)*.8;ptcls.push({x:x+Math.cos(pa)*SPIN_RANGE*.8,y:y+Math.sin(pa)*SPIN_RANGE*.8,vx:Math.cos(pa)*(Math.random()*2+1),vy:Math.sin(pa)*(Math.random()*2+1),life:.9,color:gc,size:Math.random()*4+2,type:"spark"});}
  }else{
    c.save();c.rotate(angle);
    const sw=(entity.attackPhase==="windup"||entity.attackPhase==="swing")?(entity.attackAnim||0)*(Math.PI*.55):0;
    c.rotate(sw);
    if(entity.attackPhase==="swing"&&(entity.attackAnim||0)<.6){c.save();for(let i=6;i>=1;i--){c.save();c.rotate((i/6)*Math.PI*.5*(1-(entity.attackAnim||0)));c.globalAlpha=(1-i/6)*.35;c.beginPath();c.moveTo(RADIUS+4,0);c.lineTo(RADIUS+SWORD_LEN+8,0);c.strokeStyle=isMe?"#66bbff":"#ff6666";c.lineWidth=4;c.lineCap="round";c.stroke();c.restore();}c.restore();}
    const wp=isMe&&ptcls?{push(p){const cos=Math.cos(angle+sw),sin=Math.sin(angle+sw);ptcls.push({x:x+p.x*cos-p.y*sin,y:y+p.x*sin+p.y*cos,vx:p.vx*cos-p.vy*sin,vy:p.vx*sin+p.vy*cos,life:p.life,color:p.color,size:p.size,type:p.type});}}:null;
    sword.draw(c,RADIUS,SWORD_LEN,entity.attackPhase,entity.attackAnim||0,isMe,wp);c.restore();
  }
  c.restore();
}

// ======== SHARED UTILS ========
function tickAttackAnim(e,dt){
  if(!e.attackPhase)return;e.attackPhaseTimer-=dt;
  if(e.attackPhase==="windup"){e.attackAnim=1-Math.max(0,e.attackPhaseTimer)/120;if(e.attackPhaseTimer<=0){e.attackPhase="swing";e.attackPhaseTimer=150;}}
  else if(e.attackPhase==="swing"){const p=1-Math.max(0,e.attackPhaseTimer)/150;e.attackAnim=1-p*1.5;if(e.attackPhaseTimer<=0){e.attackPhase=null;e.attackAnim=0;}}
}
function separateCircles(a,b){const dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy),min=RADIUS*2;if(dist<min&&dist>0){const push=(min-dist)/2;a.x-=(dx/dist)*push;a.y-=(dy/dist)*push;b.x+=(dx/dist)*push;b.y+=(dy/dist)*push;}}
function spawnParticles(x,y,color){for(let i=0;i<10;i++){const a=Math.random()*Math.PI*2,spd=Math.random()*4+1;particles.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:1,color,size:Math.random()*5+2,type:"spark"});}}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function normalizeAngle(a){while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;}

// ======== INPUT (BOT GAME) ========
function onKeyDown(e){
  keys[e.code]=true;
  if(gameRunning&&["KeyW","KeyA","KeyS","KeyD","KeyF","KeyQ","KeyE","KeyR","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code))e.preventDefault();
  if(!gameRunning)return;
  if(e.code==="KeyQ")doBotDash();
  if(e.code==="KeyE")doBotOrb();
  if(e.code==="KeyR")doBotSpin();
}
function onKeyUp(e){keys[e.code]=false;}
function onMouseMove(e){if(!canvas||!player)return;const r=canvas.getBoundingClientRect();player.angle=Math.atan2(e.clientY-r.top-player.y,e.clientX-r.left-player.x);}
function onMouseDown(e){if(e.button===0&&gameRunning&&e.target===canvas)doBotAttack();}

function doBotAttack(){
  if(player.attackTimer>0||player.blocking)return;
  player.attackTimer=ATTACK_CD;player.attackAnim=1;player.attackPhase="windup";player.attackPhaseTimer=100;
  const dx=bot.x-player.x,dy=bot.y-player.y,dist=Math.hypot(dx,dy);
  const angleDiff=Math.abs(normalizeAngle(Math.atan2(dy,dx)-player.angle));
  if(dist>ATTACK_RANGE||angleDiff>=Math.PI/2.5||bot.iframeTimer>0)return;
  if(bot.blocking&&(bot.shieldHp||0)>0){const a=Math.atan2(bot.y-player.y,bot.x-player.x);if(Math.abs(normalizeAngle(bot.angle-a+Math.PI))<Math.PI/2){bot.shieldHp--;playSound(bot.shieldHp<=0?"shieldBreak":"block");updateBotHUD();return;}}
  bot.hp=Math.max(0,bot.hp-ATTACK_DMG);bot.iframeTimer=IFRAME_TIME;
  bot.x=clamp(bot.x+(dx/dist)*KNOCKBACK,RADIUS,CANVAS_W-RADIUS);bot.y=clamp(bot.y+(dy/dist)*KNOCKBACK,RADIUS,CANVAS_H-RADIUS);
  playSound("hit");
  updateBotHUD();if(bot.hp<=0)endBotGame(true);
}
function doBotDash(){if(player.dashUsed||player.dashTimer>0||player.blocking)return;player.dashUsed=true;player.dashTimer=DASH_DUR;player.dashVx=Math.cos(player.angle)*DASH_SPEED;player.dashVy=Math.sin(player.angle)*DASH_SPEED;spawnParticles(player.x,player.y,"rgba(80,160,255,0.9)");playSound("dash");}
function doBotOrb(){if(player.orbUsed)return;player.orbUsed=true;const dx=bot.x-player.x,dy=bot.y-player.y,dist=Math.hypot(dx,dy)||1;orbs.push({x:player.x,y:player.y,vx:(dx/dist)*ORB_SPEED,vy:(dy/dist)*ORB_SPEED,fromPlayer:true,hue:200,trail:[]});playSound("orb");}
function doBotSpin(){if(player.spinUsed||player.spinTimer>0||player.blocking)return;player.spinUsed=true;player.spinTimer=SPIN_DUR;player._spinHit=false;playSound("spin");}

document.addEventListener("keydown",onKeyDown);
document.addEventListener("keyup",onKeyUp);

// ---- MENU BACKGROUND ANIMATION ----
(function initMenuBg(){
  const cv=document.getElementById("menu-bg");
  if(!cv)return;
  const cx=cv.getContext("2d");
  let W,H;
  const pts=[];
  function resize(){W=cv.width=window.innerWidth;H=cv.height=window.innerHeight;}
  resize();window.addEventListener("resize",resize);
  for(let i=0;i<70;i++)pts.push({
    x:Math.random()*window.innerWidth,y:Math.random()*window.innerHeight,
    vx:(Math.random()-.5)*.5,vy:(Math.random()-.5)*.5,
    r:Math.random()*2+.5,
    hue:Math.random()*60+180, // синий-фиолетовый для dark
    alpha:Math.random()*.6+.1,
  });
  function isDark(){return document.body.classList.contains("dark");}
  function draw(){
    cx.clearRect(0,0,W,H);
    const dark=isDark();
    // Линии между точками
    for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){
      const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.hypot(dx,dy);
      if(d<130){
        cx.beginPath();cx.moveTo(pts[i].x,pts[i].y);cx.lineTo(pts[j].x,pts[j].y);
        const a=(1-d/130)*(dark?.18:.12);
        cx.strokeStyle=dark?`rgba(0,220,255,${a})`:`rgba(255,140,0,${a})`;
        cx.lineWidth=1;cx.stroke();
      }
    }
    pts.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0)p.x=W;if(p.x>W)p.x=0;if(p.y<0)p.y=H;if(p.y>H)p.y=0;
      cx.save();
      if(dark){cx.shadowColor=`hsl(${p.hue},100%,70%)`;cx.shadowBlur=8;}
      cx.beginPath();cx.arc(p.x,p.y,p.r,0,Math.PI*2);
      cx.fillStyle=dark?`hsla(${p.hue},90%,70%,${p.alpha})`:`hsla(${30+p.hue*.1},90%,55%,${p.alpha})`;
      cx.fill();cx.restore();
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ---- SOUND ENGINE (Web Audio API) ----
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
function getAudio(){ if(!audioCtx) audioCtx=new AudioCtx(); return audioCtx; }

function playSound(type){
  try{
    const ac=getAudio();
    const o=ac.createOscillator();
    const g=ac.createGain();
    o.connect(g); g.connect(ac.destination);
    const now=ac.currentTime;
    if(type==="hit"){
      o.type="square"; o.frequency.setValueAtTime(180,now); o.frequency.exponentialRampToValueAtTime(80,now+0.1);
      g.gain.setValueAtTime(0.3,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.12);
      o.start(now); o.stop(now+0.12);
    } else if(type==="block"){
      o.type="triangle"; o.frequency.setValueAtTime(400,now); o.frequency.exponentialRampToValueAtTime(200,now+0.08);
      g.gain.setValueAtTime(0.2,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.1);
      o.start(now); o.stop(now+0.1);
    } else if(type==="shieldBreak"){
      o.type="sawtooth"; o.frequency.setValueAtTime(300,now); o.frequency.exponentialRampToValueAtTime(50,now+0.4);
      g.gain.setValueAtTime(0.4,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.4);
      o.start(now); o.stop(now+0.4);
    } else if(type==="dash"){
      o.type="sine"; o.frequency.setValueAtTime(600,now); o.frequency.exponentialRampToValueAtTime(1200,now+0.15);
      g.gain.setValueAtTime(0.25,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.18);
      o.start(now); o.stop(now+0.18);
    } else if(type==="orb"){
      o.type="sine"; o.frequency.setValueAtTime(800,now); o.frequency.exponentialRampToValueAtTime(400,now+0.3);
      g.gain.setValueAtTime(0.2,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.3);
      o.start(now); o.stop(now+0.3);
    } else if(type==="spin"){
      o.type="sawtooth"; o.frequency.setValueAtTime(200,now); o.frequency.linearRampToValueAtTime(800,now+0.5);
      g.gain.setValueAtTime(0.3,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.55);
      o.start(now); o.stop(now+0.55);
    } else if(type==="win"){
      [523,659,784,1047].forEach((f,i)=>{
        const oo=ac.createOscillator(),gg=ac.createGain();
        oo.connect(gg);gg.connect(ac.destination);
        oo.type="sine"; oo.frequency.value=f;
        gg.gain.setValueAtTime(0.3,now+i*0.12); gg.gain.exponentialRampToValueAtTime(0.001,now+i*0.12+0.3);
        oo.start(now+i*0.12); oo.stop(now+i*0.12+0.3);
      });
    } else if(type==="lose"){
      [400,300,200,150].forEach((f,i)=>{
        const oo=ac.createOscillator(),gg=ac.createGain();
        oo.connect(gg);gg.connect(ac.destination);
        oo.type="sawtooth"; oo.frequency.value=f;
        gg.gain.setValueAtTime(0.25,now+i*0.15); gg.gain.exponentialRampToValueAtTime(0.001,now+i*0.15+0.25);
        oo.start(now+i*0.15); oo.stop(now+i*0.15+0.25);
      });
    } else if(type==="click"){
      o.type="sine"; o.frequency.setValueAtTime(1000,now);
      g.gain.setValueAtTime(0.1,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.05);
      o.start(now); o.stop(now+0.05);
    }
  }catch(e){}
}

// Добавляем звук клика на все кнопки
document.addEventListener("click", e=>{
  if(e.target.tagName==="BUTTON") playSound("click");
});
