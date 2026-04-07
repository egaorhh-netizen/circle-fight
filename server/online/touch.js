// ---- TOUCH CONTROLS ----
const isMobile = () => window.innerWidth <= 900 || 'ontouchstart' in window;

const joystickZone = document.getElementById("joystick-zone");
const joystickBase = document.getElementById("joystick-base");
const joystickKnob = document.getElementById("joystick-knob");

let joyActive = false, joyId = null;
let joyOrigin = { x: 0, y: 0 };
let joyDelta  = { x: 0, y: 0 };
const JOY_RADIUS = 50;

joystickZone.addEventListener("touchstart", e => {
  e.preventDefault();
  const t = e.changedTouches[0];
  joyActive = true; joyId = t.identifier;
  const rect = joystickZone.getBoundingClientRect();
  joyOrigin.x = t.clientX - rect.left;
  joyOrigin.y = t.clientY - rect.top;
  joystickBase.style.left = joyOrigin.x + "px";
  joystickBase.style.top  = joyOrigin.y + "px";
  joystickBase.style.opacity = "1";
  updateKnob(0, 0);
}, { passive: false });

joystickZone.addEventListener("touchmove", e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier !== joyId) continue;
    const rect = joystickZone.getBoundingClientRect();
    let dx = t.clientX - rect.left - joyOrigin.x;
    let dy = t.clientY - rect.top  - joyOrigin.y;
    const dist = Math.hypot(dx, dy);
    if (dist > JOY_RADIUS) { dx = dx/dist*JOY_RADIUS; dy = dy/dist*JOY_RADIUS; }
    joyDelta.x = dx / JOY_RADIUS;
    joyDelta.y = dy / JOY_RADIUS;
    updateKnob(dx, dy);
  }
}, { passive: false });

joystickZone.addEventListener("touchend", e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier !== joyId) continue;
    joyActive = false;
    joyDelta.x = 0; joyDelta.y = 0;
    updateKnob(0, 0);
    joystickBase.style.opacity = "0.4";
  }
}, { passive: false });

function updateKnob(dx, dy) {
  joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

window.getJoyDelta = () => joyDelta;

// Кнопки
const tbState = {};

window.tbDown = function(action) {
  tbState[action] = true;
  if (action === "attack")     { if (typeof doBotAttackPlayer === "function") doBotAttackPlayer(); else if (typeof playerAttack === "function") playerAttack(); }
  if (action === "dash")       { if (typeof doBotDash    === "function") doBotDash();    }
  if (action === "orb")        { if (typeof doBotOrb     === "function") doBotOrb();     }
  if (action === "spin")       { if (typeof doBotSpin    === "function") doBotSpin();    }
  if (action === "ironshield") { if (typeof doBotIronShield === "function") doBotIronShield(); }
  if (action === "silence")    { if (typeof doBotSilence    === "function") doBotSilence();    }
};

window.tbUp = function(action) { tbState[action] = false; };
window.isTbDown = function(action) { return !!tbState[action]; };

// Прицел — правая половина экрана
let aimTouchId = null;
document.addEventListener("touchstart", e => {
  if (!window.gameRunning) return;
  for (const t of e.changedTouches) {
    if (t.clientX > window.innerWidth * 0.45 && aimTouchId === null) {
      aimTouchId = t.identifier;
      updateAim(t);
    }
  }
}, { passive: true });

document.addEventListener("touchmove", e => {
  if (!window.gameRunning) return;
  for (const t of e.changedTouches) {
    if (t.identifier === aimTouchId) updateAim(t);
  }
}, { passive: true });

document.addEventListener("touchend", e => {
  for (const t of e.changedTouches) {
    if (t.identifier === aimTouchId) aimTouchId = null;
  }
}, { passive: true });

function updateAim(touch) {
  const cv = document.getElementById("canvas");
  if (!cv || !window.player) return;
  const r = cv.getBoundingClientRect();
  const scaleX = cv.width / r.width, scaleY = cv.height / r.height;
  const mx = (touch.clientX - r.left) * scaleX;
  const my = (touch.clientY - r.top)  * scaleY;
  window.player.angle = Math.atan2(my - window.player.y, mx - window.player.x);
}

// Показывать тач-контролы только на мобильных
function updateTouchVisibility() {
  const tc = document.getElementById("touch-controls");
  const sb = document.getElementById("skill-bar");
  if (!tc) return;
  const mob = isMobile();
  tc.style.display = mob ? "flex" : "none";
  if (sb) sb.style.display = mob ? "none" : "flex";
  // Показать Z/X кнопки если куплены
  const extra = document.getElementById("tb-extra-row");
  if (extra && mob) {
    const hasZ = typeof hasSkill === "function" && (hasSkill("ironshield") || hasSkill("silence"));
    extra.style.display = hasZ ? "flex" : "none";
  }
}

window.addEventListener("resize", updateTouchVisibility);
updateTouchVisibility();

// Блокируем скролл в игре
document.addEventListener("touchmove", e => {
  if (e.target.closest && e.target.closest("#game-screen")) e.preventDefault();
}, { passive: false });
