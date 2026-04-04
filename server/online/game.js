// ---- CIRCLE FIGHT ONLINE CLIENT ----
const CANVAS_W = 760, CANVAS_H = 480;
const RADIUS = 28, SWORD_LEN = 44;
const MAX_HP = 100;
const SPIN_RANGE = (RADIUS + SWORD_LEN + 14) * 1.5;
const SPIN_DUR = 600;
const MAX_RATING = 12500, RATING_PER_WIN = 15;

let rating   = parseInt(localStorage.getItem("cf_rating")  || "0");
let nickname = localStorage.getItem("cf_nickname") || "player";
// selectedSwordId объявлен в swords.js


// ---- INIT UI ----
document.getElementById("nickname-display").textContent = nickname;
document.getElementById("rating-display").textContent   = "Рейтинг: " + rating;

function editNickname() {
  const inp  = document.getElementById("nickname-input");
  const disp = document.getElementById("nickname-display");
  inp.value = nickname;
  disp.style.display = "none";
  inp.style.display  = "block";
  inp.focus(); inp.select();
}
function saveNickname() {
  const val = document.getElementById("nickname-input").value.trim();
  nickname = val || "player";
  localStorage.setItem("cf_nickname", nickname);
  document.getElementById("nickname-input").style.display  = "none";
  document.getElementById("nickname-display").style.display = "";
  document.getElementById("nickname-display").textContent   = nickname;
}

function showMenu() {
  hide("inventory"); hide("game-screen"); hide("gameover");
  show("menu");
}
function showInventory() {
  hide("menu");
  show("inventory");
  buildInventory();
}
function buildInventory() {
  const grid = document.getElementById("sword-grid");
  grid.innerHTML = "";
  SWORD_SKINS.forEach(sword => {
    const unlocked = rating >= sword.unlockRating;
    const selected = sword.id === selectedSwordId;
    const card = document.createElement("div");
    card.className = `sword-card rarity-${sword.rarity}${selected?" selected":""}${!unlocked?" locked":""}`;
    card.onclick = () => {
      if (!unlocked) return;
      selectedSwordId = sword.id;
      localStorage.setItem("cf_sword", sword.id);
      buildInventory();
    };
    const cv = document.createElement("canvas");
    cv.width=140; cv.height=60;
    const cx = cv.getContext("2d");
    cx.save(); cx.translate(20,30);
    sword.draw(cx,10,80,null,0,true,null);
    cx.restore();
    card.appendChild(cv);
    const nm = document.createElement("div"); nm.className="sword-name"; nm.textContent=sword.name; card.appendChild(nm);
    const rr = document.createElement("div"); rr.className="sword-rarity";
    rr.style.color = RARITY_COLOR[sword.rarity]?.startsWith("linear")?"#ff88cc":RARITY_COLOR[sword.rarity];
    rr.textContent=sword.rarity; card.appendChild(rr);
    if (!unlocked) { const lk=document.createElement("div"); lk.className="sword-lock"; lk.textContent=`🔒 ${sword.unlockRating} MMR`; card.appendChild(lk); }
    else if (selected) { const sl=document.createElement("div"); sl.className="sword-lock"; sl.textContent="✓ Выбран"; card.appendChild(sl); }
    grid.appendChild(card);
  });
}

function show(id){document.getElementById(id).classList.remove("hidden");}
function hide(id){document.getElementById(id).classList.add("hidden");}

// ---- SOCKET ----
const socket = io("https://circle-fight-production.up.railway.app");

let roomId=null, mySide=null, gameRunning=false;
let keys={}, canvas, ctx;
let localState=null, particles=[];
let myDashUsed=false, myOrbUsed=false, mySpinUsed=false;
let myAngle=0;

// Search timer
let searchInterval=null, searchSeconds=0;

socket.on("connect", () => console.log("connected to server"));
socket.on("connect_error", (e) => {
  document.getElementById("online-msg").style.display="block";
  document.getElementById("online-msg").textContent="⚠ Нет соединения с сервером";
});

socket.on("waiting", () => {
  startSearchTimer();
});

socket.on("matchFound", ({ roomId: rid, side, opponent }) => {
  roomId=rid; mySide=side;
  stopSearchTimer();
  const el = document.getElementById("opponent-found");
  el.style.display="block";
  el.textContent="Соперник найден: " + (opponent?.nickname||"???") + " (MMR: "+(opponent?.rating||0)+")";
  setTimeout(startOnlineGame, 1200);
});

socket.on("state", (state) => {
  localState=state;
  if (gameRunning) renderState(state);
});

socket.on("opponentAction", ({action}) => {
  if (!localState) return;
  if (action.type==="dash") spawnParticles(localState.players[1-mySide].x, localState.players[1-mySide].y,"rgba(255,100,100,0.8)");
});

socket.on("gameOver", ({won}) => {
  gameRunning=false;
  stopGame();
  if (won) rating=Math.min(rating+RATING_PER_WIN,MAX_RATING);
  else     rating=Math.max(rating-RATING_PER_WIN,0);
  localStorage.setItem("cf_rating",rating);
  hide("game-screen"); show("gameover");
  document.getElementById("gameover-text").textContent    = won?"Вы победили!":"Вы проиграли!";
  document.getElementById("gameover-rating").textContent  = "Рейтинг: "+rating;
  document.getElementById("rating-display").textContent   = "Рейтинг: "+rating;
});

socket.on("opponentLeft", () => {
  gameRunning=false; stopGame();
  rating=Math.min(rating+RATING_PER_WIN,MAX_RATING);
  localStorage.setItem("cf_rating",rating);
  hide("game-screen"); show("gameover");
  document.getElementById("gameover-text").textContent   = "Соперник вышел. Победа!";
  document.getElementById("gameover-rating").textContent = "Рейтинг: "+rating;
  document.getElementById("rating-display").textContent  = "Рейтинг: "+rating;
});

// ---- SEARCH TIMER ----
function startSearchTimer() {
  searchSeconds=0;
  document.getElementById("search-bar").classList.add("visible");
  searchInterval = setInterval(()=>{
    searchSeconds++;
    const m=Math.floor(searchSeconds/60), s=searchSeconds%60;
    document.getElementById("search-timer").textContent = m+":"+(s<10?"0":"")+s;
  },1000);
}
function stopSearchTimer() {
  clearInterval(searchInterval);
  document.getElementById("search-bar").classList.remove("visible");
}

// ---- MATCHMAKING ----
function findMatch() {
  hide("gameover");
  document.getElementById("opponent-found").style.display="none";
  document.getElementById("online-msg").style.display="none";
  myDashUsed=false; myOrbUsed=false; mySpinUsed=false;
  socket.emit("findMatch",{nickname,rating,swordId:selectedSwordId});
}

function cancelSearch() {
  stopSearchTimer();
  socket.emit("cancelSearch");
}

function leaveGame() {
  gameRunning=false; stopGame();
  hide("game-screen"); showMenu();
}

// ---- GAME ----
function startOnlineGame() {
  hide("menu"); hide("gameover");
  show("game-screen");
  canvas=document.getElementById("canvas");
  canvas.width=CANVAS_W; canvas.height=CANVAS_H;
  ctx=canvas.getContext("2d");
  particles=[]; myDashUsed=false; myOrbUsed=false; mySpinUsed=false;
  gameRunning=true;
  updateSkillBar();
  canvas.addEventListener("mousemove",onMouseMove);
  canvas.addEventListener("mousedown",onMouseDown);
  document.addEventListener("keydown",onKeyDown);
  document.addEventListener("keyup",onKeyUp);
  sendInputLoop();
}

function stopGame() {
  if (canvas) {
    canvas.removeEventListener("mousemove",onMouseMove);
    canvas.removeEventListener("mousedown",onMouseDown);
  }
  document.removeEventListener("keydown",onKeyDown);
  document.removeEventListener("keyup",onKeyUp);
  keys={};
}

function sendInputLoop() {
  if (!gameRunning) return;
  socket.emit("input",{roomId,input:{
    up:   !!(keys["KeyW"]||keys["ArrowUp"]),
    down: !!(keys["KeyS"]||keys["ArrowDown"]),
    left: !!(keys["KeyA"]||keys["ArrowLeft"]),
    right:!!(keys["KeyD"]||keys["ArrowRight"]),
    block:!!keys["KeyF"],
    angle:myAngle,
  }});
  requestAnimationFrame(sendInputLoop);
}

// ---- INPUT ----
function onKeyDown(e) {
  keys[e.code]=true;
  if (["KeyW","KeyA","KeyS","KeyD","KeyF","KeyQ","KeyE","KeyR"].includes(e.code)) e.preventDefault();
  if (!gameRunning) return;
  if (e.code==="KeyQ") doAction("dash");
  if (e.code==="KeyE") doAction("orb");
  if (e.code==="KeyR") doAction("spin");
}
function onKeyUp(e){keys[e.code]=false;}
function onMouseMove(e) {
  if (!canvas||!localState) return;
  const r=canvas.getBoundingClientRect();
  const me=localState.players[mySide];
  myAngle=Math.atan2(e.clientY-r.top-me.y, e.clientX-r.left-me.x);
  socket.emit("action",{roomId,action:{type:"angle",angle:myAngle}});
}
function onMouseDown(e){if(e.button===0)doAction("attack");}

function doAction(type) {
  if (!gameRunning) return;
  if (type==="dash"&&myDashUsed) return;
  if (type==="orb" &&myOrbUsed)  return;
  if (type==="spin"&&mySpinUsed) return;
  if (type==="dash") myDashUsed=true;
  if (type==="orb")  myOrbUsed=true;
  if (type==="spin") mySpinUsed=true;
  socket.emit("action",{roomId,action:{type}});
  updateSkillBar();
}
function updateSkillBar() {
  document.getElementById("dash-icon") .classList.toggle("used",myDashUsed);
  document.getElementById("orb-icon")  .classList.toggle("used",myOrbUsed);
  document.getElementById("spin-icon") .classList.toggle("used",mySpinUsed);
}

// ---- RENDER ----
function renderState(state) {
  if (!ctx) return;
  ctx.clearRect(0,0,CANVAS_W,CANVAS_H);
  const me  = state.players[mySide];
  const opp = state.players[1-mySide];

  document.getElementById("player-hp-bar").style.width=(Math.max(0,me.hp)/MAX_HP*100)+"%";
  document.getElementById("bot-hp-bar")   .style.width=(Math.max(0,opp.hp)/MAX_HP*100)+"%";
  document.getElementById("player-hp-text").textContent=Math.round(Math.max(0,me.hp));
  document.getElementById("bot-hp-text")   .textContent=Math.round(Math.max(0,opp.hp));

  updateParticlesDraw();
  renderOrbsState(state.orbs||[]);
  drawCircle(me,  "#ffffff", true,  me.swordId  ||selectedSwordId);
  drawCircle(opp, "#e74c3c", false, opp.swordId ||"default");
}

function renderOrbsState(orbList) {
  orbList.forEach(o=>{
    const hue=o.owner===mySide?200:0;
    ctx.save();
    ctx.shadowColor=`hsl(${hue+20},100%,65%)`; ctx.shadowBlur=20;
    const grad=ctx.createRadialGradient(o.x,o.y,0,o.x,o.y,12);
    grad.addColorStop(0,`hsl(${hue+60},100%,95%)`);
    grad.addColorStop(1,`hsl(${hue},100%,40%)`);
    ctx.beginPath(); ctx.arc(o.x,o.y,10,0,Math.PI*2);
    ctx.fillStyle=grad; ctx.fill(); ctx.restore();
  });
}

function drawCircle(entity, color, isMe, swordId) {
  const {x,y,angle,attackAnim,iframeTimer,blocking,spinTimer} = entity;
  const sword = SWORD_SKINS.find(s=>s.id===swordId)||SWORD_SKINS[0];
  ctx.save();
  ctx.translate(x,y);
  if (iframeTimer>0&&Math.floor(iframeTimer/80)%2===0) ctx.globalAlpha=0.4;

  if (blocking) {
    ctx.beginPath(); ctx.arc(0,0,RADIUS+8,0,Math.PI*2);
    ctx.fillStyle=isMe?"rgba(80,160,255,0.25)":"rgba(255,80,80,0.25)"; ctx.fill();
  }
  ctx.beginPath(); ctx.arc(0,0,RADIUS,0,Math.PI*2);
  ctx.fillStyle=color; ctx.fill();
  ctx.strokeStyle="rgba(255,255,255,0.15)"; ctx.lineWidth=2; ctx.stroke();

  if (blocking) {
    ctx.save(); ctx.rotate(angle);
    ctx.beginPath(); ctx.arc(0,0,RADIUS+10,-Math.PI/2.5,Math.PI/2.5);
    ctx.strokeStyle=isMe?"#4af":"#f44"; ctx.lineWidth=5; ctx.stroke(); ctx.restore();
  }

  if (spinTimer>0) {
    const progress=1-spinTimer/SPIN_DUR, spinA=progress*Math.PI*2;
    const gc=isMe?"#4488ff":"#ff4444";
    for(let i=7;i>=1;i--){
      ctx.save(); ctx.rotate(angle+spinA-(i/7)*Math.PI*0.9);
      ctx.globalAlpha=(1-i/7)*0.45; ctx.shadowColor=gc; ctx.shadowBlur=8;
      sword.draw(ctx,RADIUS,SWORD_LEN,null,0,isMe,null); ctx.restore();
    }
    ctx.save(); ctx.rotate(angle+spinA); ctx.globalAlpha=1;
    ctx.shadowColor=gc; ctx.shadowBlur=20;
    sword.draw(ctx,RADIUS,SWORD_LEN,null,0,isMe,null); ctx.restore();
    ctx.globalAlpha=1;
  } else {
    ctx.save(); ctx.rotate(angle);
    const sw=(entity.attackPhase==="windup"||entity.attackPhase==="swing")?(entity.attackAnim||0)*(Math.PI*0.55):0;
    ctx.rotate(sw);
    sword.draw(ctx,RADIUS,SWORD_LEN,entity.attackPhase,entity.attackAnim||0,isMe,null);
    ctx.restore();
  }
  ctx.restore();
}

// ---- PARTICLES ----
function spawnParticles(x,y,color){
  for(let i=0;i<8;i++){
    const a=Math.random()*Math.PI*2,spd=Math.random()*4+1;
    particles.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:1,color,size:Math.random()*4+2});
  }
}
function updateParticlesDraw(){
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i]; p.x+=p.vx; p.y+=p.vy; p.life-=0.04;
    if(p.life<=0){particles.splice(i,1);continue;}
    ctx.save(); ctx.globalAlpha=p.life*0.9;
    ctx.shadowColor=p.color; ctx.shadowBlur=6;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2);
    ctx.fillStyle=p.color; ctx.fill(); ctx.restore();
  }
}
