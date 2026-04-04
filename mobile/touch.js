// ---- TOUCH CONTROLS ----
const isMobile = () => window.innerWidth <= 900 || 'ontouchstart' in window;

// Джойстик
const joystickZone  = document.getElementById("joystick-zone");
const joystickBase  = document.getElementById("joystick-base");
const joystickKnob  = document.getElementById("joystick-knob");

let joyActive = false;
let joyId     = null;
let joyOrigin = { x: 0, y: 0 };
let joyDelta  = { x: 0, y: 0 }; // -1..1

const JOY_RADIUS = 50;

joystickZone.addEventListener("touchstart", e => {
  e.preventDefault();
  const t = e.changedTouches[0];
  joyActive = true;
  joyId = t.identifier;
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

// Экспортируем дельту для game.js
window.getJoyDelta = () => joyDelta;

// Кнопки действий
const tbState = {};

window.tbDown = function(action) {
  tbState[action] = true;
  if (action === "attack") { if (typeof playerAttack === "function") playerAttack(); }
  if (action === "dash")   { if (typeof playerDash   === "function") playerDash();   }
  if (action === "orb")    { if (typeof playerOrb    === "function") playerOrb();    }
  if (action === "spin")   { if (typeof playerSpin   === "function") playerSpin();   }
};

window.tbUp = function(action) {
  tbState[action] = false;
};

window.isTbDown = function(action) { return !!tbState[action]; };

// Прицел — правая половина экрана двигает угол меча
let aimTouchId = null;
document.addEventListener("touchstart", e => {
  if (!gameRunning) return;
  for (const t of e.changedTouches) {
    const x = t.clientX;
    if (x > window.innerWidth * 0.45 && aimTouchId === null) {
      aimTouchId = t.identifier;
      updateAim(t);
    }
  }
}, { passive: true });

document.addEventListener("touchmove", e => {
  if (!gameRunning) return;
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
  if (!canvas || !player) return;
  const r = canvas.getBoundingClientRect();
  player.angle = Math.atan2(touch.clientY - r.top - player.y, touch.clientX - r.left - player.x);
}

// Показывать тач-контролы только на мобильных
function updateTouchVisibility() {
  const tc = document.getElementById("touch-controls");
  const sb = document.getElementById("skill-bar");
  const sh = document.getElementById("shield-hint");
  if (!tc) return;
  if (isMobile()) {
    tc.style.display = "flex";
    if (sb) sb.style.display = "none";
    if (sh) sh.style.display = "none";
  } else {
    tc.style.display = "none";
    if (sb) sb.style.display = "flex";
    if (sh) sh.style.display = "";
  }
}

window.addEventListener("resize", updateTouchVisibility);
updateTouchVisibility();

// Блокируем скролл и зум на мобильных
document.addEventListener("touchmove", e => {
  if (e.target.closest("#game-screen")) e.preventDefault();
}, { passive: false });
