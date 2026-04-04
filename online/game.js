// ---- ONLINE GAME CLIENT ----
const CANVAS_W = 760, CANVAS_H = 480;
const RADIUS = 28, SWORD_LEN = 44, SWORD_W = 6;
const MAX_HP = 100;
const ATTACK_RANGE = RADIUS*2 + SWORD_LEN + 10;
const SPIN_RANGE = (RADIUS + SWORD_LEN + 14) * 1.5;
const SPIN_DUR = 600;

let rating   = parseInt(localStorage.getItem("cf_rating")  || "0");
let nickname = localStorage.getItem("cf_nickname") || "player";
let selectedSwordId = localStorage.getItem("cf_sword") || "default";
const MAX_RATING = 12500, RATING_PER_WIN = 15;

// ---- NICKNAME ----
document.getElementById("nickname-display").textContent = nickname;
document.getElementById("rating-display").textContent = "Рейтинг: " + rating;

function editNickname() {
  const inp = document.getElementById("nickname-input");
  inp.value = nickname;
  document.getElementById("nickname-display").style.display = "none";
  inp.style.display = "block"; inp.focus(); inp.select();
}
function saveNickname() {
  const val = document.getElementById("nickname-input").value.trim();
  nickname = val || "player";
  localStorage.setItem("cf_nickname", nickname);
  document.getElementById("nickname-input").style.display = "none";
  document.getElementById("nickname-display").style.display = "";
  document.getElementById("nickname-display").textContent = nickname;
}

// ---- SOCKET ----
const socket = io("https://circle-fight-production.up.railway.app");
let roomId = null, mySide = null;
let gameRunning = false;
let keys = {};
let canvas, ctx;
let localState = null; // last state from server
let particles = [], orbs = [];
let myDashUsed = false, myOrbUsed = false, mySpinUsed = false;
let myAngle = 0;

socket.on("waiting", () => {
  setStatus("Ищем соперника...", true);
});

socket.on("matchFound", ({ roomId: rid, side, opponent }) => {
  roomId = rid; mySide = side;
  setStatus("Соперник найден: " + (opponent?.nickname || "???"), false);
  document.getElementById("opponent-info").textContent =
    "MMR соперника: " + (opponent?.rating || 0);
  setTimeout(startOnlineGame, 1000);
});

socket.on("state", (state) => {
  localState = state;
  if (gameRunning) renderState(state);
});

socket.on("opponentAction", ({ action }) => {
  // Visual feedback for opponent actions
  if (action.type === "dash" && localState) {
    spawnParticles(localState.players[1-mySide].x, localState.players[1-mySide].y, "rgba(255,100,100,0.8)");
  }
});

socket.on("gameOver", ({ won, state }) => {
  gameRunning = false;
  if (won) {
    rating = Math.min(rating + RATING_PER_WIN, MAX_RATING);
  } else {
    rating = Math.max(rating - RATING_PER_WIN, 0);
  }
  localStorage.setItem("cf_rating", rating);
  hide("game-screen");
  show("gameover");
  document.getElementById("gameover-text").textContent = won ? "Вы победили!" : "Вы проиграли!";
  document.getElementById("gameover-rating").textContent = "Рейтинг: " + rating;
});

socket.on("opponentLeft", () => {
  gameRunning = false;
  hide("game-screen");
  show("gameover");
  document.getElementById("gameover-text").textContent = "Соперник вышел. Победа!";
  rating = Math.min(rating + RATING_PER_WIN, MAX_RATING);
  localStorage.setItem("cf_rating", rating);
  document.getElementById("gameover-rating").textContent = "Рейтинг: " + rating;
});

// ---- FIND MATCH ----
function findMatch() {
  hide("gameover"); hide("game-screen");
  show("lobby");
  myDashUsed = false; myOrbUsed = false; mySpinUsed = false;
  setStatus("Подключаемся...", false);
  socket.emit("findMatch", { nickname, rating, swordId: selectedSwordId });
}

function leaveGame() {
  gameRunning = false;
  socket.emit("cancelSearch");
  hide("game-screen");
  show("lobby");
  setStatus("", false);
}

function setStatus(msg, spinner) {
  document.getElementById("status").textContent = msg;
  document.getElementById("spinner").style.display = spinner ? "block" : "none";
}

// ---- START GAME ----
function startOnlineGame() {
  hide("lobby");
  show("game-screen");
  canvas = document.getElementById("canvas");
  canvas.width = CANVAS_W; canvas.height = CANVAS_H;
  ctx = canvas.getContext("2d");
  particles = []; orbs = [];
  myDashUsed = false; myOrbUsed = false; mySpinUsed = false;
  gameRunning = true;

  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mousedown", onMouseDown);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup",   onKeyUp);

  sendInputLoop();
}

// Send input to server at 60fps
function sendInputLoop() {
  if (!gameRunning) return;
  socket.emit("input", {
    roomId,
    input: {
      up:    keys["KeyW"] || keys["ArrowUp"],
      down:  keys["KeyS"] || keys["ArrowDown"],
      left:  keys["KeyA"] || keys["ArrowLeft"],
      right: keys["KeyD"] || keys["ArrowRight"],
      block: keys["KeyF"],
      angle: myAngle,
    }
  });
  requestAnimationFrame(sendInputLoop);
}

// ---- INPUT ----
function onKeyDown(e) {
  keys[e.code] = true;
  if (["KeyW","KeyA","KeyS","KeyD","KeyF","KeyQ","KeyE","KeyR"].includes(e.code)) e.preventDefault();
  if (!gameRunning) return;
  if (e.code === "KeyQ") doAction("dash");
  if (e.code === "KeyE") doAction("orb");
  if (e.code === "KeyR") doAction("spin");
}
function onKeyUp(e) { keys[e.code] = false; }
function onMouseMove(e) {
  if (!canvas) return;
  const r = canvas.getBoundingClientRect();
  if (!localState) return;
  const me = localState.players[mySide];
  myAngle = Math.atan2(e.clientY - r.top - me.y, e.clientX - r.left - me.x);
  socket.emit("action", { roomId, action: { type: "angle", angle: myAngle } });
}
function onMouseDown(e) {
  if (e.button === 0) doAction("attack");
}

function doAction(type) {
  if (!gameRunning) return;
  if (type === "dash"  && myDashUsed)  return;
  if (type === "orb"   && myOrbUsed)   return;
  if (type === "spin"  && mySpinUsed)  return;
  if (type === "dash")  myDashUsed  = true;
  if (type === "orb")   myOrbUsed   = true;
  if (type === "spin")  mySpinUsed  = true;
  socket.emit("action", { roomId, action: { type } });
  updateSkillBar();
}

function updateSkillBar() {
  document.getElementById("dash-icon") .classList.toggle("used", myDashUsed);
  document.getElementById("orb-icon")  .classList.toggle("used", myOrbUsed);
  document.getElementById("spin-icon") .classList.toggle("used", mySpinUsed);
}

// ---- RENDER ----
function renderState(state) {
  if (!ctx) return;
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  const me  = state.players[mySide];
  const opp = state.players[1 - mySide];

  // Update HUD
  document.getElementById("player-hp-bar").style.width = (Math.max(0,me.hp)/MAX_HP*100)+"%";
  document.getElementById("bot-hp-bar")   .style.width = (Math.max(0,opp.hp)/MAX_HP*100)+"%";
  document.getElementById("player-hp-text").textContent = Math.round(Math.max(0,me.hp));
  document.getElementById("bot-hp-text")   .textContent = Math.round(Math.max(0,opp.hp));

  // Particles
  updateParticlesDraw();

  // Orbs
  renderOrbsState(state.orbs || []);

  // Draw players
  const isDark = true;
  drawCircle(me,  isDark ? "#ffffff" : "#222", isDark, true,  me.swordId  || selectedSwordId);
  drawCircle(opp, "#e74c3c",                   isDark, false, opp.swordId || "default");
}

function renderOrbsState(orbList) {
  orbList.forEach(o => {
    ctx.save();
    ctx.shadowColor = o.owner === mySide ? "#4488ff" : "#ff4444";
    ctx.shadowBlur = 20;
    const hue = o.owner === mySide ? 200 : 0;
    const grad = ctx.createRadialGradient(o.x,o.y,0,o.x,o.y,12);
    grad.addColorStop(0, `hsl(${hue+60},100%,95%)`);
    grad.addColorStop(1, `hsl(${hue},100%,40%)`);
    ctx.beginPath(); ctx.arc(o.x,o.y,10,0,Math.PI*2);
    ctx.fillStyle = grad; ctx.fill();
    ctx.restore();
  });
}

function drawCircle(entity, color, isDark, isMe, swordId) {
  const { x, y, angle, attackAnim, iframeTimer, blocking, spinTimer } = entity;
  const sword = SWORD_SKINS.find(s => s.id === swordId) || SWORD_SKINS[0];

  ctx.save();
  ctx.translate(x, y);
  if (iframeTimer > 0 && Math.floor(iframeTimer/80)%2===0) ctx.globalAlpha = 0.4;

  if (blocking) {
    ctx.beginPath(); ctx.arc(0,0,RADIUS+8,0,Math.PI*2);
    ctx.fillStyle = isMe ? "rgba(80,160,255,0.25)" : "rgba(255,80,80,0.25)"; ctx.fill();
  }

  ctx.beginPath(); ctx.arc(0,0,RADIUS,0,Math.PI*2);
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth=2; ctx.stroke();

  if (blocking) {
    ctx.save(); ctx.rotate(angle);
    ctx.beginPath(); ctx.arc(0,0,RADIUS+10,-Math.PI/2.5,Math.PI/2.5);
    ctx.strokeStyle = isMe ? "#4af" : "#f44"; ctx.lineWidth=5; ctx.stroke();
    ctx.restore();
  }

  // Spin effect
  if (spinTimer > 0) {
    const progress = 1 - spinTimer/SPIN_DUR;
    const spinA = progress * Math.PI * 2;
    const gc = isMe ? "#4488ff" : "#ff4444";
    for (let i=7;i>=1;i--) {
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
    const swingAngle = (entity.attackPhase==="windup"||entity.attackPhase==="swing")
      ? (entity.attackAnim||0)*(Math.PI*0.55) : 0;
    ctx.rotate(swingAngle);
    sword.draw(ctx,RADIUS,SWORD_LEN,entity.attackPhase,entity.attackAnim||0,isMe,null);
    ctx.restore();
  }

  ctx.restore();
}

// ---- PARTICLES ----
function spawnParticles(x, y, color) {
  for (let i=0;i<8;i++) {
    const a=Math.random()*Math.PI*2, spd=Math.random()*4+1;
    particles.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:1,color,size:Math.random()*4+2});
  }
}
function updateParticlesDraw() {
  for (let i=particles.length-1;i>=0;i--) {
    const p=particles[i]; p.x+=p.vx; p.y+=p.vy; p.life-=0.04;
    if (p.life<=0){particles.splice(i,1);continue;}
    ctx.save(); ctx.globalAlpha=p.life*0.9;
    ctx.shadowColor=p.color; ctx.shadowBlur=6;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2);
    ctx.fillStyle=p.color; ctx.fill(); ctx.restore();
  }
}

// ---- UTILS ----
function show(id){document.getElementById(id).classList.remove("hidden");}
function hide(id){document.getElementById(id).classList.add("hidden");}
