// ---- CHEAT MENU ----

// Фоновая анимация
(function(){
  const cv=document.getElementById("bg");
  const cx=cv.getContext("2d");
  let W,H;
  const pts=[];
  function resize(){W=cv.width=window.innerWidth;H=cv.height=window.innerHeight;}
  resize();window.addEventListener("resize",resize);
  for(let i=0;i<50;i++) pts.push({
    x:Math.random()*3000,y:Math.random()*2000,
    vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,
    r:Math.random()*1.5+.5,hue:220+Math.random()*60,alpha:Math.random()*.4+.1
  });
  function draw(){
    cx.clearRect(0,0,W,H);
    for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++){
      const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.hypot(dx,dy);
      if(d<120){cx.beginPath();cx.moveTo(pts[i].x,pts[i].y);cx.lineTo(pts[j].x,pts[j].y);cx.strokeStyle=`rgba(100,80,255,${(1-d/120)*.12})`;cx.lineWidth=1;cx.stroke();}
    }
    pts.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0)p.x=W;if(p.x>W)p.x=0;if(p.y<0)p.y=H;if(p.y>H)p.y=0;
      cx.save();cx.shadowColor=`hsl(${p.hue},80%,65%)`;cx.shadowBlur=8;
      cx.beginPath();cx.arc(p.x,p.y,p.r,0,Math.PI*2);
      cx.fillStyle=`hsla(${p.hue},80%,65%,${p.alpha})`;cx.fill();cx.restore();
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ---- INIT ----
// Загрузить текущие значения
document.getElementById("bot-mmr").value    = localStorage.getItem("cf_rating")        || 0;
document.getElementById("online-mmr").value = localStorage.getItem("cf_rating_online") || 0;
document.getElementById("nick-input").value = localStorage.getItem("cf_nickname")      || "";
document.getElementById("skin-select").value= localStorage.getItem("cf_sword")         || "default";

// ---- TABS ----
function switchTab(name, btn){
  document.querySelectorAll(".tab-content").forEach(t=>t.classList.remove("active"));
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  document.getElementById("tab-"+name).classList.add("active");
  btn.classList.add("active");
}

// ---- NOTIFICATIONS ----
let notifTimer;
function notify(msg){
  const el=document.getElementById("notif")||createNotif();
  el.textContent=msg; el.classList.add("show");
  clearTimeout(notifTimer);
  notifTimer=setTimeout(()=>el.classList.remove("show"),2000);
}
function createNotif(){
  const el=document.createElement("div");el.id="notif";document.body.appendChild(el);return el;
}

// ---- STATS ----
function applyBotMMR(){
  const v=Math.min(12500,Math.max(0,parseInt(document.getElementById("bot-mmr").value)||0));
  localStorage.setItem("cf_rating",v);
  notify("Бот MMR → "+v);
}
function applyOnlineMMR(){
  const v=Math.min(12500,Math.max(0,parseInt(document.getElementById("online-mmr").value)||0));
  localStorage.setItem("cf_rating_online",v);
  notify("Онлайн MMR → "+v);
}
function maxMMR(){
  localStorage.setItem("cf_rating",12500);
  localStorage.setItem("cf_rating_online",12500);
  document.getElementById("bot-mmr").value=12500;
  document.getElementById("online-mmr").value=12500;
  notify("MMR → 12500 ✓");
}
function resetMMR(){
  localStorage.setItem("cf_rating",0);
  localStorage.setItem("cf_rating_online",0);
  document.getElementById("bot-mmr").value=0;
  document.getElementById("online-mmr").value=0;
  notify("MMR сброшен");
}
function applyNick(){
  const v=document.getElementById("nick-input").value.trim();
  if(!v)return;
  localStorage.setItem("cf_nickname",v);
  notify("Ник → "+v);
}

// ---- GAME CHEATS (инжект в игру через localStorage флаги) ----
function toggleInfShield(el){
  localStorage.setItem("cheat_inf_shield", el.checked?"1":"0");
  notify(el.checked?"Бесконечный щит ВКЛ":"Бесконечный щит ВЫКЛ");
}
function toggleInfHP(el){
  localStorage.setItem("cheat_inf_hp", el.checked?"1":"0");
  notify(el.checked?"Бесконечный HP ВКЛ":"Бесконечный HP ВЫКЛ");
}
function toggleOneShot(el){
  localStorage.setItem("cheat_one_shot", el.checked?"1":"0");
  notify(el.checked?"One Shot ВКЛ":"One Shot ВЫКЛ");
}
function toggleFreezeBot(el){
  localStorage.setItem("cheat_freeze_bot", el.checked?"1":"0");
  notify(el.checked?"Бот заморожен":"Бот разморожен");
}
function updateSpeed(el){
  const v=(el.value/2).toFixed(1);
  document.getElementById("speed-val").textContent=v;
  localStorage.setItem("cheat_speed",v);
}

// ---- VISUAL ----
function unlockAllSkins(){
  // Ставим максимальный рейтинг чтобы разблокировать все скины
  localStorage.setItem("cf_rating",12500);
  localStorage.setItem("cf_rating_online",12500);
  notify("Все скины разблокированы ✓");
}
function applySkin(id){
  localStorage.setItem("cf_sword",id);
  notify("Скин → "+id);
}
function setTheme(t){
  localStorage.setItem("cf_theme",t);
  notify("Тема → "+t);
}

// ---- OPEN GAME ----
function openGame(){
  window.open("../server/online/index.html","_blank");
}
