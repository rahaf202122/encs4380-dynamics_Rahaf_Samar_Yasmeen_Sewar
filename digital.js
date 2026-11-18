// Sample PID exactly at k*Ts, holding the command while integrating the plant.
function digitalPID({K,tau,kp,ki,kd,ts,aw,duration=20,target=1,limit=10}) {
  const t=[],y=[],u=[];
  let output=0, integral=0, previousError=0;
  const samples=Math.ceil(duration/ts);
  for(let k=0;k<samples;k++) {
    const time=k*ts;
    const error=target-output;
    const candidate=integral+ts*error;
    const derivative=(error-previousError)/ts;
    const candidateRaw=kp*error+ki*candidate+kd*derivative;
    if(!aw || !((candidateRaw>limit && error>0)||(candidateRaw<0 && error<0))) integral=candidate;
    const command=Math.max(0,Math.min(limit,kp*error+ki*integral+kd*derivative));
    previousError=error;
    const interval=Math.min(ts,duration-time);
    const substeps=Math.ceil(interval/Math.min(.002,tau/50));
    const h=interval/substeps;
    for(let j=0;j<substeps;j++) {
      // Integrate the held input using RK4 state stepping.
      if(j%Math.max(1,Math.ceil(substeps/30))===0){t.push(time+j*h);y.push(output);u.push(command);}
      const f=v=>(K*command-v)/tau;
      const a=f(output),b=f(output+h*a/2),c=f(output+h*b/2),d=f(output+h*c);
      output+=h*(a+2*b+2*c+d)/6;
    }
    if(k===samples-1){t.push(duration);y.push(output);u.push(command);}
  }
  return {t,y,u};
}
