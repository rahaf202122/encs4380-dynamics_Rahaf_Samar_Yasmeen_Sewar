function stateExperiment(){
  const {value,get,trace,plot}=Lab;
  const m=value('mass'),b=value('damping'),k=value('spring'),z=value('desiredZ'),w=value('desiredW');
  // Choose feedback gains so the closed-loop coefficients match the desired poles.
  const k1=m*w*w-k,k2=2*m*z*w-b,N=m*w*w;
  get('matrices').textContent=`A = [[0, 1], [${(-k/m).toFixed(3)}, ${(-b/m).toFixed(3)}]], B = [0, ${(1/m).toFixed(3)}]ᵀ, C = [1, 0]. K = [${k1.toFixed(3)}, ${k2.toFixed(3)}], N = ${N.toFixed(3)}`;
  const plant={n:2,deriv:s=>[s[1],(-k*s[0]-b*s[1]-k1*s[0]-k2*s[1]+N)/m]};
  // Add position and velocity to the RK4 trajectory for the phase portrait.
  const t=[],y=[],v=[];let state=[0,0];const dt=.002;
  for(let i=0;i<=10000;i++){
    if(i%5===0){t.push(i*dt);y.push(state[0]);v.push(state[1]);}
    const add=(a,d,h)=>a.map((x,j)=>x+h*d[j]);
    const a=plant.deriv(state),c=plant.deriv(add(state,a,dt/2)),d=plant.deriv(add(state,c,dt/2)),e=plant.deriv(add(state,d,dt));
    state=state.map((x,j)=>x+dt*(a[j]+2*c[j]+2*d[j]+e[j])/6);
  }
  // Uncontrolled comparison under the same constant prefilter force N.
  const open=simulate({plant:{n:2,deriv:s=>[s[1],(-k*s[0]-b*s[1]+N)/m]},Kp:0,Ki:0,Kd:0,T:20,dt:.002});
  plot('statePlot',[trace('State feedback',t,y),trace('Same force, no feedback',open.t,open.y),trace('Target',[0,20],[1,1],{line:{dash:'dash'}})]);
  if(typeof Plotly!=='undefined'){
    Plotly.react('phasePlot',[trace('State trajectory',y,v)],{margin:{t:25,l:60,r:15,b:50},xaxis:{title:'Position x₁'},yaxis:{title:'Velocity x₂'}},{responsive:true});
    const root=Math.sqrt(Math.abs(z*z-1))*w;
    const real=z>=1?[-z*w+root,-z*w-root]:[-z*w,-z*w];
    const imag=z>=1?[0,0]:[root,-root];
    Plotly.react('polePlot',[{x:real,y:imag,mode:'markers',name:'Closed-loop poles',marker:{symbol:'x',size:14,color:'#854F6C'}}],{margin:{t:25,l:60,r:15,b:50},xaxis:{title:'Real (s⁻¹)',zeroline:true},yaxis:{title:'Imaginary (s⁻¹)',zeroline:true}},{responsive:true});
  }
  Lab.readouts('stateResults',Lab.measure(t,y,1));
}
Lab.bind(['mass','damping','spring','desiredZ','desiredW'],stateExperiment);
let useZN=false;
function znExperiment(){
  const Ku=12.6, omega=Math.sqrt(20),Pu=2*Math.PI/omega;
  const Kp=useZN?.6*Ku:Lab.value('ultimateGain');
  const Ki=useZN?1.2*Ku/Pu:0,Kd=useZN?.075*Ku*Pu:0;
  const plant={n:3,deriv:(s,u)=>[(s[1]-s[0]),(s[2]-s[1])/.4,(u-s[2])/.2]};
  const r=simulate({plant,Kp,Ki,Kd,T:25,dt:.001});
  const peaks=[];
  for(let i=1;i<r.y.length-1;i++)if(r.t[i]>12&&r.y[i]>r.y[i-1]&&r.y[i]>=r.y[i+1])peaks.push(r.t[i]);
  const measured=peaks.length>=3?(peaks.at(-1)-peaks[0])/(peaks.length-1):null;
  Lab.get('znInfo').textContent=`Ku = ${Ku.toFixed(3)}, theoretical Pu = ${Pu.toFixed(4)} s. Active gains: Kp=${Kp.toFixed(3)}, Ki=${Ki.toFixed(3)}, Kd=${Kd.toFixed(3)}.`;
  Lab.get('znStatus').textContent=(useZN?'Z–N PID applied. ':'P-only experiment. ')+(measured?`Measured late-peak period = ${measured.toFixed(4)} s.`:'Insufficient late peaks to estimate a period.')+' Compare gains below, at and above Ku.';
  Lab.plot('znPlot',[Lab.trace('Output',r.t,r.y),Lab.trace('Target',[0,25],[1,1],{line:{dash:'dash'}})]);
}
Lab.bind(['ultimateGain'],()=>{useZN=false;znExperiment();});
Lab.get('critical').onclick=()=>{Lab.get('ultimateGain').value=12.6;Lab.get('ultimateGainValue').textContent='12.6';useZN=false;znExperiment();};
Lab.get('znTune').onclick=()=>{useZN=true;znExperiment();};
