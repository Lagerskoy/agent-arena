'use strict';
const canvas = document.querySelector('#scene'), ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
let sim, paused = matchMedia('(prefers-reduced-motion: reduce)').matches, accumulator = 0, previous = 0, lastEventCount = -1;
const colors = ['#e7e8ed', '#8599bf'];
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function text(s,x,y,size=12,color='#a2a9b8'){ctx.fillStyle=color;ctx.font=`${size}px ui-monospace,Consolas,monospace`;ctx.fillText(s,x,y);}
function line(a,b,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();}
function draw(){
  rect(0,0,900,660,'#101217');
  for(let x=30;x<900;x+=30)line([x,38],[x,588],'#1b1e25');
  for(let y=48;y<600;y+=30)line([25,y],[875,y],'#1b1e25');
  ctx.setLineDash([5,8]);line([450,40],[450,585],'#343947');ctx.setLineDash([]);
  text('A / '+sim.config.left.toUpperCase(),28,25,11,colors[0]);text('B / '+sim.config.right.toUpperCase(),710,25,11,colors[1]);
  for(let side=0;side<2;side++)for(let group=0;group<sim.config.size/5;group++){
    const team=sim.alive(side).filter(a=>a.squad===group);
    for(let i=1;i<team.length;i++)line([team[i-1].x,team[i-1].y],[team[i].x,team[i].y],side?'#293342':'#32343c');
  }
  for(const a of sim.agents){
    if(!a.hp){line([a.x-4,a.y-4],[a.x+4,a.y+4],'#414650');line([a.x+4,a.y-4],[a.x-4,a.y+4],'#414650');continue;}
    const x=Math.round(a.x),y=Math.round(a.y),c=colors[a.side],walk=Math.sin(sim.t*11+a.id)>0?2:-2;
    rect(x-7,y+10,16,4,'#08090c');rect(x-4,y-10,8,8,c);rect(x-5,y-1,10,10,c);
    rect(x-6,y+8,4,5+walk,c);rect(x+2,y+8,4,5-walk,c);rect(x+(a.side?-12:6),y+1,7,3,c);
    rect(x-8,y-17,16,2,'#353c49');rect(x-8,y-17,16*a.hp/100,2,c);
    if(a.dodge>0)line([x-14,y+17],[x+14,y+17],c);
  }
  for(const s of sim.shots)line([s.x,s.y],[s.x-s.vx*.025,s.y-s.vy*.025],colors[s.side],2);
  rect(0,600,900,60,'#14171d');text('SURVIVOR TRACE',24,624,9);text(`${sim.t.toFixed(1).padStart(4,'0')}s / 90s`,744,624,11);
  for(let side=0;side<2;side++)for(let i=1;i<sim.history.length;i++)line([180+(i-1)*5.8,647-sim.history[i-1][side?'b':'a']/sim.config.size*35],[180+i*5.8,647-sim.history[i][side?'b':'a']/sim.config.size*35],colors[side],2);
  if(sim.over){rect(280,255,340,85,'#111319ed');text(sim.result+' / MATCH COMPLETE',300,294,17,'#fff');text('NEW MATCH TO REPLAY OR CHANGE TACTICS',300,318,10);}
  $('scoreA').textContent=sim.alive(0).length;$('scoreB').textContent=sim.alive(1).length;
  $('status').textContent=sim.over?sim.result+' · COMPLETE':paused?'PAUSED':sim.t<3?'DEPLOYING':'MATCH IN PROGRESS';
  if(lastEventCount!==sim.events.length){$('events').replaceChildren(...sim.events.slice(-6).reverse().map(e=>{const li=document.createElement('li'),time=document.createElement('time');time.textContent=e.time.toFixed(1)+'s';li.append(time,document.createTextNode(e.message));return li;}));lastEventCount=sim.events.length;}
}
function reset(){sim=new ArenaEngine.Arena({seed:Number($('seed').value),size:Number($('size').value),left:$('left').value,right:$('right').value});accumulator=0;lastEventCount=-1;draw();}
$('settings').addEventListener('submit',e=>{e.preventDefault();reset();});
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Resume':'Pause';draw();};
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('save').onclick=()=>download(new Blob([JSON.stringify(sim.export(),null,2)],{type:'application/json'}),`arena-${sim.config.seed}.json`);
$('record').onclick=()=>{
  if(!canvas.captureStream||typeof MediaRecorder==='undefined'){$('notice').textContent='Video recording is not supported in this browser. Use Chrome or Edge.';return;}
  const stream=canvas.captureStream(30),chunks=[];let rec;
  try{rec=new MediaRecorder(stream,{mimeType:'video/webm'});}catch{stream.getTracks().forEach(t=>t.stop());$('notice').textContent='WebM recording is unavailable in this browser.';return;}
  $('record').disabled=true;$('notice').textContent='Recording 15 seconds of canvas video. Keep this tab active; no audio is recorded.';
  rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};rec.onstop=()=>{stream.getTracks().forEach(t=>t.stop());download(new Blob(chunks,{type:'video/webm'}),'agent-arena.webm');$('record').disabled=false;$('notice').textContent='Recording saved.';};rec.start();setTimeout(()=>{if(rec.state==='recording')rec.stop();},15000);
};
reset();$('pause').textContent=paused?'Resume':'Pause';
function animate(now){const elapsed=previous?Math.min(.1,(now-previous)/1000):0;previous=now;if(!paused&&!document.hidden){accumulator+=elapsed*Number($('speed').value);while(accumulator>=ArenaEngine.DT){sim.step();accumulator-=ArenaEngine.DT;}}draw();requestAnimationFrame(animate);}requestAnimationFrame(animate);
