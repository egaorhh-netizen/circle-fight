const http    = require("http");
const fs      = require("fs");
const path    = require("path");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;
const ONLINE_DIR = path.join(__dirname, "online");

// ---- Static file server ----
const MIME = {
  ".html": "text/html",
  ".js":   "application/javascript",
  ".css":  "text/css",
};

const httpServer = http.createServer((req, res) => {
  let filePath = path.join(ONLINE_DIR, req.url === "/" ? "index.html" : req.url);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[ext] || "text/plain" });
    res.end(data);
  });
});

const io = new Server(httpServer, {
  cors: { origin: "*" }
});

// ---- Matchmaking ----
let waitingPlayer = null; // socket waiting for opponent

// ---- Game rooms ----
// roomId -> { players: [socketA, socketB], state: {...} }
const rooms = {};

const TICK = 16; // ~60fps

io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  // Player wants to find a match
  socket.on("findMatch", (data) => {
    socket.playerData = data; // { nickname, rating, swordId }

    if (waitingPlayer && waitingPlayer.id !== socket.id) {
      // Start a match
      const roomId = waitingPlayer.id + "_" + socket.id;
      const p1 = waitingPlayer;
      const p2 = socket;
      waitingPlayer = null;

      p1.join(roomId);
      p2.join(roomId);

      rooms[roomId] = {
        players: [p1, p2],
        state: initState(p1.playerData, p2.playerData),
        interval: null,
      };

      p1.emit("matchFound", { roomId, side: 0, opponent: p2.playerData });
      p2.emit("matchFound", { roomId, side: 1, opponent: p1.playerData });

      console.log("match started:", roomId);
    } else {
      waitingPlayer = socket;
      socket.emit("waiting");
    }
  });

  // Player sends their input state every frame
  socket.on("input", ({ roomId, input }) => {
    const room = rooms[roomId];
    if (!room) return;
    const idx = room.players.indexOf(socket);
    if (idx === -1) return;
    room.state.inputs[idx] = input;
  });

  // Player sends an action (attack, dash, orb, spin)
  socket.on("action", ({ roomId, action }) => {
    const room = rooms[roomId];
    if (!room) return;
    const idx = room.players.indexOf(socket);
    if (idx === -1) return;
    // Broadcast action to opponent
    const opponent = room.players[1 - idx];
    opponent.emit("opponentAction", { action });
    // Also process on server state
    processAction(room.state, idx, action);
  });

  socket.on("cancelSearch", () => {
    if (waitingPlayer && waitingPlayer.id === socket.id) waitingPlayer = null;
  });

  socket.on("disconnect", () => {
    console.log("disconnected:", socket.id);
    if (waitingPlayer && waitingPlayer.id === socket.id) waitingPlayer = null;
    // Notify opponent in any room
    for (const [roomId, room] of Object.entries(rooms)) {
      if (room.players.includes(socket)) {
        const opponent = room.players.find(p => p.id !== socket.id);
        if (opponent) opponent.emit("opponentLeft");
        clearInterval(room.interval);
        delete rooms[roomId];
      }
    }
  });
});

// ---- Game state ----
// Серверные константы — должны совпадать с клиентом
const CANVAS_W = 760, CANVAS_H = 480;
const RADIUS = 28, SWORD_LEN = 44;
const ATTACK_RANGE = RADIUS * 2 + SWORD_LEN + 10;
const ATTACK_DMG = 12, DASH_DMG = 20, ORB_DMG = 15, SPIN_DMG = 20;
const KNOCKBACK = 10, IFRAME_TIME = 200;
const MAX_HP = 100;
const PLAYER_SPEED = 3.5;
const DASH_SPEED = 28, DASH_DUR = 200; // дольше и быстрее
const ORB_SPEED = 5.0, ORB_RADIUS = 10, ORB_HOMING = 0.08; // ускорил орб
const SPIN_RANGE = (RADIUS + SWORD_LEN + 14) * 1.5, SPIN_DUR = 600;

function initState(d0, d1) {
  return {
    players: [
      makePlayer(180,          CANVAS_H/2, 0, d0),
      makePlayer(CANVAS_W-180, CANVAS_H/2, Math.PI, d1),
    ],
    orbs: [],
    inputs: [{}, {}],
    tick: 0,
  };
}

function makePlayer(x, y, angle, data) {
  return {
    x, y, vx: 0, vy: 0, angle,
    hp: MAX_HP,
    attackTimer: 0, iframeTimer: 0,
    attackPhase: null, attackPhaseTimer: 0, attackAnim: 0,
    attackPhase: null, attackPhaseTimer: 0, attackAnim: 0,
    blocking: false, blockHoldTime: 0,
    dashUsed: false, dashTimer: 0, dashVx: 0, dashVy: 0,
    orbUsed: false,
    spinUsed: false, spinTimer: 0,
    nickname: data?.nickname || "player",
    swordId: data?.swordId || "default",
    rating: data?.rating || 0,
  };
}

function processAction(state, idx, action) {
  const p = state.players[idx];
  const opp = state.players[1 - idx];

  if (action.type === "attack") {
    if (p.attackTimer > 0 || p.blocking) return;
    p.attackTimer = 600;
    p.attackPhase = 'windup'; p.attackPhaseTimer = 100; p.attackAnim = 1;
    p.attackPhase = "windup"; p.attackPhaseTimer = 100; p.attackAnim = 1;
    const dx = opp.x - p.x, dy = opp.y - p.y;
    const dist = Math.hypot(dx, dy);
    const angleDiff = Math.abs(normalizeAngle(Math.atan2(dy, dx) - p.angle));
    if (dist <= ATTACK_RANGE && angleDiff < Math.PI/2.5 && opp.iframeTimer <= 0 && !opp.blocking) {
      opp.hp = Math.max(0, opp.hp - ATTACK_DMG);
      opp.iframeTimer = IFRAME_TIME;
      opp.x = clamp(opp.x + (dx/dist)*KNOCKBACK, RADIUS, CANVAS_W-RADIUS);
      opp.y = clamp(opp.y + (dy/dist)*KNOCKBACK, RADIUS, CANVAS_H-RADIUS);
    }
  } else if (action.type === "dash") {
    if (p.dashUsed || p.dashTimer > 0 || p.blocking) return;
    p.dashUsed = true; p.dashTimer = DASH_DUR;
    p.dashVx = Math.cos(p.angle) * DASH_SPEED;
    p.dashVy = Math.sin(p.angle) * DASH_SPEED;
  } else if (action.type === "orb") {
    if (p.orbUsed) return;
    p.orbUsed = true;
    const dx = opp.x - p.x, dy = opp.y - p.y;
    const dist = Math.hypot(dx, dy) || 1;
    state.orbs.push({
      x: p.x, y: p.y,
      vx: (dx/dist)*ORB_SPEED, vy: (dy/dist)*ORB_SPEED,
      owner: idx, trail: [],
    });
  } else if (action.type === "spin") {
    if (p.spinUsed || p.spinTimer > 0 || p.blocking) return;
    p.spinUsed = true; p.spinTimer = SPIN_DUR;
  } else if (action.type === "angle") {
    p.angle = action.angle;
  } else if (action.type === "block") {
    p.blocking = action.value;
  }
}

function tickState(state) {
  const dt = TICK;
  const [p0, p1] = state.players;

  // Move players from input
  for (let i = 0; i < 2; i++) {
    const p = state.players[i];
    const inp = state.inputs[i] || {};

    p.blocking = !!inp.block;
    if (p.blocking) p.blockHoldTime += dt; else p.blockHoldTime = 0;

    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      p.x = clamp(p.x + p.dashVx, RADIUS, CANVAS_W-RADIUS);
      p.y = clamp(p.y + p.dashVy, RADIUS, CANVAS_H-RADIUS);
      const opp = state.players[1-i];
      const dd = Math.hypot(opp.x-p.x, opp.y-p.y);
      if (dd < RADIUS*2.2 && opp.iframeTimer <= 0 && !opp.blocking) {
        opp.hp = Math.max(0, opp.hp - DASH_DMG);
        opp.iframeTimer = IFRAME_TIME*2;
        p.dashTimer = 0;
      }
    } else {
      const spd = p.blocking ? PLAYER_SPEED*0.5 : PLAYER_SPEED;
      p.vx = 0; p.vy = 0;
      if (inp.up)    p.vy = -spd;
      if (inp.down)  p.vy =  spd;
      if (inp.left)  p.vx = -spd;
      if (inp.right) p.vx =  spd;
      p.x = clamp(p.x + p.vx, RADIUS, CANVAS_W-RADIUS);
      p.y = clamp(p.y + p.vy, RADIUS, CANVAS_H-RADIUS);
    }

    if (inp.angle !== undefined) p.angle = inp.angle;

    if (p.attackTimer  > 0) p.attackTimer  -= dt;
    if (p.iframeTimer  > 0) p.iframeTimer  -= dt;

    // Attack animation tick
    if (p.attackPhase) {
      p.attackPhaseTimer -= dt;
      if (p.attackPhase === 'windup') {
        p.attackAnim = 1 - Math.max(0, p.attackPhaseTimer) / 120;
        if (p.attackPhaseTimer <= 0) { p.attackPhase = 'swing'; p.attackPhaseTimer = 150; }
      } else if (p.attackPhase === 'swing') {
        p.attackAnim = 1 - (1 - Math.max(0, p.attackPhaseTimer) / 150) * 1.5;
        if (p.attackPhaseTimer <= 0) { p.attackPhase = null; p.attackAnim = 0; }
      }
    }
    if (p.spinTimer    > 0) {
      p.spinTimer -= dt;
      const opp = state.players[1-i];
      const d = Math.hypot(opp.x-p.x, opp.y-p.y);
      if (d < SPIN_RANGE && opp.iframeTimer <= 0 && !opp.blocking && !p._spinHit) {
        opp.hp = Math.max(0, opp.hp - SPIN_DMG);
        opp.iframeTimer = IFRAME_TIME*2;
        p._spinHit = true;
      }
      if (p.spinTimer <= 0) { p.spinTimer = 0; p._spinHit = false; }
    }
  }

  // Orbs
  for (let i = state.orbs.length-1; i >= 0; i--) {
    const o = state.orbs[i];
    const target = state.players[1 - o.owner];
    const dx = target.x-o.x, dy = target.y-o.y;
    const dist = Math.hypot(dx,dy)||1;
    o.vx += (dx/dist)*ORB_HOMING; o.vy += (dy/dist)*ORB_HOMING;
    const spd = Math.hypot(o.vx,o.vy);
    if (spd > ORB_SPEED*1.5) { o.vx=o.vx/spd*ORB_SPEED*1.5; o.vy=o.vy/spd*ORB_SPEED*1.5; }
    o.x += o.vx; o.y += o.vy;
    if (o.x<0||o.x>CANVAS_W||o.y<0||o.y>CANVAS_H) { state.orbs.splice(i,1); continue; }
    const hitDist = Math.hypot(target.x-o.x, target.y-o.y);
    if (hitDist < RADIUS+ORB_RADIUS && target.iframeTimer <= 0 && !target.blocking) {
      target.hp = Math.max(0, target.hp - ORB_DMG);
      target.iframeTimer = IFRAME_TIME;
      state.orbs.splice(i,1);
    }
  }

  // Separate circles
  const dx = p1.x-p0.x, dy = p1.y-p0.y;
  const dist = Math.hypot(dx,dy);
  if (dist < RADIUS*2 && dist > 0) {
    const push = (RADIUS*2-dist)/2;
    p0.x -= (dx/dist)*push; p0.y -= (dy/dist)*push;
    p1.x += (dx/dist)*push; p1.y += (dy/dist)*push;
  }

  state.tick++;
  return state;
}

function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function normalizeAngle(a){while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;}

// Start server tick for each room when both players ready
io.on("connection", () => {}); // already handled above

// We start ticking when match is found — patch matchFound handler
const origOn = io.on.bind(io);
// Tick rooms
setInterval(() => {
  for (const [roomId, room] of Object.entries(rooms)) {
    const state = tickState(room.state);
    // Check win condition
    const dead = state.players.findIndex(p => p.hp <= 0);
    if (dead !== -1) {
      const winner = 1 - dead;
      room.players[winner].emit("gameOver", { won: true,  state });
      room.players[dead  ].emit("gameOver", { won: false, state });
      clearInterval(room.interval);
      delete rooms[roomId];
      continue;
    }
    // Send state to both players
    io.to(roomId).emit("state", state);
  }
}, TICK);

httpServer.listen(PORT, () => {
  console.log(`Circle Fight server running at http://localhost:${PORT}`);
});
