const Lab = (() => {
  const get = id => document.getElementById(id);
  const value = id => Number(get(id).value);
  function bind(ids, callback) {
    const update = () => {
      ids.forEach(id => { const out = get(id + 'Value'); if (out) out.textContent = get(id).value; });
      callback();
    };
    ids.forEach(id => get(id).addEventListener('input', update));
    update();
    return update;
  }
  function plot(id, traces, ylabel='Output') {
    if (typeof Plotly === 'undefined') { get(id).textContent = 'Plot library unavailable. Connect to the internet and reload.'; return; }
    Plotly.react(id, traces, {margin:{t:20,r:18,b:48,l:58},xaxis:{title:'Time (s)'},yaxis:{title:ylabel},legend:{orientation:'h'},paper_bgcolor:'#fff',plot_bgcolor:'#fff'}, {responsive:true,displaylogo:false});
  }
  const trace = (name,x,y,extra={}) => ({name,x,y,mode:'lines',...extra});
  function measure(t,y,r) {
    const tail = y.slice(Math.floor(y.length*.9));
    const finite=y.every(Number.isFinite), safe=finite && y.every(v=>Math.abs(v)<1000*Math.max(1,Math.abs(r)));
    const mean=tail.reduce((a,b)=>a+b,0)/tail.length;
    const quiet=safe && Math.max(...tail)-Math.min(...tail)<.002*Math.abs(r);
    let last=-1;
    y.forEach((v,i)=>{if(Math.abs(v-r)>.02*Math.abs(r))last=i;});
    const settle=safe && quiet && last<y.length-1?t[last+1]:null;
    return {safe,quiet,mean,overshoot:safe?Math.max(0,(Math.max(...y)-r)/Math.abs(r)*100):Infinity,settle,error:quiet?Math.abs(mean-r)/Math.abs(r)*100:Infinity};
  }
  function readouts(id,m) {
    get(id).innerHTML=[['Overshoot',Number.isFinite(m.overshoot)?m.overshoot.toFixed(2)+'%':'Outside range'],['Settling (2% of target)',m.settle===null?'Not reached':m.settle.toFixed(2)+' s'],['Steady-state error',Number.isFinite(m.error)?m.error.toFixed(3)+'%':'Not settled']].map(([label,v])=>`<div class="readout">${label}<strong>${v}</strong></div>`).join('');
  }
  const check=get('check');
  if(check)check.addEventListener('click',()=>{const selection=get('prediction').value;get('predictionResult').textContent=!selection?'Choose a prediction first.':(selection==='a'?'Correct. ':'Try again. ')+get('predictionResult').dataset.explanation;});
  function copy() {
    get('copy')?.addEventListener('click',async()=>{
      try {await navigator.clipboard.writeText(get('arduino').textContent);get('copyStatus').textContent='Copied.';}
      catch {get('copyStatus').textContent='Select the code and copy it manually. Clipboard access requires HTTPS or browser permission.';}
    });
  }
  return {get,value,bind,plot,trace,measure,readouts,copy};
})();
