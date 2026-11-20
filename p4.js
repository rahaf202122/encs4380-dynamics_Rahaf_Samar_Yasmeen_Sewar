let challenge;
let revealed=false;
function newChallenge(){
  challenge={K:.8+Math.random()*.4,wn:1+Math.random(),zeta:.35+Math.random()*.25};
  revealed=false;
  Lab.get('model').textContent='Model hidden. A new plant is ready.';
  updateChallenge();
}
function updateChallenge(){
  if(!challenge)return;
  const res=simulate({plant:secondOrder(challenge),Kp:Lab.value('kp'),Ki:Lab.value('ki'),Kd:Lab.value('kd'),T:25,dt:.001,umin:-20,umax:20,antiWindup:true});
  const m=Lab.measure(res.t,res.y,res.r);
  Lab.plot('outputPlot',[Lab.trace('Output',res.t,res.y),Lab.trace('Target',[0,25],[1,1],{line:{dash:'dash'}})]);
  Lab.plot('commandPlot',[Lab.trace('Command',res.t,res.u)],'Control u (±20 limit)');
  // Each card checks one part of the spec. A quiet final window is required
  // before the final error is accepted.
  const checks=[['Overshoot ≤10%',m.overshoot<=10,Number.isFinite(m.overshoot)?m.overshoot.toFixed(2)+'%':'Outside range'],['Settling ≤6 s',m.settle!==null && m.settle<=6,m.settle===null?'Not reached':m.settle.toFixed(2)+' s'],['Error ≤1%',m.error<=1,Number.isFinite(m.error)?m.error.toFixed(3)+'%':'Not settled']];
  Lab.get('specs').innerHTML=checks.map(([label,pass,v])=>`<div class="readout ${pass?'pass':'fail'}">${label}<strong>${v}</strong>${pass?'PASS':'FAIL'}</div>`).join('');
  const score=Math.round(100*checks.filter(c=>c[1]).length/3);
  Lab.get('score').textContent=`Score ${score}/100 · ${score===100?'All specifications met.':'Keep tuning.'}`;
}
Lab.bind(['kp','ki','kd'],updateChallenge);
Lab.get('newPlant').onclick=newChallenge;
Lab.get('reveal').onclick=()=>{revealed=true;Lab.get('model').textContent=`K=${challenge.K.toFixed(3)}, ωn=${challenge.wn.toFixed(3)} rad/s, ζ=${challenge.zeta.toFixed(3)}. Keep these values fixed while comparing gains.`;};
newChallenge();
