// ---- LOCALIZATION ----
const LANG = {
  ru: {
    title: "Circle Fight",
    playBot: "Играть с ботом",
    playOnline: "Играть онлайн",
    settings: "Настройки",
    onlineMsg: "⚠ Временно не работает",
    settingsTitle: "Настройки",
    labelLang: "Язык:",
    labelTheme: "Тема:",
    themeLight: "Светлая",
    themeDark: "Тёмная",
    back: "Назад",
    player: "Игрок",
    bot: "Бот",
    toMenu: "В меню",
    restart: "Заново",
    win: "Вы победили!",
    lose: "Вы проиграли!",
    rating: "Рейтинг",
    shield: "Щит [F]",
  },
  en: {
    title: "Circle Fight",
    playBot: "Play vs Bot",
    playOnline: "Play Online",
    settings: "Settings",
    onlineMsg: "⚠ Temporarily unavailable",
    settingsTitle: "Settings",
    labelLang: "Language:",
    labelTheme: "Theme:",
    themeLight: "Light",
    themeDark: "Dark",
    back: "Back",
    player: "Player",
    bot: "Bot",
    toMenu: "Menu",
    restart: "Restart",
    win: "You Win!",
    lose: "You Lose!",
    rating: "Rating",
    shield: "Shield [F]",
  }
};

let currentLang  = "ru";
let currentTheme = "dark";
let rating = parseInt(localStorage.getItem("cf_rating") || "0");
let nickname = localStorage.getItem("cf_nickname") || "player";

const MAX_RATING = 12500;
const RATING_PER_WIN = 15;

function t(key) { return LANG[currentLang][key] || key; }

function saveRating() { localStorage.setItem("cf_rating", rating); }

function editNickname() {
  const inp = document.getElementById("nickname-input");
  const disp = document.getElementById("nickname-display");
  inp.value = nickname;
  disp.style.display = "none";
  inp.style.display = "block";
  inp.focus();
  inp.select();
}

function saveNickname() {
  const inp = document.getElementById("nickname-input");
  const val = inp.value.trim();
  nickname = val.length > 0 ? val : "player";
  localStorage.setItem("cf_nickname", nickname);
  inp.style.display = "none";
  const disp = document.getElementById("nickname-display");
  disp.textContent = nickname;
  disp.style.display = "";
}

function applyLang() {
  document.getElementById("title").textContent           = t("title");
  document.getElementById("btn-play-bot").textContent    = t("playBot");
  document.getElementById("btn-play-online").textContent = t("playOnline");
  document.getElementById("btn-settings").textContent    = t("settings");
  document.getElementById("online-msg").textContent      = t("onlineMsg");
  document.getElementById("settings-title").textContent  = t("settingsTitle");
  document.getElementById("label-lang").textContent      = t("labelLang");
  document.getElementById("label-theme").textContent     = t("labelTheme");
  document.getElementById("btn-back").textContent        = t("back");
  document.getElementById("player-label").textContent    = t("player");
  document.getElementById("bot-label").textContent       = t("bot");
  document.getElementById("btn-menu").textContent        = t("toMenu");
  document.getElementById("btn-restart").textContent     = t("restart");
  document.getElementById("btn-menu2").textContent       = t("toMenu");
  document.getElementById("theme-btn").textContent       = currentTheme === "dark" ? t("themeLight") : t("themeDark");
  document.getElementById("shield-hint").textContent     = t("shield");
  updateRatingDisplay();
}

function updateRatingDisplay() {
  const el = document.getElementById("rating-display");
  if (el) el.textContent = t("rating") + ": " + rating + " / " + MAX_RATING;
}

function changeLanguage(lang) { currentLang = lang; applyLang(); }

function toggleTheme() {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  document.body.className = currentTheme;
  applyLang();
}

// ---- SCREENS ----
function showMenu() {
  hide("settings"); hide("game-screen"); hide("gameover"); hide("inventory");
  show("menu");
  stopGame();
  updateRatingDisplay();
}

function showSettings() { hide("menu"); show("settings"); }

function showOnlineMsg() {
  document.getElementById("online-msg").classList.add("visible");
}

function backToMenu() { showMenu(); }
function show(id) { document.getElementById(id).classList.remove("hidden"); }
function hide(id) { document.getElementById(id).classList.add("hidden"); }

// ---- INVENTORY ----
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
    card.className = `sword-card rarity-${sword.rarity}${selected ? " selected" : ""}${!unlocked ? " locked" : ""}`;
    card.onclick = () => {
      if (!unlocked) return;
      selectedSwordId = sword.id;
      localStorage.setItem("cf_sword", sword.id);
      buildInventory();
    };

    // Превью меча на канвасе
    const cv = document.createElement("canvas");
    cv.width = 140; cv.height = 60;
    const cx = cv.getContext("2d");
    cx.save();
    cx.translate(20, 30);
    sword.draw(cx, 10, 80, null, 0, true, null);
    cx.restore();
    card.appendChild(cv);

    const name = document.createElement("div");
    name.className = "sword-name";
    name.textContent = sword.name;
    card.appendChild(name);

    const rar = document.createElement("div");
    rar.className = "sword-rarity";
    rar.style.color = RARITY_COLOR[sword.rarity]?.startsWith("linear") ? "#ff88cc" : RARITY_COLOR[sword.rarity];
    rar.textContent = sword.rarity;
    card.appendChild(rar);

    if (!unlocked) {
      const lock = document.createElement("div");
      lock.className = "sword-lock";
      lock.textContent = `🔒 ${sword.unlockRating} MMR`;
      card.appendChild(lock);
    } else if (selected) {
      const sel = document.createElement("div");
      sel.className = "sword-lock";
      sel.textContent = "✓ Выбран";
      card.appendChild(sel);
    }

    grid.appendChild(card);
  });
}

// ---- BOT SWORD PICK ----
function pickBotSword() {
  // Веса: чем выше рейтинг, тем больше шанс крутого скина
  const tier = Math.floor(rating / 100);
  const pool = [];
  SWORD_SKINS.forEach(s => {
    // базовый вес — чем дешевле скин, тем чаще
    let w = 0;
    if (s.unlockRating === 0)    w = 40;
    else if (s.unlockRating <= 200) w = 25;
    else if (s.unlockRating <= 600) w = 15 + tier;
    else if (s.unlockRating <= 2000) w = 5 + tier * 0.5;
    else w = Math.max(0, tier - 40);
    if (w > 0) pool.push({ sword: s, w });
  });
  const total = pool.reduce((a, b) => a + b.w, 0);
  let r = Math.random() * total;
  for (const { sword, w } of pool) {
    r -= w;
    if (r <= 0) return sword;
  }
  return SWORD_SKINS[0];
}

// ---- BOT DIFFICULTY — каждые 100 рейтинга бот сильнее ----
function botLevel() { return Math.min(rating / MAX_RATING, 1.0); }

function botStats() {
  const tier = Math.floor(rating / 100);
  const tierCapped = Math.min(tier, 5); // скорость и урон растут только до 500 ммр (5 тиров)
  const aggressive = tier >= 3;          // после 300 ммр — не убегает
  return {
    speed:         2.0  + tierCapped * 1.0,              // +1 каждые 100, макс 12 на 1000+
    attackCd:      Math.max(300, 1000 - tier * 30),
    reactionTime:  Math.max(50,  600  - tier * 20),
    blockChance:   Math.min(0.95, 0.10 + tier * 0.05),
    blockDuration: Math.min(2000, 200  + tier * 80),
    damage:        8    + tierCapped * 1.0,              // +1 каждые 100, макс 18 на 1000+
    retreatHp:     aggressive ? 0.0 : 0.15,              // после 300 — не убегает вообще
    turtlePatience:Math.max(300, 2000 - tier * 50),
    aggroDist:     ATTACK_RANGE + 40 + tier * 5,
    strafeSpeed:   Math.min(1.5, 0.4 + tier * 0.05),
    dashChance:    Math.min(0.9, tier * 0.05),
  };
}

// ---- GAME CONSTANTS ----
const CANVAS_W    = 760;
const CANVAS_H    = 480;
const PLAYER_SPEED = 3.5;
const RADIUS      = 28;
const SWORD_LEN   = 44;
const SWORD_W     = 6;
const MAX_HP      = 100;
const ATTACK_RANGE = RADIUS * 2 + SWORD_LEN + 10;
const ATTACK_DMG  = 12;
const ATTACK_CD   = 600;
const KNOCKBACK   = 10;
const IFRAME_TIME = 200;
const DASH_SPEED  = 18;
const DASH_DMG    = 20;
const DASH_DUR    = 120; // мс полёта
const SPIN_DMG    = 20;
const SPIN_DUR    = 600; // мс полного оборота
const SPIN_RANGE  = (RADIUS + SWORD_LEN + 14) * 1.5;
const SHIELD_MAX  = 5;   // ударов до поломки

let canvas, ctx, animId, lastTime = 0;
let keys = {};
let player, bot;
let gameRunning = false;
let particles = [];
let orbs = [];

const ORB_DMG    = 15;
const ORB_SPEED  = 2.8;
const ORB_RADIUS = 10;
const ORB_HOMING = 0.06; // сила автонаводки

// ---- START GAME ----
function startGame() {
  hide("menu"); hide("settings"); hide("gameover");
  show("game-screen");

  canvas = document.getElementById("canvas");

  canvas.width  = CANVAS_W;
  canvas.height = CANVAS_H;
  ctx = canvas.getContext("2d");

  player = {
    x: 180, y: CANVAS_H / 2,
    vx: 0, vy: 0,
    hp: MAX_HP,
    attackTimer: 0,
    iframeTimer: 0,
    angle: 0,
    attackAnim: 0,
    attackPhase: null,
    attackPhaseTimer: 0,
    blocking: false,
    blockHoldTime: 0,
    shieldHp: SHIELD_MAX,   // прочность щита
    dashUsed: false,
    dashTimer: 0,   // > 0 = летим
    dashVx: 0, dashVy: 0,
    orbUsed: false,
    spinUsed: false,
    spinTimer: 0,    // > 0 = крутимся
    spinAngle: 0,    // текущий угол спина
  };

  const bs = botStats();
  const botSword = pickBotSword();
  bot = {
    x: CANVAS_W - 180, y: CANVAS_H / 2,
    vx: 0, vy: 0,
    hp: MAX_HP,
    attackTimer: 0,
    iframeTimer: 0,
    angle: Math.PI,
    attackAnim: 0,
    attackPhase: null,
    attackPhaseTimer: 0,
    blocking: false,
    blockTimer: 0,
    shieldHp: SHIELD_MAX,   // прочность щита бота
    reactionTimer: 0,
    stateTimer: 0,
    dashUsed: false,
    dashTimer: 0,
    dashVx: 0, dashVy: 0,
    dashCooldown: 3000 + Math.random() * 4000,
    orbUsed: false,
    orbCooldown: 5000 + Math.random() * 5000,
    spinUsed: false,
    spinTimer: 0,
    spinAngle: 0,
    spinCooldown: 4000 + Math.random() * 4000,
    sword: botSword,
    stats: bs,
  };

  updateHUD();
  gameRunning = true;
  particles = [];
  orbs = [];

  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("mousemove", onMouseMove);

  if (animId) cancelAnimationFrame(animId);
  lastTime = performance.now();
  animId = requestAnimationFrame(gameLoop);
}

function stopGame() {
  gameRunning = false;
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  if (canvas) {
    canvas.removeEventListener("mousedown", onMouseDown);
    canvas.removeEventListener("mousemove", onMouseMove);
  }
  keys = {};
}

// ---- LOOP ----
function gameLoop(ts) {
  const dt = Math.min(ts - lastTime, 50);
  lastTime = ts;
  if (!gameRunning) return;
  update(dt);
  render();
  animId = requestAnimationFrame(gameLoop);
}

// ---- UPDATE ----
function update(dt) {
  // Player blocking
  player.blocking = !!keys["KeyF"] && player.shieldHp > 0;
  if (player.blocking) {
    player.blockHoldTime = (player.blockHoldTime || 0) + dt;
  } else {
    player.blockHoldTime = 0;
  }

  // Player dash
  if (player.dashTimer > 0) {
    player.dashTimer -= dt;
    player.x = clamp(player.x + player.dashVx, RADIUS, CANVAS_W - RADIUS);
    player.y = clamp(player.y + player.dashVy, RADIUS, CANVAS_H - RADIUS);
    // Дэш-урон боту при столкновении
    const dd = Math.hypot(bot.x - player.x, bot.y - player.y);
    if (dd < RADIUS * 2.2 && bot.iframeTimer <= 0) {
      bot.hp = Math.max(0, bot.hp - DASH_DMG);
      bot.iframeTimer = IFRAME_TIME * 2;
      const nx = (bot.x - player.x) / dd, ny = (bot.y - player.y) / dd;
      bot.x = clamp(bot.x + nx * 20, RADIUS, CANVAS_W - RADIUS);
      bot.y = clamp(bot.y + ny * 20, RADIUS, CANVAS_H - RADIUS);
      player.dashTimer = 0; // стоп дэш при попадании
      spawnDashHitParticles(player.x, player.y, false);
      updateHUD();
      if (bot.hp <= 0) { endGame(true); return; }
    }
    // Частицы следа дэша
    if (Math.random() < 0.6) particles.push({
      x: player.x + (Math.random()-0.5)*10,
      y: player.y + (Math.random()-0.5)*10,
      vx: -player.dashVx*0.2 + (Math.random()-0.5),
      vy: -player.dashVy*0.2 + (Math.random()-0.5),
      life: 1, color: "rgba(100,180,255,0.8)", size: Math.random()*5+2, type:"spark"
    });
  } else {
    // Player movement (slower while blocking)
    const spd = player.blocking ? PLAYER_SPEED * 0.5 : PLAYER_SPEED;
    player.vx = 0; player.vy = 0;
    if (keys["KeyW"] || keys["ArrowUp"])    player.vy = -spd;
    if (keys["KeyS"] || keys["ArrowDown"])  player.vy =  spd;
    if (keys["KeyA"] || keys["ArrowLeft"])  player.vx = -spd;
    if (keys["KeyD"] || keys["ArrowRight"]) player.vx =  spd;

    player.x = clamp(player.x + player.vx, RADIUS, CANVAS_W - RADIUS);
    player.y = clamp(player.y + player.vy, RADIUS, CANVAS_H - RADIUS);
  }
  // Bot dash
  if (bot.dashTimer > 0) {
    bot.dashTimer -= dt;
    bot.x = clamp(bot.x + bot.dashVx, RADIUS, CANVAS_W - RADIUS);
    bot.y = clamp(bot.y + bot.dashVy, RADIUS, CANVAS_H - RADIUS);
    const dd = Math.hypot(player.x - bot.x, player.y - bot.y);
    if (dd < RADIUS * 2.2 && player.iframeTimer <= 0) {
      if (!player.blocking) {
        player.hp = Math.max(0, player.hp - DASH_DMG);
        player.iframeTimer = IFRAME_TIME * 2;
        const nx = (player.x - bot.x) / dd, ny = (player.y - bot.y) / dd;
        player.x = clamp(player.x + nx * 20, RADIUS, CANVAS_W - RADIUS);
        player.y = clamp(player.y + ny * 20, RADIUS, CANVAS_H - RADIUS);
        spawnDashHitParticles(bot.x, bot.y, true);
        updateHUD();
        if (player.hp <= 0) { endGame(false); return; }
      }
      bot.dashTimer = 0;
    }
    if (Math.random() < 0.6) particles.push({
      x: bot.x + (Math.random()-0.5)*10,
      y: bot.y + (Math.random()-0.5)*10,
      vx: -bot.dashVx*0.2 + (Math.random()-0.5),
      vy: -bot.dashVy*0.2 + (Math.random()-0.5),
      life: 1, color: "rgba(255,100,100,0.8)", size: Math.random()*5+2, type:"spark"
    });
  }

  // Timers
  if (player.attackTimer > 0) player.attackTimer -= dt;
  if (player.iframeTimer > 0) player.iframeTimer -= dt;
  if (bot.attackTimer    > 0) bot.attackTimer    -= dt;
  if (bot.iframeTimer    > 0) bot.iframeTimer    -= dt;
  if (bot.blockTimer     > 0) bot.blockTimer     -= dt;
  if (bot.reactionTimer  > 0) bot.reactionTimer  -= dt;
  if (bot.dashCooldown   > 0) bot.dashCooldown   -= dt;
  if (bot.orbCooldown    > 0) bot.orbCooldown    -= dt;
  if (bot.spinCooldown   > 0) bot.spinCooldown   -= dt;

  // Спин игрока
  if (player.spinTimer > 0) {
    player.spinTimer -= dt;
    const progress = 1 - player.spinTimer / SPIN_DUR;
    player.spinAngle = progress * Math.PI * 2;
    // Урон боту если в зоне и ещё не получил
    if (!player._spinHit) {
      const d = Math.hypot(bot.x - player.x, bot.y - player.y);
      if (d < SPIN_RANGE && bot.iframeTimer <= 0) {
        if (!bot.blocking) {
          bot.hp = Math.max(0, bot.hp - SPIN_DMG);
          bot.iframeTimer = IFRAME_TIME * 2;
          spawnSpinHitParticles(player.x, player.y, true);
          updateHUD();
          if (bot.hp <= 0) { endGame(true); return; }
        }
        player._spinHit = true;
      }
    }
    if (player.spinTimer <= 0) { player.spinTimer = 0; player.spinAngle = 0; player._spinHit = false; }
  }

  // Спин бота
  if (bot.spinTimer > 0) {
    bot.spinTimer -= dt;
    const progress = 1 - bot.spinTimer / SPIN_DUR;
    bot.spinAngle = progress * Math.PI * 2;
    if (!bot._spinHit) {
      const d = Math.hypot(player.x - bot.x, player.y - bot.y);
      if (d < SPIN_RANGE && player.iframeTimer <= 0) {
        if (!player.blocking) {
          player.hp = Math.max(0, player.hp - SPIN_DMG);
          player.iframeTimer = IFRAME_TIME * 2;
          spawnSpinHitParticles(bot.x, bot.y, false);
          updateHUD();
          if (player.hp <= 0) { endGame(false); return; }
        }
        bot._spinHit = true;
      }
    }
    if (bot.spinTimer <= 0) { bot.spinTimer = 0; bot.spinAngle = 0; bot._spinHit = false; }
  }

  tickAttackAnim(player, dt);
  tickAttackAnim(bot, dt);

  updateOrbs(dt);
  updateBot(dt);
  separateCircles(player, bot);
  updateHUD();
}

function spawnDashHitParticles(x, y, isBot) {
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = Math.random() * 4 + 1;
    particles.push({
      x, y,
      vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      life: 1,
      color: isBot ? "rgba(255,80,80,0.9)" : "rgba(80,160,255,0.9)",
      size: Math.random() * 6 + 3, type: "spark"
    });
  }
}

// ---- ORBS ----
function launchOrb(fromPlayer) {
  const src = fromPlayer ? player : bot;
  const target = fromPlayer ? bot : player;
  const dx = target.x - src.x, dy = target.y - src.y;
  const dist = Math.hypot(dx, dy) || 1;
  orbs.push({
    x: src.x, y: src.y,
    vx: (dx / dist) * ORB_SPEED,
    vy: (dy / dist) * ORB_SPEED,
    fromPlayer,
    life: 1,
    hue: fromPlayer ? 200 : 0, // синий для игрока, красный для бота
    trail: [],
  });
}

function updateOrbs(dt) {
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    const target = o.fromPlayer ? bot : player;

    // Автонаводка
    const dx = target.x - o.x, dy = target.y - o.y;
    const dist = Math.hypot(dx, dy) || 1;
    o.vx += (dx / dist) * ORB_HOMING;
    o.vy += (dy / dist) * ORB_HOMING;
    // Ограничить скорость
    const spd = Math.hypot(o.vx, o.vy);
    if (spd > ORB_SPEED * 1.5) { o.vx = o.vx/spd * ORB_SPEED * 1.5; o.vy = o.vy/spd * ORB_SPEED * 1.5; }

    o.trail.push({ x: o.x, y: o.y });
    if (o.trail.length > 18) o.trail.shift();

    o.x += o.vx; o.y += o.vy;

    // Частицы вокруг орба
    if (Math.random() < 0.5) particles.push({
      x: o.x + (Math.random()-0.5)*8,
      y: o.y + (Math.random()-0.5)*8,
      vx: (Math.random()-0.5)*1.5, vy: (Math.random()-0.5)*1.5,
      life: 0.7, color: `hsla(${o.hue + Math.random()*40},100%,65%,0.8)`,
      size: Math.random()*3+1, type:"plasma"
    });

    // Выход за пределы
    if (o.x < 0 || o.x > CANVAS_W || o.y < 0 || o.y > CANVAS_H) {
      orbs.splice(i, 1); continue;
    }

    // Попадание
    const hitDist = Math.hypot(target.x - o.x, target.y - o.y);
    if (hitDist < RADIUS + ORB_RADIUS) {
      // Проверка блока
      let blocked = false;
      if (target.blocking) {
        const toOrbAngle = Math.atan2(o.y - target.y, o.x - target.x);
        const shieldAngle = o.fromPlayer ? bot.angle : player.angle;
        const diff = Math.abs(normalizeAngle(shieldAngle - toOrbAngle + Math.PI));
        if (diff < Math.PI / 1.8) blocked = true;
      }
      if (!blocked && target.iframeTimer <= 0) {
        target.hp = Math.max(0, target.hp - ORB_DMG);
        target.iframeTimer = IFRAME_TIME;
        spawnDashHitParticles(o.x, o.y, o.fromPlayer);
        updateHUD();
        if (target.hp <= 0) { endGame(o.fromPlayer); return; }
      }
      orbs.splice(i, 1);
    }
  }
}

// ---- BOT AI ----
function updateBot(dt) {
  const dx   = player.x - bot.x;
  const dy   = player.y - bot.y;
  const dist = Math.hypot(dx, dy);
  const bs   = bot.stats;

  bot.angle = Math.atan2(dy, dx);
  bot.stateTimer -= dt;

  // Дэш — на высоком рейтинге использует раньше и агрессивнее
  const dashDist = ATTACK_RANGE * (1.5 + (1 - bs.dashChance) * 1.5);
  if (!bot.dashUsed && bot.dashCooldown <= 0 && dist < dashDist && bot.dashTimer <= 0) {
    bot.dashUsed = true;
    bot.dashTimer = DASH_DUR;
    const nx = dx / dist, ny = dy / dist;
    bot.dashVx = nx * DASH_SPEED;
    bot.dashVy = ny * DASH_SPEED;
    spawnDashHitParticles(bot.x, bot.y, true);
    return;
  }

  if (bot.dashTimer > 0) return;

  // Орб
  if (!bot.orbUsed && bot.orbCooldown <= 0) {
    bot.orbUsed = true;
    launchOrb(false);
  }

  // Спин бота — когда игрок близко
  if (!bot.spinUsed && bot.spinCooldown <= 0 && dist < SPIN_RANGE + 20 && bot.spinTimer <= 0) {
    bot.spinUsed = true;
    bot.spinTimer = SPIN_DUR;
    bot._spinHit = false;
  }

  // Блок при замахе игрока
  if (player.attackPhase === "swing" && bot.blockTimer <= 0 && bot.reactionTimer <= 0) {
    if (Math.random() < bs.blockChance) bot.blockTimer = bs.blockDuration;
    bot.reactionTimer = bs.reactionTime;
  }
  bot.blocking = bot.blockTimer > 0;

  const spd = bot.blocking ? bs.speed * 0.3 : bs.speed;
  const lowHp      = bs.retreatHp > 0 && bot.hp < MAX_HP * bs.retreatHp;
  const justHit    = bot.iframeTimer > 0;
  const canAttack  = bot.attackTimer <= 0 && !bot.blocking;
  const playerTurtling = player.blockHoldTime > bs.turtlePatience;

  if (lowHp && dist < bs.aggroDist) {
    _botMove(bot, -dx, -dy, dist, spd);

  } else if (justHit) {
    _botMove(bot, -dx, -dy, dist, spd * 1.8);

  } else if (playerTurtling) {
    const safeDist = ATTACK_RANGE * 1.8;
    if (dist < safeDist) {
      _botMove(bot, -dx, -dy, dist, spd * 0.6);
    } else {
      if (bot.stateTimer <= 0) bot.stateTimer = 400 + Math.random() * 400;
      const side = bot.stateTimer > 200 ? 1 : -1;
      bot.x = clamp(bot.x + (-dy / dist) * spd * side * bs.strafeSpeed, RADIUS, CANVAS_W - RADIUS);
      bot.y = clamp(bot.y + ( dx / dist) * spd * side * bs.strafeSpeed, RADIUS, CANVAS_H - RADIUS);
    }

  } else if (canAttack && dist <= ATTACK_RANGE) {
    botAttack();

  } else if (canAttack && dist <= bs.aggroDist) {
    _botMove(bot, dx, dy, dist, spd);

  } else if (canAttack) {
    _botMove(bot, dx, dy, dist, spd);

  } else {
    // Страфинг с кулдауном — скорость страфа зависит от рейтинга
    if (bot.stateTimer <= 0) bot.stateTimer = Math.max(200, 600 - rating * 0.3) + Math.random() * 400;
    const side = bot.stateTimer > bot.stateTimer * 0.5 ? 1 : -1;
    const keepDist = dist > ATTACK_RANGE + 15 ? spd * 0.5 : dist < ATTACK_RANGE - 15 ? -spd * 0.5 : 0;

    let mx = (-dy / dist) * spd * side * bs.strafeSpeed + (dx / dist) * keepDist;
    let my = ( dx / dist) * spd * side * bs.strafeSpeed + (dy / dist) * keepDist;

    const margin = 80;
    const wallForce = spd * 1.5;
    if (bot.x < margin)            mx += wallForce * (1 - bot.x / margin);
    if (bot.x > CANVAS_W - margin) mx -= wallForce * (1 - (CANVAS_W - bot.x) / margin);
    if (bot.y < margin)            my += wallForce * (1 - bot.y / margin);
    if (bot.y > CANVAS_H - margin) my -= wallForce * (1 - (CANVAS_H - bot.y) / margin);

    bot.x = clamp(bot.x + mx, RADIUS, CANVAS_W - RADIUS);
    bot.y = clamp(bot.y + my, RADIUS, CANVAS_H - RADIUS);
  }
}

function _botMove(e, dx, dy, dist, spd) {
  if (dist === 0) return;
  let mx = (dx / dist) * spd;
  let my = (dy / dist) * spd;

  // Отталкивание от стен — чем ближе к стене, тем сильнее уходит от неё
  const margin = 80;
  const wallForce = spd * 1.2;
  if (e.x < margin)            mx += wallForce * (1 - e.x / margin);
  if (e.x > CANVAS_W - margin) mx -= wallForce * (1 - (CANVAS_W - e.x) / margin);
  if (e.y < margin)            my += wallForce * (1 - e.y / margin);
  if (e.y > CANVAS_H - margin) my -= wallForce * (1 - (CANVAS_H - e.y) / margin);

  e.x = clamp(e.x + mx, RADIUS, CANVAS_W - RADIUS);
  e.y = clamp(e.y + my, RADIUS, CANVAS_H - RADIUS);
}

function botAttack() {
  const bs = bot.stats;
  bot.attackTimer    = bs.attackCd;
  bot.attackAnim     = 1;
  bot.attackPhase    = "windup";
  bot.attackPhaseTimer = 120;

  if (player.iframeTimer > 0) return;

  const dx   = player.x - bot.x;
  const dy   = player.y - bot.y;
  const dist = Math.hypot(dx, dy);
  if (dist > ATTACK_RANGE) return;

  // Проверка блока игрока
  if (player.blocking && player.shieldHp > 0) {
    const toBotAngle = Math.atan2(bot.y - player.y, bot.x - player.x);
    const diff = Math.abs(normalizeAngle(player.angle - toBotAngle));
    if (diff < Math.PI / 1.8) {
      player.shieldHp--;
      updateHUD();
      return;
    }
  }

  player.hp = Math.max(0, player.hp - bs.damage);
  player.iframeTimer = IFRAME_TIME;
  player.x = clamp(player.x + (dx / dist) * KNOCKBACK, RADIUS, CANVAS_W - RADIUS);
  player.y = clamp(player.y + (dy / dist) * KNOCKBACK, RADIUS, CANVAS_H - RADIUS);
  updateHUD();
  if (player.hp <= 0) endGame(false);
}

// ---- PLAYER ATTACK ----
function playerAttack() {
  if (player.attackTimer > 0) return;
  if (player.blocking) return; // нельзя бить в блоке

  player.attackTimer = ATTACK_CD;
  player.attackAnim  = 1;
  player.attackPhase = "windup";
  player.attackPhaseTimer = 100;

  const dx   = bot.x - player.x;
  const dy   = bot.y - player.y;
  const dist = Math.hypot(dx, dy);

  const angleDiff = Math.abs(normalizeAngle(Math.atan2(dy, dx) - player.angle));
  if (dist > ATTACK_RANGE || angleDiff >= Math.PI / 2.5 || bot.iframeTimer > 0) return;

  if (bot.blocking && bot.shieldHp > 0) {
    const toBotAngle = Math.atan2(bot.y - player.y, bot.x - player.x);
    const diff = Math.abs(normalizeAngle(bot.angle - toBotAngle + Math.PI));
    if (diff < Math.PI / 2) {
      bot.shieldHp--;
      updateHUD();
      return;
    }
  }

  bot.hp = Math.max(0, bot.hp - ATTACK_DMG);
  bot.iframeTimer = IFRAME_TIME;
  bot.x = clamp(bot.x + (dx / dist) * KNOCKBACK, RADIUS, CANVAS_W - RADIUS);
  bot.y = clamp(bot.y + (dy / dist) * KNOCKBACK, RADIUS, CANVAS_H - RADIUS);
  updateHUD();
  if (bot.hp <= 0) endGame(true);
}

// Фазовая анимация: windup (замах) -> swing (удар)
function tickAttackAnim(e, dt) {
  if (!e.attackPhase) return;
  e.attackPhaseTimer -= dt;
  if (e.attackPhase === "windup") {
    e.attackAnim = 1 - Math.max(0, e.attackPhaseTimer) / 120;
    if (e.attackPhaseTimer <= 0) { e.attackPhase = "swing"; e.attackPhaseTimer = 150; }
  } else if (e.attackPhase === "swing") {
    const p = 1 - Math.max(0, e.attackPhaseTimer) / 150;
    e.attackAnim = 1 - p * 1.5;
    if (e.attackPhaseTimer <= 0) { e.attackPhase = null; e.attackAnim = 0; }
  }
}

function separateCircles(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const minDist = RADIUS * 2;
  if (dist < minDist && dist > 0) {
    const push = (minDist - dist) / 2;
    a.x -= (dx / dist) * push; a.y -= (dy / dist) * push;
    b.x += (dx / dist) * push; b.y += (dy / dist) * push;
  }
}

// ---- RENDER ----
function render() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  const isDark = currentTheme === "dark";
  const playerColor = isDark ? "#ffffff" : "#222222";

  // Частицы (под кругами)
  updateParticles();
  // Орбы
  renderOrbs();

  drawCircle(player, playerColor, isDark, true);
  drawCircle(bot, "#e74c3c", isDark, false);
}

function renderOrbs() {
  orbs.forEach(o => {
    // Хвост
    ctx.save();
    for (let i = 0; i < o.trail.length; i++) {
      const t = i / o.trail.length;
      ctx.beginPath();
      ctx.arc(o.trail[i].x, o.trail[i].y, ORB_RADIUS * t * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${o.hue + 20},100%,65%,${t * 0.3})`;
      ctx.fill();
    }
    ctx.restore();

    // Внешнее свечение
    ctx.save();
    ctx.shadowColor = `hsl(${o.hue + 20},100%,65%)`;
    ctx.shadowBlur = 28;
    // Пульсация
    const pulse = 1 + Math.sin(Date.now() / 80) * 0.15;
    const r = ORB_RADIUS * pulse;

    // Внешний ореол
    const glow = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, r * 2.5);
    glow.addColorStop(0, `hsla(${o.hue},100%,80%,0.4)`);
    glow.addColorStop(1, `hsla(${o.hue},100%,50%,0)`);
    ctx.beginPath(); ctx.arc(o.x, o.y, r * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = glow; ctx.fill();

    // Ядро
    const grad = ctx.createRadialGradient(o.x - r*0.3, o.y - r*0.3, 0, o.x, o.y, r);
    grad.addColorStop(0, `hsl(${o.hue + 60},100%,95%)`);
    grad.addColorStop(0.4, `hsl(${o.hue + 20},100%,70%)`);
    grad.addColorStop(1, `hsl(${o.hue},100%,40%)`);
    ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad; ctx.fill();

    // Обводка
    ctx.strokeStyle = `hsl(${o.hue + 40},100%,85%)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  });
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.life -= 0.04;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha = p.life * 0.9;
    if (p.type === "fire") {
      ctx.shadowColor = p.color; ctx.shadowBlur = 8;
    } else if (p.type === "spark" || p.type === "plasma") {
      ctx.shadowColor = p.color; ctx.shadowBlur = 6;
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.restore();
  }
}

function drawCircle(entity, color, isDark, isPlayer) {
  const { x, y, angle, attackAnim, iframeTimer, blocking } = entity;
  ctx.save();
  ctx.translate(x, y);

  if (iframeTimer > 0 && Math.floor(iframeTimer / 80) % 2 === 0) ctx.globalAlpha = 0.4;

  // Shield glow
  if (blocking) {
    ctx.beginPath();
    ctx.arc(0, 0, RADIUS + 8, 0, Math.PI * 2);
    ctx.fillStyle = isPlayer ? "rgba(80,160,255,0.25)" : "rgba(255,80,80,0.25)";
    ctx.fill();
  }

  // Body
  ctx.beginPath();
  ctx.arc(0, 0, RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Shield arc (when blocking)
  if (blocking) {
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.arc(0, 0, RADIUS + 10, -Math.PI / 2.5, Math.PI / 2.5);
    ctx.strokeStyle = isPlayer ? "#4af" : "#f44";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.restore();
  }

  // Sword — используем выбранный скин (только для игрока), для бота — default
  ctx.save();
  ctx.rotate(angle);

  let swingAngle = 0;
  if (entity.attackPhase === "windup") {
    swingAngle = attackAnim * (Math.PI * 0.55);
  } else if (entity.attackPhase === "swing") {
    swingAngle = attackAnim * (Math.PI * 0.55);
  }
  ctx.rotate(swingAngle);

  // Дуга следа при свинге
  if (entity.attackPhase === "swing" && attackAnim < 0.6) {
    const trailCount = 6;
    const maxTrailAngle = Math.PI * 0.5;
    ctx.save();
    for (let i = trailCount; i >= 1; i--) {
      const off = (i / trailCount) * maxTrailAngle * (1 - attackAnim);
      ctx.save();
      ctx.rotate(off);
      ctx.globalAlpha = (1 - i / trailCount) * 0.35;
      ctx.beginPath();
      ctx.moveTo(RADIUS + 4, 0);
      ctx.lineTo(RADIUS + SWORD_LEN + 8, 0);
      ctx.strokeStyle = isPlayer ? "#66bbff" : "#ff6666";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // Передаём частицы в мировых координатах через обёртку
  const worldParticles = isPlayer ? {
    push(p) {
      // трансформируем из локальных в мировые
      const cos = Math.cos(angle + swingAngle);
      const sin = Math.sin(angle + swingAngle);
      particles.push({
        x: x + p.x * cos - p.y * sin,
        y: y + p.x * sin + p.y * cos,
        vx: p.vx * cos - p.vy * sin,
        vy: p.vx * sin + p.vy * cos,
        life: p.life, color: p.color, size: p.size, type: p.type
      });
    }
  } : null;

  const sword = isPlayer ? getSelectedSword() : (entity.sword || SWORD_SKINS[0]);
  sword.draw(ctx, RADIUS, SWORD_LEN, entity.attackPhase, attackAnim, isPlayer, worldParticles);

  ctx.restore();

  // ---- SPIN АТАКА ----
  if (entity.spinTimer > 0) {
    const progress = 1 - entity.spinTimer / SPIN_DUR; // 0..1
    const spinA = progress * Math.PI * 2;              // 0..360°

    const skinColors = {
      default:   { c1: "#cccccc", c2: "#ffffff", glow: "#aaaaaa" },
      fire:      { c1: "#ff4400", c2: "#ffdd00", glow: "#ff6600" },
      ice:       { c1: "#88ddff", c2: "#ffffff", glow: "#00ccff" },
      lightning: { c1: "#8844ff", c2: "#cc88ff", glow: "#aa88ff" },
      shadow:    { c1: "#330033", c2: "#660066", glow: "#aa00cc" },
      gold:      { c1: "#ffaa00", c2: "#ffe866", glow: "#ffcc00" },
      plasma:    { c1: `hsl(${Date.now()/4%360},100%,60%)`, c2: "#fff", glow: `hsl(${Date.now()/4%360},100%,70%)` },
      void:      { c1: "#000000", c2: "#6600cc", glow: "#4400aa" },
    };
    const sc = skinColors[sword.id] || skinColors.default;
    const r = SPIN_RANGE;

    ctx.save();

    // 1. Пульсирующее кольцо вокруг персонажа
    const ringAlpha = Math.sin(progress * Math.PI); // нарастает и спадает
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    ctx.strokeStyle = sc.glow;
    ctx.lineWidth = 3 + ringAlpha * 5;
    ctx.globalAlpha = ringAlpha * 0.5;
    ctx.shadowColor = sc.glow;
    ctx.shadowBlur = 20;
    ctx.stroke();

    // 2. Шлейф — несколько полупрозрачных мечей позади
    const trailCount = 7;
    for (let i = trailCount; i >= 1; i--) {
      const trailA = angle + spinA - (i / trailCount) * Math.PI * 0.9;
      const alpha = (1 - i / trailCount) * 0.55;
      ctx.save();
      ctx.rotate(trailA);
      ctx.globalAlpha = alpha;
      ctx.shadowColor = sc.glow;
      ctx.shadowBlur = 10;
      sword.draw(ctx, RADIUS, SWORD_LEN, null, 0, isPlayer, null);
      ctx.restore();
    }

    // 3. Основной меч — вращается
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.rotate(angle + spinA);
    ctx.shadowColor = sc.glow;
    ctx.shadowBlur = 25;
    sword.draw(ctx, RADIUS, SWORD_LEN, null, 0, isPlayer, null);
    ctx.restore();

    // 4. Вспышка в конце (последние 15% анимации)
    if (progress > 0.85) {
      const flash = (progress - 0.85) / 0.15;
      ctx.beginPath();
      ctx.arc(0, 0, r * flash * 1.1, 0, Math.PI * 2);
      ctx.strokeStyle = sc.c2;
      ctx.lineWidth = 4;
      ctx.globalAlpha = (1 - flash) * 0.9;
      ctx.shadowColor = sc.c2;
      ctx.shadowBlur = 40;
      ctx.stroke();
    }

    // 5. Частицы по кругу
    if (Math.random() < 0.8) {
      const pa = angle + spinA + (Math.random() - 0.5) * 0.8;
      particles.push({
        x: x + Math.cos(pa) * r * 0.85,
        y: y + Math.sin(pa) * r * 0.85,
        vx: Math.cos(pa) * (Math.random() * 2 + 1),
        vy: Math.sin(pa) * (Math.random() * 2 + 1),
        life: 0.9, color: sc.glow, size: Math.random() * 5 + 2, type: "spark"
      });
    }

    ctx.restore(); // конец спина
    ctx.globalAlpha = 1;
  }

  ctx.restore(); // конец translate
}

// ---- HUD ----
function updateHUD() {
  const ph = Math.max(0, player.hp);
  const bh = Math.max(0, bot.hp);
  document.getElementById("player-hp-bar").style.width = (ph / MAX_HP * 100) + "%";
  document.getElementById("bot-hp-bar").style.width    = (bh / MAX_HP * 100) + "%";
  document.getElementById("player-hp-text").textContent = Math.round(ph);
  document.getElementById("bot-hp-text").textContent    = Math.round(bh);
  // Щит
  const psb = document.getElementById("player-shield-bar");
  const bsb = document.getElementById("bot-shield-bar");
  const psi = document.getElementById("player-shield-icon");
  const bsi = document.getElementById("bot-shield-icon");
  if (psb) {
    psb.style.width = (player.shieldHp / SHIELD_MAX * 100) + "%";
    psb.classList.toggle("broken", player.shieldHp <= 0);
    if (psi) psi.textContent = player.shieldHp > 0 ? "🛡" : "💔";
  }
  if (bsb) {
    bsb.style.width = (bot.shieldHp / SHIELD_MAX * 100) + "%";
    bsb.classList.toggle("broken", bot.shieldHp <= 0);
    if (bsi) bsi.textContent = bot.shieldHp > 0 ? "🛡" : "💔";
  }
  const di = document.getElementById("dash-icon");
  if (di) di.classList.toggle("used", !!player.dashUsed);
  const oi = document.getElementById("orb-icon");
  if (oi) oi.classList.toggle("used", !!player.orbUsed);
  const si = document.getElementById("spin-icon");
  if (si) si.classList.toggle("used", !!player.spinUsed);
}

// ---- GAME OVER ----
function endGame(playerWon) {
  gameRunning = false;
  cancelAnimationFrame(animId);

  if (playerWon && rating < MAX_RATING) {
    rating = Math.min(rating + RATING_PER_WIN, MAX_RATING);
    saveRating();
  } else if (!playerWon && rating > 0) {
    rating = Math.max(rating - RATING_PER_WIN, 0);
    saveRating();
  }

  hide("game-screen");
  show("gameover");
  document.getElementById("gameover-text").textContent = playerWon ? t("win") : t("lose");
  document.getElementById("gameover-rating").textContent = t("rating") + ": " + rating;
}

// ---- INPUT ----
function onKeyDown(e) {
  keys[e.code] = true;
  if (gameRunning && ["KeyW","KeyA","KeyS","KeyD","KeyF","KeyQ","KeyE","KeyR","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)) {
    e.preventDefault();
  }
  if (e.code === "KeyQ" && gameRunning) playerDash();
  if (e.code === "KeyE" && gameRunning) playerOrb();
  if (e.code === "KeyR" && gameRunning) playerSpin();
}
function onKeyUp(e)   { keys[e.code] = false; }
function onMouseMove(e) {
  if (!canvas || !player) return;
  const r = canvas.getBoundingClientRect();
  player.angle = Math.atan2(e.clientY - r.top - player.y, e.clientX - r.left - player.x);
}
function onMouseDown(e) { if (e.button === 0) playerAttack(); }

function playerDash() {
  if (player.dashUsed || player.dashTimer > 0 || player.blocking) return;
  player.dashUsed = true;
  player.dashTimer = DASH_DUR;
  player.dashVx = Math.cos(player.angle) * DASH_SPEED;
  player.dashVy = Math.sin(player.angle) * DASH_SPEED;
  spawnDashHitParticles(player.x, player.y, false);
}

function playerOrb() {
  if (player.orbUsed) return;
  player.orbUsed = true;
  launchOrb(true);
}

function playerSpin() {
  if (player.spinUsed || player.spinTimer > 0 || player.blocking) return;
  player.spinUsed = true;
  player.spinTimer = SPIN_DUR;
  player._spinHit = false;
}

function spawnSpinHitParticles(x, y, hitBot) {
  const color = hitBot ? "rgba(80,200,255,0.9)" : "rgba(255,80,80,0.9)";
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const spd = Math.random() * 5 + 2;
    particles.push({ x, y, vx: Math.cos(a)*spd, vy: Math.sin(a)*spd,
      life: 1, color, size: Math.random()*5+2, type:"spark" });
  }
}

// ---- UTILS ----
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function normalizeAngle(a) {
  while (a >  Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// ---- INIT ----
applyLang();
document.addEventListener("keydown", onKeyDown);
document.addEventListener("keyup",   onKeyUp);
document.getElementById("nickname-display").textContent = nickname;


// ---- MENU BACKGROUND ANIMATION ----
(function initMenuBg(){
  const cv = document.getElementById("menu-bg");
  if (!cv) return;
  const cx = cv.getContext("2d");
  let W, H;
  const pts = [];

  function resize(){
    W = cv.width  = window.innerWidth;
    H = cv.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  // Создаём частицы
  for (let i = 0; i < 60; i++) {
    pts.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 0.5,
      hue: Math.random() * 60 + 200, // синий-фиолетовый
      alpha: Math.random() * 0.5 + 0.1,
    });
  }

  function drawMenuBg(){
    cx.clearRect(0, 0, W, H);

    // Соединяем близкие точки линиями
    for (let i = 0; i < pts.length; i++) {
      for (let j = i+1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
        const dist = Math.hypot(dx, dy);
        if (dist < 120) {
          cx.beginPath();
          cx.moveTo(pts[i].x, pts[i].y);
          cx.lineTo(pts[j].x, pts[j].y);
          cx.strokeStyle = `rgba(100,120,255,${(1 - dist/120) * 0.15})`;
          cx.lineWidth = 1;
          cx.stroke();
        }
      }
    }

    // Рисуем точки
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      cx.beginPath();
      cx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      cx.fillStyle = `hsla(${p.hue},80%,70%,${p.alpha})`;
      cx.fill();
    });

    requestAnimationFrame(drawMenuBg);
  }
  drawMenuBg();
})();
