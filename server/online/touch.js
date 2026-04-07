// ---- TOUCH CONTROLS ----
const isMobile = () => 'ontouchstart' in window || window.innerWidth <= 900;

let joyId = null, joyOrigin = {x:0,y:0}, joyDelta = {x:0,y:0};
const JOY_R = 55;
window.getJoyDelta = () => joyDelta;

const tbState = {};
window.isTbDown = a => !!tbState[a];

window.tbDown = function(action) {
  tbState[action] = true;
  if (action === "attack") {
    if (window.onlineRunning) doOnlineAction("attack");
    else if (typeof doBotAttack === "function") doBotAttack();
  }
  if (action === "dash") {
    if (window.onlineRunning) doOnlineAction("dash");
    else if (typeof doBotDash === "function") doBotDash();
  }
  if (action === "orb") {
    if (window.onlineRunning) doOnlineAction("orb");
    else if (typeof doBotOrb === "function") doBotOrb();
  }
  if (action === "spin") {
    if (window.onlineRunning) doOnlineAction("spin");
    else if (typeof doBotSpin === "function") doBotSpin();
  }
  if (action === "ironshield") {
    if (window.onlineRunning) doOnlineAction("ironshield");
    else if (typeof doBotIronShield === "function") doBotIronShield();
  }
  if (action === "silence") {
    if (window.onlineRunning) doOnlineAction("silence");
    else if (typeof doBotSilence === "function") doBotSilence();
  }
};
window.tbUp = a => { tbState[a] = false; };

function init() {
  if (!isMobile()) return;

  const zone = document.getElementById("joystick-zone");
  const base = document.getElementById("joystick-base");
  const knob = document.getElementById("joystick-knob");
  const tc   = document.getElementById("touch-controls");
  const sb   = document.getElementById("skill-bar");

  if (tc) tc.style.display = "flex";
  if (sb) sb.style.display = "none";
  if (!zone) return;

  function setKnob(dx, dy) {
    if (knob) knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  zone.addEventListener("touchstart", e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    joyId = t.identifier;
    const r = zone.getBoundingClientRect();
    joyOrigin = { x: t.clientX - r.left, y: t.clientY - r.top };
    if (base) { base.style.left = joyOrigin.x+"px"; base.style.top = joyOrigin.y+"px"; base.style.opacity="1"; }
    setKnob(0, 0);
  }, { passive: false });

  zone.addEventListener("touchmove", e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier !== joyId) continue;
      const r = zone.getBoundingClientRect();
      let dx = t.clientX - r.left - joyOrigin.x;
      let dy = t.clientY - r.top  - joyOrigin.y;
      const d = Math.hypot(dx, dy);
      if (d > JOY_R) { dx = dx/d*JOY_R; dy = dy/d*JOY_R; }
      joyDelta = { x: dx/JOY_R, y: dy/JOY_R };
      setKnob(dx, dy);
    }
  }, { passive: false });

  zone.addEventListener("touchend", e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier !== joyId) continue;
      joyId = null; joyDelta = {x:0,y:0};
      setKnob(0, 0);
      if (base) base.style.opacity = "0.4";
    }
  }, { passive: false });

  // Прицел — правая половина, только вне кнопок
  let aimId = null;

  document.addEventListener("touchstart", e => {
    if (!window.gameRunning && !window.onlineRunning) return;
    for (const t of e.changedTouches) {
      if (e.target.closest && e.target.closest("#touch-controls")) continue;
      if (t.clientX > window.innerWidth * 0.45 && aimId === null) {
        aimId = t.identifier;
        doAim(t);
      }
    }
  }, { passive: true });

  document.addEventListener("touchmove", e => {
    if (!window.gameRunning && !window.onlineRunning) return;
    for (const t of e.changedTouches) {
      if (t.identifier === aimId) doAim(t);
    }
  }, { passive: true });

  document.addEventListener("touchend", e => {
    for (const t of e.changedTouches) {
      if (t.identifier === aimId) aimId = null;
    }
  }, { passive: true });

  // Блокируем скролл в игре
  document.addEventListener("touchmove", e => {
    if (e.target.closest && e.target.closest("#game-screen")) e.preventDefault();
  }, { passive: false });
}

function doAim(touch) {
  const cv = window.onlineRunning
    ? document.getElementById("online-canvas")
    : document.getElementById("canvas");
  if (!cv) return;
  const r = cv.getBoundingClientRect();
  const scaleX = cv.width  / r.width;
  const scaleY = cv.height / r.height;
  const mx = (touch.clientX - r.left) * scaleX;
  const my = (touch.clientY - r.top)  * scaleY;
  if (window.player)  window.player.angle  = Math.atan2(my - window.player.y,  mx - window.player.x);
  if (window.localMe) window.localMe.angle = Math.atan2(my - window.localMe.y, mx - window.localMe.x);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
