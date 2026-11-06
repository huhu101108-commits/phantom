(()=>{'use strict';
const c=document.querySelector('#game'),ctx=c.getContext('2d'),W=960,H=540,ground=445;
const overlay=document.querySelector('#overlay'),title=document.querySelector('#overlayTitle'),desc=document.querySelector('#overlayDesc'),start=document.querySelector('#start');
const keys={},pressed={};let player,enemies=[],fx=[],bombs=[],slashes=[],score=0,wave=1,mode='menu',shake=0,clock=0,spawnTimer=0,notice='',noticeTime=0,last=0;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),rand=(a,b)=>a+Math.random()*(b-a);
function reset(){player={x:185,y:ground-58,w:29,h:58,vx:0,vy:0,face:1,hp:100,maxHp:100,momentum:0,grounded:true,attackCd:0,attackTime:0,combo:0,comboExpire:0,smokeCd:0,bombCd:0,backDashTime:0,backDashDir:0,ultimateTime:0,invuln:0,hitFlash:0,smokeAnim:0,bombAnim:0,landAnim:0,attackDuration:.16};enemies=[];fx=[];bombs=[];slashes=[];score=0;wave=1;clock=0;spawnTimer=0;shake=0;notice='제1파 · 감시병';noticeTime=2;spawnWave();mode='play';overlay.classList.add('hidden')}
function spawnWave(){const count=Math.min(2+wave,7);for(let i=0;i<count;i++){let x=rand(540,900);enemies.push({x,y:ground-51,w:30,h:51,vx:0,hp:wave%3===0?80:55,maxHp:wave%3===0?80:55,face:-1,cd:rand(.5,1.6),wind:0,stun:0,flash:0,elite:wave%3===0&&i===count-1,dead:false})}notice=`제${wave}파 · ${wave%3===0?'정예 경비병':'경비대'}`;noticeTime=2.2}
function smoke(x,y,n=18){for(let i=0;i<n;i++)fx.push({type:'smoke',x:x+rand(-10,10),y:y+rand(-20,15),vx:rand(-85,85),vy:rand(-85,5),r:rand(9,22),life:rand(.35,.8),max:.8})}
function spark(x,y,n=9,color='#e8d8ff'){for(let i=0;i<n;i++)fx.push({type:'spark',x,y,vx:rand(-170,170),vy:rand(-190,70),r:rand(2,5),life:rand(.15,.4),max:.4,color})}
function slash(power=1){if(player.attackCd>0||mode!=='play')return;player.combo=clock<player.comboExpire?(player.combo%3)+1:1;player.comboExpire=clock+.65;player.attackCd=player.combo===3?.27:.17;player.attackTime=.16;player.attackDuration=.16;const range=player.combo===3?92:76;slashes.push({x:player.x+player.w/2,y:player.y+28,face:player.face,life:.16,max:.16,range,ultimate:false});let hit=false;for(const e of enemies){if(e.dead)continue;const dx=e.x+e.w/2-(player.x+player.w/2);if(Math.sign(dx)===player.face&&Math.abs(dx)<range&&Math.abs(e.y-player.y)<76){damageEnemy(e,(player.combo===3?19:13)*power,player.face*175);hit=true}}if(hit)player.momentum=clamp(player.momentum+9,0,100)}
function damageEnemy(e,dmg,knock){e.hp-=dmg;e.stun=.23;e.vx=knock;e.flash=.14;spark(e.x+e.w/2,e.y+20,9,'#e8d6ff');shake=Math.max(shake,4);if(e.hp<=0&&!e.dead){e.dead=true;score+=e.elite?250:100;player.momentum=clamp(player.momentum+12,0,100);spark(e.x+e.w/2,e.y+15,22,'#f9e6aa')}}
function teleport(){if(player.smokeCd>0||mode!=='play')return;const ox=player.x;smoke(player.x+15,player.y+30,25);player.x=clamp(player.x+player.face*132,24,W-55);player.vy=Math.min(player.vy,0);player.invuln=.23;player.smokeCd=2.5;player.smokeAnim=.30;smoke(player.x+15,player.y+30,20);spark(player.x+15,player.y+22,7,'#ffffff');notice='백색 연막';noticeTime=.35;if(Math.abs(player.x-ox)<10)player.smokeCd=.4}
function backBomb(){if(player.bombCd>0||mode!=='play')return;const dir=player.face;player.backDashTime=.22;player.backDashDir=-dir;player.vx=-dir*510;player.vy=Math.min(player.vy,-105);player.invuln=.25;player.bombCd=3.2;player.bombAnim=.45;bombs.push({x:player.x+player.w/2+dir*20,y:player.y+16,vx:dir*340,vy:-175,life:1.15,exploded:false});smoke(player.x+15,player.y+30,9);notice='후퇴 폭탄';noticeTime=.4}
function explode(b){smoke(b.x,b.y,20);spark(b.x,b.y,20,'#ffd39a');shake=10;for(const e of enemies){if(e.dead)continue;let dx=e.x+15-b.x,dy=e.y+24-b.y;if(Math.hypot(dx,dy)<116)damageEnemy(e,36,Math.sign(dx||1)*240)}fx.push({type:'ring',x:b.x,y:b.y,r:1,life:.24,max:.24})}
function ultimate(){if(mode!=='play'||player.momentum<100)return;player.momentum=0;player.invuln=.45;player.ultimateTime=.38;shake=13;notice='월광 일섬';noticeTime=1;slashes.push({x:player.x+15,y:player.y+20,face:player.face,life:.35,max:.35,range:250,ultimate:true});for(const e of enemies){let dx=e.x+15-(player.x+15);if(!e.dead&&Math.sign(dx)===player.face&&Math.abs(dx)<250&&Math.abs(e.y-player.y)<90)damageEnemy(e,72,player.face*320)}spark(player.x+60*player.face,player.y+24,28,'#ffffff')}
function hurt(d){if(player.invuln>0)return;player.hp=clamp(player.hp-d,0,100);player.invuln=.65;player.hitFlash=.18;player.vx=-player.face*170;shake=8;spark(player.x+15,player.y+26,12,'#ff879d');if(player.hp<=0)end(false)}
function end(win){mode=win?'win':'dead';title.textContent=win?'승리':'전투 종료';desc.textContent=`점수 ${score.toLocaleString()} · ${wave}파 도달. 다시 도전해 더 오래 살아남아 보자.`;start.textContent='다시 시작';overlay.classList.remove('hidden')}
function input(k){if(mode!=='play')return;if(k==='z')slash();if(k==='x')teleport();if(k==='c')backBomb();if(k==='v')ultimate();if(k===' '&&player.grounded){player.vy=-590;player.grounded=false}}
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if([' ','arrowup','arrowleft','arrowright'].includes(k))e.preventDefault();if(k==='r'){reset();return}if(!keys[k])input(k);keys[k]=true});window.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);window.addEventListener('blur',()=>Object.keys(keys).forEach(k=>keys[k]=false));
for(const b of document.querySelectorAll('[data-key]')){const k=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(!keys[k])input(k);keys[k]=true});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>keys[k]=false)}
start.addEventListener('click',()=>{if(mode==='pause'){mode='play';overlay.classList.add('hidden')}else reset()});document.querySelector('#help').addEventListener('click',()=>{if(mode==='play'){mode='pause';title.textContent='조작법';desc.textContent='←/→ 이동 · Space 점프 · Z 빠른 3연격 · X 흰 연막 순간이동 · C 뒤로 대시하며 폭탄 투척 · V 기세 100일 때 월광 일섬 · R 재시작';start.textContent='계속하기';overlay.classList.remove('hidden')}else if(mode==='pause'){mode='play';overlay.classList.add('hidden')}else{title.textContent='조작법';desc.textContent='←/→ 이동 · Space 점프 · Z 빠른 3연격 · X 흰 연막 순간이동 · C 뒤로 대시하며 폭탄 투척 · V 기세 100일 때 월광 일섬';start.textContent='전투 시작';overlay.classList.remove('hidden')}});start.addEventListener('click',()=>{});
function update(dt){if(mode!=='play')return;clock+=dt;noticeTime=Math.max(0,noticeTime-dt);shake=Math.max(0,shake-35*dt);for(const k of ['attackCd','attackTime','smokeCd','bombCd','ultimateTime','invuln','hitFlash','smokeAnim','bombAnim','landAnim'])player[k]=Math.max(0,player[k]-dt);
const move=(keys.arrowleft?-1:0)+(keys.arrowright?1:0);if(player.backDashTime>0){player.backDashTime=Math.max(0,player.backDashTime-dt);player.vx=player.backDashDir*510;}else if(move){player.vx+=move*2400*dt;player.vx=clamp(player.vx,-275,275);player.face=move}else player.vx*=Math.max(0,1-9*dt);player.vy+=1500*dt;player.x=clamp(player.x+player.vx*dt,18,W-player.w-18);player.y+=player.vy*dt;if(player.y+player.h>=ground){if(!player.grounded&&player.vy>200)player.landAnim=.15;player.y=ground-player.h;player.vy=0;player.grounded=true}else player.grounded=false;
for(const e of enemies){if(e.dead)continue;e.cd-=dt;e.stun=Math.max(0,e.stun-dt);e.flash=Math.max(0,e.flash-dt);const dx=player.x-e.x;if(e.stun<=0){if(e.wind>0){e.wind-=dt;if(e.wind<=0){e.cd=rand(1.0,1.6);if(Math.abs(dx)<75&&Math.abs(player.y-e.y)<65)hurt(e.elite?22:13);spark(e.x+e.face*35,e.y+25,5,'#ff889a')}}else if(Math.abs(dx)>52){e.vx=clamp(dx*2.1,-(e.elite?125:90),e.elite?125:90);e.face=Math.sign(dx)}else{e.vx*=.7;e.face=Math.sign(dx)||e.face;if(e.cd<=0){e.wind=.45;e.vx=0}}}else e.vx*=Math.max(0,1-5*dt);e.x=clamp(e.x+e.vx*dt,10,W-40)}enemies=enemies.filter(e=>!e.dead);
for(const b of bombs){b.life-=dt;b.vy+=900*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.y>ground-12)b.life=0;if(b.life<=0&&!b.exploded){b.exploded=true;explode(b)}}bombs=bombs.filter(b=>!b.exploded);
for(const f of fx){f.life-=dt;if(f.type==='smoke'){f.x+=f.vx*dt;f.y+=f.vy*dt;f.r+=18*dt}else if(f.type==='spark'){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=340*dt}else if(f.type==='ring')f.r+=520*dt}fx=fx.filter(f=>f.life>0);for(const s of slashes)s.life-=dt;slashes=slashes.filter(s=>s.life>0);
if(enemies.length===0){spawnTimer+=dt;if(spawnTimer>1.9){wave++;player.hp=clamp(player.hp+17,0,100);spawnWave();spawnTimer=0}}else spawnTimer=0;
}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h)}function text(t,x,y,size=14,color='#fff',align='left'){ctx.fillStyle=color;ctx.font=`${size}px system-ui`;ctx.textAlign=align;ctx.fillText(t,x,y)}
// v0.6: layered cutout rig, sourced from the approved character artwork.
// Each limb and coat layer rotates around a different joint; these are genuine
// pose changes rather than rotating a single full-body illustration.
const rigNames=['cape_back','cape_right','leg_left','leg_right','body','arm_left','arm_right','head','scarf'];
const rig={};for(const name of rigNames){const im=new Image();im.src=`assets/${name}.png`;rig[name]=im}
const heroImage=new Image();heroImage.src='assets/hero.png';
const ease=t=>t*t*(3-2*t);
function layer(name,px,py,angle=0,dx=0,dy=0,sx=1,sy=1){
 const im=rig[name];if(!im.complete||!im.naturalWidth)return;
 ctx.save();ctx.translate(px+dx,py+dy);ctx.rotate(angle);ctx.scale(sx,sy);
 ctx.drawImage(im,-px,-py);ctx.restore();
}
function drawHero(){
 if(!player)return;const p=player;
 const run=p.grounded&&Math.abs(p.vx)>35&&p.backDashTime<=0;
 const air=!p.grounded,fall=air&&p.vy>60;
 const dash=p.backDashTime>0,bomb=p.bombAnim>0,smoke=p.smokeAnim>0;
 const atk=p.attackTime>0,ult=p.ultimateTime>0;
 const t=clock,phase=t*19,step=run?Math.sin(phase):0;
 const atkProgress=atk?1-p.attackTime/p.attackDuration:0;
 const ultProgress=ult?1-p.ultimateTime/.38:0;
 const land=p.landAnim>0?p.landAnim/.15:0;
 const bob=run?Math.abs(step)*2.2:Math.sin(t*2.6)*.7;
 const squash=land?1-.10*land:1;
 const lean=dash?-.33:ult?-.16:atk?.12:run?.12:air?-.10:0;
 const cloakSwing=run?Math.sin(phase-1)*.14:Math.sin(t*2.4)*.045;
 const legA=dash?.6:air?(fall?-.15:.50):run?step*.60:Math.sin(t*1.8)*.025;
 const legB=dash?-.6:air?(fall?.30:-.36):run?-step*.60:-Math.sin(t*1.8)*.025;
 let leftArm=run?-step*.33:-.06,rightArm=run?step*.32:.05;
 if(air){leftArm=-.20;rightArm=.25}
 if(dash){leftArm=-.72;rightArm=.55}
 if(bomb){rightArm=-1.30*ease(Math.min(1,(.45-p.bombAnim)/.23))+.12;leftArm=-.4}
 if(atk){
   const swing=Math.sin(atkProgress*Math.PI);
   rightArm=p.combo===2?1.7-2.7*ease(atkProgress):-1.65+2.7*ease(atkProgress);
   leftArm=-.35*swing;
 }
 if(ult){rightArm=-2.0+3.4*ease(ultProgress);leftArm=-.75}
 const footX=p.x+p.w/2,footY=p.y+p.h+bob;
 ctx.save();if(p.invuln>0&&Math.floor(clock*18)%2)ctx.globalAlpha=.55;
 ctx.translate(footX,footY);ctx.scale(p.face,1);
 // Original artwork is 163 x 293, anchored at (82, 291).
 const scale=.273;ctx.scale(scale,scale);ctx.translate(-82,-291);
 // Body leans from hip; legs have independent hip pivots.
 layer('cape_back',48,110,cloakSwing-(run?.15:0)-(dash?.35:0));
 layer('leg_left',68,166,legA);
 layer('leg_right',96,166,legB);
 ctx.save();ctx.translate(82,166);ctx.rotate(lean);ctx.scale(1,squash);ctx.translate(-82,-166);
 layer('cape_right',123,109,-cloakSwing*.8+(dash?.4:0));
 layer('body',82,137,0);
 layer('arm_left',47,88,leftArm);
 layer('arm_right',121,89,rightArm);
 layer('head',82,65,run?step*.025:Math.sin(t*1.5)*.012);
 layer('scarf',101,80,run?.10+step*.10:dash?.30:Math.sin(t*3)*.05);
 // The sword is attached to the right wrist, and follows attack frames.
 ctx.save();ctx.translate(144,164);ctx.rotate(rightArm*.88);
 ctx.strokeStyle='#bca17d';ctx.lineWidth=7;ctx.lineCap='round';
 ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(19,-15);ctx.stroke();
 ctx.strokeStyle='#eef5ff';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(19,-15);ctx.lineTo(110,-88);ctx.stroke();
 ctx.strokeStyle='#c3d9f5';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(23,-18);ctx.lineTo(103,-83);ctx.stroke();ctx.restore();
 ctx.restore();
 if(smoke){ctx.globalAlpha*=.75+.25*Math.sin(t*80);}
 ctx.restore();
 // Fallback if layers are not loaded yet.
 if(!rig.body.complete||!rig.body.naturalWidth){ctx.save();ctx.translate(footX,footY);ctx.scale(p.face,1);if(heroImage.complete&&heroImage.naturalWidth)ctx.drawImage(heroImage,-22,-79,44,79);ctx.restore()}
}
function draw(){ctx.clearRect(0,0,W,H);ctx.save();if(shake>0)ctx.translate(rand(-shake,shake),rand(-shake,shake));const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#101326');sky.addColorStop(1,'#25233a');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);ctx.fillStyle='#d5d5e8';ctx.globalAlpha=.8;ctx.beginPath();ctx.arc(765,90,33,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
for(let i=0;i<18;i++){let x=i*65-15,h=randStatic(i)*105+105;rect(x,ground-h,54,h,'#171b2c');for(let j=0;j<5;j++){if((i+j)%3!==0)rect(x+12+j%2*23,ground-h+25+j*19,7,10,'#57516a')}}rect(0,ground,W,H-ground,'#282737');rect(0,ground,W,5,'#77718a');for(let i=0;i<12;i++)rect(i*92+20,ground+36,58,2,'#393746');
for(const e of enemies){ctx.save();if(e.flash)ctx.globalAlpha=.6;rect(e.x+5,e.y+10,21,e.h-10,e.elite?'#9d5d69':'#59647e');rect(e.x+3,e.y,25,19,e.elite?'#c9a2a9':'#a1adc2');rect(e.x+(e.face===1?26:-12),e.y+23,13,4,'#e4c5b0');rect(e.x,e.y-11,30,5,'#3a344a');rect(e.x,e.y-11,30*clamp(e.hp/e.maxHp,0,1),5,'#dc8798');if(e.wind>0){ctx.strokeStyle='#ff657a';ctx.lineWidth=4;ctx.beginPath();ctx.arc(e.x+15,e.y+25,37,-1.2,1.2);ctx.stroke()}ctx.restore()}
for(const b of bombs){ctx.fillStyle='#e9c4a5';ctx.beginPath();ctx.arc(b.x,b.y,8,0,7);ctx.fill();rect(b.x-2,b.y-12,4,5,'#fff0bb')}
drawHero();
for(const s of slashes){ctx.save();ctx.globalAlpha=s.life/s.max;ctx.strokeStyle=s.ultimate?'#fff8df':'#e5d6ff';ctx.lineWidth=s.ultimate?16:8;ctx.shadowBlur=20;ctx.shadowColor='#d2b9ff';ctx.beginPath();let cx=s.x+s.face*s.range*.46;ctx.ellipse(cx,s.y,s.range*.47,s.ultimate?65:44,0,s.face===1?-.95:Math.PI-.25,s.face===1?.95:Math.PI+.95,s.face!==1);ctx.stroke();ctx.restore()}
for(const f of fx){ctx.save();ctx.globalAlpha=clamp(f.life/f.max,0,1)*(f.type==='smoke'?.64:1);if(f.type==='smoke'){ctx.fillStyle='#f9f9ff';ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,7);ctx.fill()}else if(f.type==='spark'){ctx.fillStyle=f.color;ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,7);ctx.fill()}else{ctx.strokeStyle='#ffdbb2';ctx.lineWidth=8;ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,7);ctx.stroke()}ctx.restore()}
ctx.restore();if(player){rect(24,22,240,15,'#343248');rect(24,22,240*player.hp/100,15,'#e58ca1');text(`체력 ${Math.ceil(player.hp)}`,30,34,11,'#16121b');rect(24,47,240,11,'#343248');rect(24,47,240*player.momentum/100,11,'#c7a9fa');text(`기세 ${Math.floor(player.momentum)} / 100`,274,57,12,'#e1d4fa');text(`점수 ${score.toLocaleString()}    WAVE ${wave}`,W-24,34,17,'#f1eafc','right');const abilities=[['Z 검술',0],['X 연막',player.smokeCd],['C 폭탄',player.bombCd],['V 월광 일섬',player.momentum>=100?0:99]];abilities.forEach((a,i)=>{const x=24+i*147;rect(x,H-50,136,30,a[1]===0?'#52436f':'#292b3e');text(a[0],x+9,H-30,12,a[1]===0?'#fff':'#a19cac');if(a[1]>0&&a[1]!==99)text(a[1].toFixed(1),x+126,H-30,12,'#e5b8c0','right')});if(noticeTime>0)text(notice,W/2,120,24,'#f7eafc','center')}}
function randStatic(n){const v=Math.sin(n*127.1+3.5)*43758.5453;return v-Math.floor(v)}
function frame(t){const dt=Math.min((t-last)/1000||0,.033);last=t;update(dt);draw();requestAnimationFrame(frame)}requestAnimationFrame(frame);
})();
