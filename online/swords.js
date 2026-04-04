// ---- SWORD SKINS ----
// draw(ctx, RADIUS, SWORD_LEN, attackPhase, attackAnim, isPlayer, particles)
// каждый скин рисует меч начиная от (RADIUS, 0) вправо

const SWORD_SKINS = [
  {
    id: "default",
    name: "Обычный",
    rarity: "common",
    unlockRating: 0,
    draw(ctx, R, SL, phase, anim, isPlayer) {
      const grad = ctx.createLinearGradient(R, 0, R + SL + 10, 0);
      grad.addColorStop(0, "#999"); grad.addColorStop(1, "#ddd");
      ctx.beginPath();
      ctx.moveTo(R, -3); ctx.lineTo(R+SL, -2); ctx.lineTo(R+SL+10, 0);
      ctx.lineTo(R+SL, 2); ctx.lineTo(R, 3); ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();
      ctx.strokeStyle = "#666"; ctx.lineWidth = 1; ctx.stroke();
      // гарда
      ctx.beginPath(); ctx.roundRect(R-5,-11,10,22,3);
      ctx.fillStyle="#b8902a"; ctx.fill();
      ctx.beginPath(); ctx.roundRect(R-6-3,-3,9,6,2);
      ctx.fillStyle="#5a3a1a"; ctx.fill();
    }
  },
  {
    id: "fire",
    name: "Огненный",
    rarity: "rare",
    unlockRating: 100,
    draw(ctx, R, SL, phase, anim, isPlayer, particles) {
      // лезвие
      const grad = ctx.createLinearGradient(R, 0, R+SL+10, 0);
      grad.addColorStop(0, "#ff4400"); grad.addColorStop(0.5, "#ff8800"); grad.addColorStop(1, "#ffdd00");
      ctx.beginPath();
      ctx.moveTo(R,-3); ctx.lineTo(R+SL,-2); ctx.lineTo(R+SL+10,0);
      ctx.lineTo(R+SL,2); ctx.lineTo(R,3); ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();
      ctx.strokeStyle="#ff6600"; ctx.lineWidth=1; ctx.stroke();
      // свечение
      ctx.save();
      ctx.shadowColor="#ff6600"; ctx.shadowBlur=18;
      ctx.strokeStyle="rgba(255,120,0,0.5)"; ctx.lineWidth=4;
      ctx.beginPath(); ctx.moveTo(R,0); ctx.lineTo(R+SL+10,0); ctx.stroke();
      ctx.restore();
      // гарда
      ctx.beginPath(); ctx.roundRect(R-5,-11,10,22,3);
      ctx.fillStyle="#cc3300"; ctx.fill();
      ctx.beginPath(); ctx.roundRect(R-9,-3,9,6,2);
      ctx.fillStyle="#7a2000"; ctx.fill();
      // частицы огня
      if (particles && (phase === "swing" || Math.random() < 0.3)) {
        for (let i=0;i<2;i++) {
          particles.push({
            x: R + Math.random()*SL, y: (Math.random()-0.5)*4,
            vx: Math.random()*0.5-1, vy: -(Math.random()*1.5+0.5),
            life: 1, color: `hsl(${20+Math.random()*40},100%,60%)`,
            size: Math.random()*4+2, type:"fire"
          });
        }
      }
    }
  },
  {
    id: "ice",
    name: "Ледяной",
    rarity: "rare",
    unlockRating: 200,
    draw(ctx, R, SL, phase, anim, isPlayer, particles) {
      const grad = ctx.createLinearGradient(R,0,R+SL+10,0);
      grad.addColorStop(0,"#88ddff"); grad.addColorStop(1,"#ffffff");
      ctx.beginPath();
      ctx.moveTo(R,-3); ctx.lineTo(R+SL,-2); ctx.lineTo(R+SL+10,0);
      ctx.lineTo(R+SL,2); ctx.lineTo(R,3); ctx.closePath();
      ctx.fillStyle=grad; ctx.fill();
      ctx.save();
      ctx.shadowColor="#00ccff"; ctx.shadowBlur=20;
      ctx.strokeStyle="rgba(100,220,255,0.6)"; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(R,0); ctx.lineTo(R+SL+10,0); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle="#aaeeff"; ctx.lineWidth=1; ctx.stroke();
      // кристаллы вдоль лезвия
      for(let i=0;i<3;i++){
        const px=R+SL*0.25+i*(SL*0.25);
        ctx.save(); ctx.translate(px,0);
        ctx.beginPath(); ctx.moveTo(0,-5); ctx.lineTo(3,0); ctx.lineTo(0,5); ctx.lineTo(-3,0); ctx.closePath();
        ctx.fillStyle="rgba(180,240,255,0.7)"; ctx.fill();
        ctx.restore();
      }
      ctx.beginPath(); ctx.roundRect(R-5,-11,10,22,3);
      ctx.fillStyle="#0088bb"; ctx.fill();
      ctx.beginPath(); ctx.roundRect(R-9,-3,9,6,2);
      ctx.fillStyle="#005577"; ctx.fill();
      if(particles && Math.random()<0.15){
        particles.push({
          x:R+Math.random()*SL, y:(Math.random()-0.5)*6,
          vx:(Math.random()-0.5)*0.5, vy:-Math.random()*0.8,
          life:1, color:"rgba(180,240,255,0.9)", size:Math.random()*3+1, type:"ice"
        });
      }
    }
  },
  {
    id: "lightning",
    name: "Молния",
    rarity: "epic",
    unlockRating: 400,
    draw(ctx, R, SL, phase, anim, isPlayer, particles) {
      ctx.save();
      ctx.shadowColor="#aa88ff"; ctx.shadowBlur=25;
      const grad=ctx.createLinearGradient(R,0,R+SL+10,0);
      grad.addColorStop(0,"#8844ff"); grad.addColorStop(0.5,"#cc88ff"); grad.addColorStop(1,"#ffffff");
      ctx.beginPath();
      ctx.moveTo(R,-3); ctx.lineTo(R+SL,-2); ctx.lineTo(R+SL+10,0);
      ctx.lineTo(R+SL,2); ctx.lineTo(R,3); ctx.closePath();
      ctx.fillStyle=grad; ctx.fill();
      ctx.restore();
      // зигзаг молнии
      ctx.save();
      ctx.strokeStyle="rgba(220,180,255,0.8)"; ctx.lineWidth=1.5;
      ctx.beginPath();
      const seg=SL/5;
      ctx.moveTo(R,0);
      for(let i=1;i<=5;i++){
        ctx.lineTo(R+seg*i, (i%2===0?-3:3));
      }
      ctx.lineTo(R+SL+10,0);
      ctx.stroke();
      ctx.restore();
      ctx.beginPath(); ctx.roundRect(R-5,-11,10,22,3);
      ctx.fillStyle="#6622cc"; ctx.fill();
      ctx.beginPath(); ctx.roundRect(R-9,-3,9,6,2);
      ctx.fillStyle="#330088"; ctx.fill();
      if(particles && Math.random()<0.4){
        particles.push({
          x:R+Math.random()*SL, y:(Math.random()-0.5)*8,
          vx:(Math.random()-0.5)*2, vy:(Math.random()-0.5)*2,
          life:1, color:`hsl(${260+Math.random()*40},100%,75%)`,
          size:Math.random()*3+1, type:"spark"
        });
      }
    }
  },
  {
    id: "shadow",
    name: "Тень",
    rarity: "epic",
    unlockRating: 600,
    draw(ctx, R, SL, phase, anim, isPlayer, particles) {
      ctx.save();
      ctx.shadowColor="#000"; ctx.shadowBlur=30;
      const grad=ctx.createLinearGradient(R,0,R+SL+10,0);
      grad.addColorStop(0,"#111"); grad.addColorStop(0.7,"#333"); grad.addColorStop(1,"#666");
      ctx.beginPath();
      ctx.moveTo(R,-4); ctx.lineTo(R+SL,-2.5); ctx.lineTo(R+SL+12,0);
      ctx.lineTo(R+SL,2.5); ctx.lineTo(R,4); ctx.closePath();
      ctx.fillStyle=grad; ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.shadowColor="rgba(80,0,120,0.9)"; ctx.shadowBlur=15;
      ctx.strokeStyle="rgba(120,0,180,0.5)"; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(R,0); ctx.lineTo(R+SL+12,0); ctx.stroke();
      ctx.restore();
      ctx.beginPath(); ctx.roundRect(R-5,-12,10,24,3);
      ctx.fillStyle="#1a001a"; ctx.fill();
      ctx.strokeStyle="rgba(120,0,180,0.6)"; ctx.lineWidth=1; ctx.stroke();
      ctx.beginPath(); ctx.roundRect(R-9,-3,9,6,2);
      ctx.fillStyle="#0d000d"; ctx.fill();
      if(particles && Math.random()<0.25){
        particles.push({
          x:R+Math.random()*SL, y:(Math.random()-0.5)*6,
          vx:(Math.random()-0.5)*1, vy:Math.random()*1,
          life:1, color:`rgba(${80+Math.random()*40},0,${120+Math.random()*60},0.8)`,
          size:Math.random()*4+2, type:"shadow"
        });
      }
    }
  },
  {
    id: "gold",
    name: "Золотой",
    rarity: "legendary",
    unlockRating: 1000,
    draw(ctx, R, SL, phase, anim, isPlayer, particles) {
      ctx.save();
      ctx.shadowColor="#ffcc00"; ctx.shadowBlur=30;
      const grad=ctx.createLinearGradient(R,0,R+SL+10,0);
      grad.addColorStop(0,"#aa7700"); grad.addColorStop(0.3,"#ffdd00");
      grad.addColorStop(0.6,"#ffe866"); grad.addColorStop(1,"#fff8aa");
      ctx.beginPath();
      ctx.moveTo(R,-4); ctx.lineTo(R+SL,-2.5); ctx.lineTo(R+SL+12,0);
      ctx.lineTo(R+SL,2.5); ctx.lineTo(R,4); ctx.closePath();
      ctx.fillStyle=grad; ctx.fill();
      ctx.strokeStyle="#cc9900"; ctx.lineWidth=1; ctx.stroke();
      ctx.restore();
      // узор
      ctx.save();
      ctx.strokeStyle="rgba(255,255,180,0.4)"; ctx.lineWidth=1;
      for(let i=0;i<4;i++){
        const px=R+SL*0.15+i*(SL*0.2);
        ctx.beginPath(); ctx.moveTo(px,-2); ctx.lineTo(px+4,0); ctx.lineTo(px,-2); ctx.stroke();
      }
      ctx.restore();
      ctx.beginPath(); ctx.roundRect(R-5,-12,10,24,3);
      ctx.fillStyle="#cc8800"; ctx.fill();
      ctx.strokeStyle="#ffcc00"; ctx.lineWidth=1; ctx.stroke();
      ctx.beginPath(); ctx.roundRect(R-9,-3,9,6,2);
      ctx.fillStyle="#7a4400"; ctx.fill();
      if(particles && Math.random()<0.3){
        particles.push({
          x:R+Math.random()*SL, y:(Math.random()-0.5)*5,
          vx:(Math.random()-0.5)*1.5, vy:-Math.random()*1.5,
          life:1, color:`hsl(${40+Math.random()*20},100%,${60+Math.random()*30}%)`,
          size:Math.random()*3+1, type:"star"
        });
      }
    }
  },
  {
    id: "plasma",
    name: "Плазма",
    rarity: "legendary",
    unlockRating: 2000,
    draw(ctx, R, SL, phase, anim, isPlayer, particles) {
      const t = Date.now()/400;
      ctx.save();
      ctx.shadowColor=`hsl(${(t*60)%360},100%,60%)`; ctx.shadowBlur=35;
      const grad=ctx.createLinearGradient(R,0,R+SL+10,0);
      grad.addColorStop(0,`hsl(${(t*60)%360},100%,50%)`);
      grad.addColorStop(0.5,`hsl(${(t*60+120)%360},100%,70%)`);
      grad.addColorStop(1,`hsl(${(t*60+240)%360},100%,90%)`);
      ctx.beginPath();
      ctx.moveTo(R,-4); ctx.lineTo(R+SL,-2.5); ctx.lineTo(R+SL+12,0);
      ctx.lineTo(R+SL,2.5); ctx.lineTo(R,4); ctx.closePath();
      ctx.fillStyle=grad; ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.shadowColor="white"; ctx.shadowBlur=10;
      ctx.strokeStyle="rgba(255,255,255,0.6)"; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(R,0); ctx.lineTo(R+SL+12,0); ctx.stroke();
      ctx.restore();
      ctx.beginPath(); ctx.roundRect(R-5,-12,10,24,3);
      ctx.fillStyle=`hsl(${(t*60)%360},80%,30%)`; ctx.fill();
      ctx.beginPath(); ctx.roundRect(R-9,-3,9,6,2);
      ctx.fillStyle="#111"; ctx.fill();
      if(particles){
        for(let i=0;i<2;i++){
          particles.push({
            x:R+Math.random()*SL, y:(Math.random()-0.5)*6,
            vx:(Math.random()-0.5)*2, vy:(Math.random()-0.5)*2,
            life:1, color:`hsl(${Math.random()*360},100%,70%)`,
            size:Math.random()*4+1, type:"plasma"
          });
        }
      }
    }
  },
  {
    id: "void",
    name: "Пустота",
    rarity: "mythic",
    unlockRating: 5000,
    draw(ctx, R, SL, phase, anim, isPlayer, particles) {
      ctx.save();
      ctx.shadowColor="#000"; ctx.shadowBlur=40;
      ctx.beginPath();
      ctx.moveTo(R,-5); ctx.lineTo(R+SL,-3); ctx.lineTo(R+SL+14,0);
      ctx.lineTo(R+SL,3); ctx.lineTo(R,5); ctx.closePath();
      ctx.fillStyle="#000"; ctx.fill();
      ctx.restore();
      // звёзды внутри
      ctx.save();
      ctx.clip();
      for(let i=0;i<6;i++){
        const sx=R+Math.random()*SL, sy=(Math.random()-0.5)*6;
        ctx.beginPath(); ctx.arc(sx,sy,Math.random()*1.5+0.5,0,Math.PI*2);
        ctx.fillStyle=`rgba(200,180,255,${Math.random()*0.8+0.2})`; ctx.fill();
      }
      ctx.restore();
      ctx.save();
      ctx.shadowColor="rgba(100,0,200,0.8)"; ctx.shadowBlur=20;
      ctx.strokeStyle="rgba(100,0,200,0.4)"; ctx.lineWidth=6;
      ctx.beginPath(); ctx.moveTo(R,0); ctx.lineTo(R+SL+14,0); ctx.stroke();
      ctx.restore();
      ctx.beginPath(); ctx.roundRect(R-5,-13,10,26,3);
      ctx.fillStyle="#050005"; ctx.fill();
      ctx.strokeStyle="rgba(100,0,200,0.5)"; ctx.lineWidth=1; ctx.stroke();
      ctx.beginPath(); ctx.roundRect(R-9,-3,9,6,2);
      ctx.fillStyle="#000"; ctx.fill();
      if(particles){
        for(let i=0;i<3;i++){
          particles.push({
            x:R+Math.random()*SL, y:(Math.random()-0.5)*8,
            vx:(Math.random()-0.5)*2, vy:(Math.random()-0.5)*2,
            life:1, color:`rgba(${80+Math.random()*40},0,${150+Math.random()*80},0.9)`,
            size:Math.random()*5+2, type:"void"
          });
        }
      }
    }
  },
];

const RARITY_COLOR = {
  common:    "#aaa",
  rare:      "#4488ff",
  epic:      "#aa44ff",
  legendary: "#ffaa00",
  mythic:    "linear-gradient(135deg,#ff44aa,#aa44ff,#44aaff)",
};

let selectedSwordId = localStorage.getItem("cf_sword") || "default";

function getSelectedSword() {
  return SWORD_SKINS.find(s => s.id === selectedSwordId) || SWORD_SKINS[0];
}
