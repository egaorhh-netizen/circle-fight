// ---- TOUCH CONTROLS ----
const isMobile = () => 'ontouchstart' in window || window.innerWidth <= 900;

// Джойстик движения
let joyId = null, joyOrigin = {x:0,y:0}, joyDelta = {x:0,y:0};
const JOY_R = 55;
window.getJoyDelta = () => joyDelta;

// Джойстик прицела
let aimJoyId = null, aimJoyOrigin = {x:0,y:0};

// Кнопки
const tbState = {};
window.isTbDown = a => !!tbState[a];
window.tbDown = function(action) {
  tbState[action] = true;
  if (action === "attack") {
    if (window.onlineRunning) { if(typeof doOnlineAction==="function") doOnlineAction("attack"); }
    else if (typeof doBotAttack === "function") doBotAttack();
  }
  if (action === "dash")       { if(window.onlineRunning){doOnlineAction("dash");}       else if(typeof doBotDash==="function") doBotDash(); }
  if (action === "orb")        { if(window.onlineRunning){doOnlineAction("orb");}        else if(typeof doBotOrb==="function")  doBotOrb();  }
  if (action === "spin")       { if(window.onlineRunning){doOnlineAction("spin");}       else if(typeof doBotSpin==="function") doBotSpin(); }
  if (action === "ironshield") { if(window.onlineRunning){doOnlineAction("ironshield");} else if(typeof doBotIronShield==="function") doBotIronShield(); }
  if (action === "silence")    { if(window.onlineRunning){doOnlineAction("silence");}    else if(typeof doBotSilence==="function")    doBotSilence();    }
};
window.tbUp = a => { tbState[a] = false; };

function setKnob(knob, dx, dy) {
  if (knob) knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

function getCanvas() {
  return window.onlineRunning
    ? document.getElementById("online-canvas")
    : document.getElementById("canvas");
}

function applyAimAngle(cx, cy) {
  const cv = getCanvas();
  if (!cv) return;
  const r = cv.getBoundingClientRect();
  const scaleX = cv.width / r.width;
  const scaleY = cv.height / r.height;
  // Центр игрока в координатах canvas
  const px = window.player ? window.player.x : (window.localMe ? window.localMe.x : cv.width/2);
  const py = window.player ? window.player.y : (window.localMe ? window.localMe.y : cv.height/2);
  // Переводим экранные координаты в canvas
  const mx = (cx - r.left) * scaleX;
  const my = (cy - r.top)  * scaleY;
  const angle = Math.atan2(my - py, mx - px);
  if (window.player)  window.player.angle  = angle;
  if (window.localMe) { window.localMe.angle = angle; if(typeof myAngle!=="undefined") window.myAngle = angle; }
}

function init() {
  if (!isMobile()) return;

  const moveZone = document.getElementById("joystick-zone");
  const moveBase = document.getElementById("joystick-base");
  const moveKnob = document.getElementById("joystick-knob");
  const aimZone  = document.getElementById("aim-zone");
  const aimBase  = document.getElementById("aim-base");
  const aimKnob  = document.getElementById("aim-knob");
  const tc = document.getElementById("touch-controls");
  const sb = document.getElementById("skill-bar");

  if (tc) tc.style.display = "flex";
  if (sb) sb.style.display = "none";

  // ---- Джойстик движения ----
  if (moveZone) {
    moveZone.addEventListener("touchstart", e => {
      e.preventDefault();
      const t = e.changedTouches[0];
      joyId = t.identifier;
      const r = moveZone.getBoundingClientRect();
      joyOrigin = { x: t.clientX - r.left, y: t.clientY - r.top };
      if (moveBase) { moveBase.style.left=joyOrigin.x+"px"; moveBase.style.top=joyOrigin.y+"px"; moveBase.style.opacity="1"; }
      setKnob(moveKnob, 0, 0);
    }, { passive: false });

    moveZone.addEventListener("touchmove", e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== joyId) continue;
        const r = moveZone.getBoundingClientRect();
        let dx = t.clientX - r.left - joyOrigin.x;
        let dy = t.clientY - r.top  - joyOrigin.y;
        const d = Math.hypot(dx, dy);
        if (d > JOY_R) { dx=dx/d*JOY_R; dy=dy/d*JOY_R; }
        joyDelta = { x: dx/JOY_R, y: dy/JOY_R };
        setKnob(moveKnob, dx, dy);
      }
    }, { passive: false });

    moveZone.addEventListener("touchend", e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== joyId) continue;
        joyId = null; joyDelta = {x:0,y:0};
        setKnob(moveKnob, 0, 0);
        if (moveBase) moveBase.style.opacity = "0.4";
      }
    }, { passive: false });
  }

  // ---- Джойстик прицела ----
  if (aimZone) {
    aimZone.addEventListener("touchstart", e => {
      e.preventDefault();
      const t = e.changedTouches[0];
      aimJoyId = t.identifier;
      const r = aimZone.getBoundingClientRect();
      aimJoyOrigin = { x: t.clientX - r.left, y: t.clientY - r.top };
      if (aimBase) { aimBase.style.left=aimJoyOrigin.x+"px"; aimBase.style.top=aimJoyOrigin.y+"px"; aimBase.style.opacity="1"; }
      setKnob(aimKnob, 0, 0);
      // Дебаг
      let dbg = document.getElementById("aim-debug");
      if (!dbg) { dbg=document.createElement("div"); dbg.id="aim-debug"; dbg.style.cssText="position:fixed;top:50px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#ff0;padding:4px 10px;border-radius:8px;font-size:12px;z-index:999;pointer-events:none"; document.body.appendChild(dbg); }
      dbg.textContent = `aim START id:${aimJoyId} zone:${r.width.toFixed(0)}x${r.height.toFixed(0)}`;
    }, { passive: false });

    aimZone.addEventListener("touchmove", e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== aimJoyId) continue;
        const r = aimZone.getBoundingClientRect();
        let dx = t.clientX - r.left - aimJoyOrigin.x;
        let dy = t.clientY - r.top  - aimJoyOrigin.y;
        const d = Math.hypot(dx, dy);
        if (d > JOY_R) { dx=dx/d*JOY_R; dy=dy/d*JOY_R; }
        setKnob(aimKnob, dx, dy);
        if (d > 5) {
          const angle = Math.atan2(dy, dx);
          // Дебаг
          let dbg = document.getElementById("aim-debug");
          if (!dbg) { dbg=document.createElement("div"); dbg.id="aim-debug"; dbg.style.cssText="position:fixed;top:50px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);color:#0f0;padding:4px 10px;border-radius:8px;font-size:12px;z-index:999;pointer-events:none"; document.body.appendChild(dbg); }
          // Применяем угол — используем функцию из game.js
          if (typeof setPlayerAngle === "function") {
            setPlayerAngle(angle);
            dbg.textContent = `angle:${(angle*180/Math.PI).toFixed(0)}° OK`;
          } else {
            dbg.textContent = `angle:${(angle*180/Math.PI).toFixed(0)}° no setPlayerAngle`;
          }
        }
      }
    }, { passive: false });

    aimZone.addEventListener("touchend", e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== aimJoyId) continue;
        aimJoyId = null;
        setKnob(aimKnob, 0, 0);
        if (aimBase) aimBase.style.opacity = "0.4";
      }
    }, { passive: false });
  }

  // Блокируем скролл в игре
  document.addEventListener("touchmove", e => {
    if (e.target.closest && e.target.closest("#game-screen")) e.preventDefault();
  }, { passive: false });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
