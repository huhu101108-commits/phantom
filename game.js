(()=>{'use strict';
const c=document.querySelector('#game'),ctx=c.getContext('2d'),W=960,H=540,ground=445;
const overlay=document.querySelector('#overlay'),title=document.querySelector('#overlayTitle'),desc=document.querySelector('#overlayDesc'),start=document.querySelector('#start');
const keys={},pressed={};let player,enemies=[],fx=[],bombs=[],slashes=[],score=0,wave=1,mode='menu',shake=0,clock=0,spawnTimer=0,notice='',noticeTime=0,last=0;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),rand=(a,b)=>a+Math.random()*(b-a);
function reset(){player={x:185,y:ground-58,w:29,h:58,vx:0,vy:0,face:1,hp:100,maxHp:100,momentum:0,grounded:true,attackCd:0,attackTime:0,combo:0,comboExpire:0,smokeCd:0,bombCd:0,backDashTime:0,backDashDir:0,ultimateTime:0,invuln:0,hitFlash:0,smokeAnim:0,bombAnim:0,landAnim:0,attackDuration:.16,attackPose:0,attackAnimStart:0,bombLaunch:null};enemies=[];fx=[];bombs=[];slashes=[];score=0;wave=1;clock=0;spawnTimer=0;shake=0;notice='제1파 · 감시병';noticeTime=2;spawnWave();mode='play';overlay.classList.add('hidden')}
function spawnWave(){const count=Math.min(2+wave,7);for(let i=0;i<count;i++){let x=rand(540,900);enemies.push({x,y:ground-51,w:30,h:51,vx:0,hp:wave%3===0?80:55,maxHp:wave%3===0?80:55,face:-1,cd:rand(.5,1.6),wind:0,stun:0,flash:0,elite:wave%3===0&&i===count-1,dead:false})}notice=`제${wave}파 · ${wave%3===0?'정예 경비병':'경비대'}`;noticeTime=2.2}
function smoke(x,y,n=18){for(let i=0;i<n;i++)fx.push({type:'smoke',x:x+rand(-10,10),y:y+rand(-20,15),vx:rand(-85,85),vy:rand(-85,5),r:rand(9,22),life:rand(.35,.8),max:.8})}
function spark(x,y,n=9,color='#e8d8ff'){for(let i=0;i<n;i++)fx.push({type:'spark',x,y,vx:rand(-170,170),vy:rand(-190,70),r:rand(2,5),life:rand(.15,.4),max:.4,color})}
// A slash is a swept blade segment. The same geometry draws the trail and hits enemies.
function swordGeometry(combo,face,x,y){
 const pivotX=x+14+face*12,pivotY=y+24;
 const radius=combo===3?95:combo===2?83:78;
 const angles=combo===2?[.88,-.98]:[-1.05,.78];
 const pts=[];
 for(let i=0;i<=16;i++){
  const a=angles[0]+(angles[1]-angles[0])*i/16;
  pts.push([pivotX+face*Math.cos(a)*radius,pivotY+Math.sin(a)*radius]);
 }
 return {pts,pivotX,pivotY,radius};
}
function pointSegDistance(px,py,ax,ay,bx,by){
 const dx=bx-ax,dy=by-ay,t=clamp(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1),0,1);
 return Math.hypot(px-ax-dx*t,py-ay-dy*t);
}
function slash(power=1){if(player.attackCd>0||mode!=='play')return;
 player.combo=clock<player.comboExpire?(player.combo%3)+1:1;player.comboExpire=clock+.65;
 player.attackCd=player.combo===3?.32:.24;player.attackTime=.26;player.attackDuration=.26;
 player.attackPose=player.combo;player.attackAnimStart=clock;
 player.pendingStrike={delay:.095,combo:player.combo,power,face:player.face};
}
function resolveStrike(strike){
 const g=swordGeometry(strike.combo,strike.face,player.x,player.y);
 slashes.push({pts:g.pts,life:.16,max:.16,ultimate:false,combo:strike.combo});
 let hit=false;
 for(const e of enemies){if(e.dead)continue;
  const ex=e.x+e.w/2,ey=e.y+e.h*.46;
  const front=(ex-g.pivotX)*strike.face>0;
  const touches=front&&g.pts.some((pt,i)=>i>0&&[e.y+12,e.y+e.h*.46,e.y+e.h-10].some(ty=>pointSegDistance(ex,ty,...g.pts[i-1],...pt)<e.w*.5+9));
  if(touches){damageEnemy(e,(strike.combo===3?19:13)*strike.power,strike.face*175);hit=true;}
 }
 if(hit)player.momentum=clamp(player.momentum+9,0,100);
}
function damageEnemy(e,dmg,knock){e.hp-=dmg;e.stun=.23;e.vx=knock;e.flash=.14;spark(e.x+e.w/2,e.y+20,9,'#e8d6ff');shake=Math.max(shake,4);if(e.hp<=0&&!e.dead){e.dead=true;score+=e.elite?250:100;player.momentum=clamp(player.momentum+12,0,100);spark(e.x+e.w/2,e.y+15,22,'#f9e6aa')}}
function teleport(){if(player.smokeCd>0||mode!=='play')return;const ox=player.x;smoke(player.x+15,player.y+30,25);player.x=clamp(player.x+player.face*132,24,W-55);player.vy=Math.min(player.vy,0);player.invuln=.23;player.smokeCd=2.5;player.smokeAnim=.30;smoke(player.x+15,player.y+30,20);spark(player.x+15,player.y+22,7,'#ffffff');notice='백색 연막';noticeTime=.35;if(Math.abs(player.x-ox)<10)player.smokeCd=.4}
function backBomb(){if(player.bombCd>0||mode!=='play')return;
 const dir=player.face;
 player.backDashTime=.26;player.backDashDir=-dir;player.vx=-dir*465;
 // A backward leap: vertical impulse is always applied, including while airborne.
 player.vy=-435;player.grounded=false;
 player.invuln=.30;player.bombCd=3.2;player.bombAnim=.50;
 // Release from the forward hand shortly after the leap starts.
 player.bombLaunch={delay:.075,dir};
 smoke(player.x+15,player.y+player.h-5,14);notice='도약 폭탄';noticeTime=.5;
}
function launchBomb(dir){
 const x=player.x+player.w/2+dir*24,y=player.y+18;
 bombs.push({x,y,vx:dir*315,vy:-205,life:1.3,exploded:false,trail:[]});
 spark(x,y,5,'#fff4df');
}
function explode(b){smoke(b.x,b.y,20);spark(b.x,b.y,20,'#ffd39a');shake=10;for(const e of enemies){if(e.dead)continue;let dx=e.x+15-b.x,dy=e.y+24-b.y;if(Math.hypot(dx,dy)<116)damageEnemy(e,36,Math.sign(dx||1)*240)}fx.push({type:'ring',x:b.x,y:b.y,r:1,life:.24,max:.24})}
function ultimate(){if(mode!=='play'||player.momentum<100)return;player.momentum=0;player.invuln=.45;player.ultimateTime=.48;player.pendingUltimate={delay:.19,face:player.face};notice='월광 일섬';noticeTime=1}
function hurt(d){if(player.invuln>0)return;player.hp=clamp(player.hp-d,0,100);player.invuln=.65;player.hitFlash=.18;player.vx=-player.face*170;shake=8;spark(player.x+15,player.y+26,12,'#ff879d');if(player.hp<=0)end(false)}
function end(win){mode=win?'win':'dead';title.textContent=win?'승리':'전투 종료';desc.textContent=`점수 ${score.toLocaleString()} · ${wave}파 도달. 다시 도전해 더 오래 살아남아 보자.`;start.textContent='다시 시작';overlay.classList.remove('hidden')}
function input(k){if(mode!=='play')return;if(k==='z')slash();if(k==='x')teleport();if(k==='c')backBomb();if(k==='v')ultimate();if(k===' '&&player.grounded){player.vy=-590;player.grounded=false}}
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if([' ','arrowup','arrowleft','arrowright'].includes(k))e.preventDefault();if(k==='r'){reset();return}if(!keys[k])input(k);keys[k]=true});window.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);window.addEventListener('blur',()=>Object.keys(keys).forEach(k=>keys[k]=false));
for(const b of document.querySelectorAll('[data-key]')){const k=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(!keys[k])input(k);keys[k]=true});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>keys[k]=false)}
start.addEventListener('click',()=>{if(mode==='pause'){mode='play';overlay.classList.add('hidden')}else reset()});document.querySelector('#help').addEventListener('click',()=>{if(mode==='play'){mode='pause';title.textContent='조작법';desc.textContent='←/→ 이동 · Space 점프 · Z 빠른 3연격 · X 흰 연막 순간이동 · C 뒤로 대시하며 폭탄 투척 · V 기세 100일 때 월광 일섬 · R 재시작';start.textContent='계속하기';overlay.classList.remove('hidden')}else if(mode==='pause'){mode='play';overlay.classList.add('hidden')}else{title.textContent='조작법';desc.textContent='←/→ 이동 · Space 점프 · Z 빠른 3연격 · X 흰 연막 순간이동 · C 뒤로 대시하며 폭탄 투척 · V 기세 100일 때 월광 일섬';start.textContent='전투 시작';overlay.classList.remove('hidden')}});start.addEventListener('click',()=>{});
function update(dt){if(mode!=='play')return;clock+=dt;noticeTime=Math.max(0,noticeTime-dt);shake=Math.max(0,shake-35*dt);for(const k of ['attackCd','attackTime','smokeCd','bombCd','ultimateTime','invuln','hitFlash','smokeAnim','bombAnim','landAnim'])player[k]=Math.max(0,player[k]-dt);
if(player.bombLaunch){player.bombLaunch.delay-=dt;if(player.bombLaunch.delay<=0){launchBomb(player.bombLaunch.dir);player.bombLaunch=null}}
if(player.pendingStrike){player.pendingStrike.delay-=dt;if(player.pendingStrike.delay<=0){resolveStrike(player.pendingStrike);player.pendingStrike=null}}
if(player.pendingUltimate){player.pendingUltimate.delay-=dt;if(player.pendingUltimate.delay<=0){const dir=player.pendingUltimate.face;player.pendingUltimate=null;shake=13;slashes.push({x:player.x+15,y:player.y+20,face:dir,life:.22,max:.22,range:250,ultimate:true});for(const e of enemies){const dx=e.x+15-(player.x+15);if(!e.dead&&dx*dir>0&&Math.abs(dx)<250&&Math.abs(e.y-player.y)<90)damageEnemy(e,72,dir*320)}spark(player.x+60*dir,player.y+24,28,'#ffffff')}}
const move=(keys.arrowleft?-1:0)+(keys.arrowright?1:0);if(player.backDashTime>0){player.backDashTime=Math.max(0,player.backDashTime-dt);player.vx=player.backDashDir*510;}else if(move){player.vx+=move*2400*dt;player.vx=clamp(player.vx,-275,275);player.face=move}else player.vx*=Math.max(0,1-9*dt);player.vy+=1500*dt;player.x=clamp(player.x+player.vx*dt,18,W-player.w-18);player.y+=player.vy*dt;if(player.y+player.h>=ground){if(!player.grounded&&player.vy>200)player.landAnim=.15;player.y=ground-player.h;player.vy=0;player.grounded=true}else player.grounded=false;
for(const e of enemies){if(e.dead)continue;e.cd-=dt;e.stun=Math.max(0,e.stun-dt);e.flash=Math.max(0,e.flash-dt);const dx=player.x-e.x;if(e.stun<=0){if(e.wind>0){e.wind-=dt;if(e.wind<=0){e.cd=rand(1.0,1.6);if(Math.abs(dx)<75&&Math.abs(player.y-e.y)<65)hurt(e.elite?22:13);spark(e.x+e.face*35,e.y+25,5,'#ff889a')}}else if(Math.abs(dx)>52){e.vx=clamp(dx*2.1,-(e.elite?125:90),e.elite?125:90);e.face=Math.sign(dx)}else{e.vx*=.7;e.face=Math.sign(dx)||e.face;if(e.cd<=0){e.wind=.45;e.vx=0}}}else e.vx*=Math.max(0,1-5*dt);e.x=clamp(e.x+e.vx*dt,10,W-40)}enemies=enemies.filter(e=>!e.dead);
for(const b of bombs){b.life-=dt;b.vy+=900*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.trail.push([b.x,b.y]);if(b.trail.length>10)b.trail.shift();if(b.y>ground-12)b.life=0;if(b.life<=0&&!b.exploded){b.exploded=true;explode(b)}}bombs=bombs.filter(b=>!b.exploded);
for(const f of fx){f.life-=dt;if(f.type==='smoke'){f.x+=f.vx*dt;f.y+=f.vy*dt;f.r+=18*dt}else if(f.type==='spark'){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=340*dt}else if(f.type==='ring')f.r+=520*dt}fx=fx.filter(f=>f.life>0);for(const s of slashes)s.life-=dt;slashes=slashes.filter(s=>s.life>0);
if(enemies.length===0){spawnTimer+=dt;if(spawnTimer>1.9){wave++;player.hp=clamp(player.hp+17,0,100);spawnWave();spawnTimer=0}}else spawnTimer=0;
}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h)}function text(t,x,y,size=14,color='#fff',align='left'){ctx.fillStyle=color;ctx.font=`${size}px system-ui`;ctx.textAlign=align;ctx.fillText(t,x,y)}
// v0.7: hand-drawn sprite-frame sequences, replacing the old joint-cutout rig.
const animNames={idle:8,run:8,jump:6,attack:12,dash:6,bomb:8,ultimate:12};
const anim={};for(const [name,count] of Object.entries(animNames)){
 anim[name]=Array.from({length:count},(_,i)=>{const im=new Image();im.src=`assets/${name}_${i}.png`;return im});
}
const arenaImage=new Image();arenaImage.src='assets/bg/arena.png';
let prevPose='idle',poseStart=0;
function drawHero(){
 if(!player)return;
 const p=player;
 let pose='idle';
 if(p.ultimateTime>0)pose='ultimate';
 else if(p.bombAnim>0)pose='bomb';
 else if(p.smokeAnim>0||p.backDashTime>0)pose='dash';
 else if(p.attackTime>0)pose='attack';
 else if(!p.grounded)pose='jump';
 else if(Math.abs(p.vx)>40)pose='run';
 if(pose!==prevPose){prevPose=pose;poseStart=clock}
 const elapsed=clock-poseStart;
 const fps={idle:8,run:14,jump:11,attack:38,dash:20,bomb:18,ultimate:25}[pose];
 const frames=anim[pose];
 const idx=pose==='attack'?Math.min(frames.length-1,(p.attackPose-1)*4+Math.floor((clock-p.attackAnimStart)/.26*4)):(pose==='idle'||pose==='run')?Math.floor(elapsed*fps)%frames.length:Math.min(frames.length-1,Math.floor(elapsed*fps));
 const im=frames[idx];
 const px=p.x+p.w/2,py=p.y+p.h;
 ctx.save();
 if(p.invuln>0&&Math.floor(clock*18)%2)ctx.globalAlpha=.56;
 ctx.translate(px,py);ctx.scale(p.face,1);
 // sprite art is displayed at a consistent height and baseline.
 const sw=128,sh=128;
 if(im.complete&&im.naturalWidth){ctx.drawImage(im,-sw*.50,-sh*.94,sw,sh)}
 else{ctx.fillStyle='#d9d0e5';ctx.fillRect(-12,-59,24,55)}
 ctx.restore();
}
function draw(){ctx.clearRect(0,0,W,H);ctx.save();if(shake>0)ctx.translate(rand(-shake,shake),rand(-shake,shake));if(arenaImage.complete&&arenaImage.naturalWidth)ctx.drawImage(arenaImage,0,0,W,H);else{ctx.fillStyle='#171628';ctx.fillRect(0,0,W,H);rect(0,ground,W,H-ground,'#2b293c')}
for(const e of enemies){ctx.save();if(e.flash)ctx.globalAlpha=.6;rect(e.x+5,e.y+10,21,e.h-10,e.elite?'#9d5d69':'#59647e');rect(e.x+3,e.y,25,19,e.elite?'#c9a2a9':'#a1adc2');rect(e.x+(e.face===1?26:-12),e.y+23,13,4,'#e4c5b0');rect(e.x,e.y-11,30,5,'#3a344a');rect(e.x,e.y-11,30*clamp(e.hp/e.maxHp,0,1),5,'#dc8798');if(e.wind>0){ctx.strokeStyle='#ff657a';ctx.lineWidth=4;ctx.beginPath();ctx.arc(e.x+15,e.y+25,37,-1.2,1.2);ctx.stroke()}ctx.restore()}
for(const b of bombs){ctx.strokeStyle='#e8d6ff';ctx.lineWidth=2;ctx.globalAlpha=.6;ctx.beginPath();b.trail.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle='#e9c4a5';ctx.beginPath();ctx.arc(b.x,b.y,8,0,7);ctx.fill();rect(b.x-2,b.y-12,4,5,'#fff0bb')}
drawHero();
for(const s of slashes){ctx.save();const u=1-s.life/s.max;
 ctx.globalAlpha=Math.min(1,s.life/s.max*2);
 if(s.pts){ctx.strokeStyle='#f7f2ff';ctx.lineWidth=9;ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowBlur=18;ctx.shadowColor='#bba0ff';ctx.beginPath();s.pts.slice(0,Math.max(2,Math.ceil((1-s.life/s.max)*s.pts.length))).forEach((pt,i)=>i?ctx.lineTo(...pt):ctx.moveTo(...pt));ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle='#a58cde';ctx.lineWidth=3;ctx.stroke();}
 else{const ox=s.x+s.face*14,oy=s.y-2;ctx.translate(ox,oy);ctx.scale(s.face,1);ctx.strokeStyle='#fff8ef';ctx.lineWidth=14;ctx.shadowBlur=27;ctx.shadowColor='#bca3ed';ctx.beginPath();ctx.arc(0,0,s.range*.78,-1.05+u*.3,.65+u*.3);ctx.stroke();}
 ctx.restore()}
for(const f of fx){ctx.save();ctx.globalAlpha=clamp(f.life/f.max,0,1)*(f.type==='smoke'?.64:1);if(f.type==='smoke'){ctx.fillStyle='#f9f9ff';ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,7);ctx.fill()}else if(f.type==='spark'){ctx.fillStyle=f.color;ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,7);ctx.fill()}else{ctx.strokeStyle='#ffdbb2';ctx.lineWidth=8;ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,7);ctx.stroke()}ctx.restore()}
ctx.restore();if(player){rect(24,22,240,15,'#343248');rect(24,22,240*player.hp/100,15,'#e58ca1');text(`체력 ${Math.ceil(player.hp)}`,30,34,11,'#16121b');rect(24,47,240,11,'#343248');rect(24,47,240*player.momentum/100,11,'#c7a9fa');text(`기세 ${Math.floor(player.momentum)} / 100`,274,57,12,'#e1d4fa');text(`점수 ${score.toLocaleString()}    WAVE ${wave}`,W-24,34,17,'#f1eafc','right');const abilities=[['Z 검술',0],['X 연막',player.smokeCd],['C 폭탄',player.bombCd],['V 월광 일섬',player.momentum>=100?0:99]];abilities.forEach((a,i)=>{const x=24+i*147;rect(x,H-50,136,30,a[1]===0?'#52436f':'#292b3e');text(a[0],x+9,H-30,12,a[1]===0?'#fff':'#a19cac');if(a[1]>0&&a[1]!==99)text(a[1].toFixed(1),x+126,H-30,12,'#e5b8c0','right')});if(noticeTime>0)text(notice,W/2,120,24,'#f7eafc','center')}}
function randStatic(n){const v=Math.sin(n*127.1+3.5)*43758.5453;return v-Math.floor(v)}
function frame(t){const dt=Math.min((t-last)/1000||0,.033);last=t;update(dt);draw();requestAnimationFrame(frame)}requestAnimationFrame(frame);
})();
