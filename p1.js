const $ = id => document.getElementById(id);
const SL = ['K1','tau','K2','wn','zeta','Kp','Ki','Kd','r','T','umax'];
const DT = 0.002;
function plantUI(){
  return $('ptype').value === '1'
    ? firstOrder({K:+$('K1').value, tau:+$('tau').value})
    : secondOrder({K:+$('K2').value, wn:+$('wn').value, zeta:+$('zeta').value});
}
function fmt(v, d=3, unit=''){ return v === null ? 'not reached' : (v === Infinity ? 'never settles' : v.toFixed(d) + unit); }
let savedResponse = null;
let currentResponse = null;
function update(){
  SL.forEach(id => $('o_'+id).textContent = $(id).value);
  const one = $('ptype').value === '1';
  ['g1a','g1b'].forEach(i => $(i).style.display = one ? '' : 'none');
  ['g2a','g2b','g2c'].forEach(i => $(i).style.display = one ? 'none' : '');
  const cfg = { plant: plantUI(), Kp:+$('Kp').value, Ki:+$('Ki').value, Kd:+$('Kd').value,
    r:+$('r').value, T:+$('T').value, dt:DT, antiWindup:$('aw').checked };
  if ($('lim').checked){ cfg.umax = +$('umax').value; cfg.umin = -cfg.umax; }
  const res = simulate(cfg), m = metrics(res);
  currentResponse = { t: res.t, y: res.y, label: `Saved Kp=${cfg.Kp}, Ki=${cfg.Ki}, Kd=${cfg.Kd}` };
  $('warn').textContent = m.unstable ? 'UNSTABLE: the output blows up for these gains.' :
    (!m.settled ? 'The response has not settled during this run. Increase the run time to check convergence.' : '');
  const lay = (t, yt) => ({title:t, margin:{t:30,l:50,r:10,b:35}, xaxis:{title:'Time (s)'}, yaxis:{title:yt}, legend:{orientation:'h'}});
  Plotly.react('plotY', [
    {x:res.t, y:res.y, name:'output y', line:{color:'#522B5B'}},
    ...(savedResponse ? [{x:savedResponse.t,y:savedResponse.y,name:savedResponse.label,line:{dash:'dot',color:'#b77778'}}] : []),
    {x:[0,res.t.at(-1)], y:[res.r,res.r], name:'setpoint', line:{dash:'dash', color:'#ac6573'}}], lay('Output vs setpoint','y'), {responsive:true});
  const ul = lay('Control signal u','u');
  if ($('lim').checked) ul.shapes = [cfg.umax, cfg.umin].map(v => ({type:'line', xref:'paper', x0:0, x1:1, y0:v, y1:v, line:{color:'#e08a00', dash:'dot'}}));
  Plotly.react('plotU', [{x:res.t, y:res.u, name:'u', line:{color:'#854F6C'}}], ul, {responsive:true});
  if (m.unstable){ ['m_rise','m_os','m_set','m_ess'].forEach(i => $(i).textContent = '-'); return; }
  $('m_rise').textContent = m.settled ? fmt(m.rise, 3, ' s') : '-';
  $('m_os').textContent = m.settled ? m.overshoot.toFixed(1) + ' %' : '-';
  $('m_set').textContent = fmt(m.settle, 2, ' s');
  $('m_ess').textContent = m.settled ? m.essPct.toFixed(2) + ' %' : '-';
}
function validate(){
  const P = firstOrder({K:1, tau:1}), rows = [];
  const a = metrics(simulate({plant:P, Kp:9, Ki:0, Kd:0, T:5, dt:DT}));
  rows.push(['1', 'P only, Kp = 9: steady-state error', '10 %  (tau_cl = 0.1 s, rise 0.22 s)',
    a.essPct.toFixed(2) + ' %,  rise ' + a.rise.toFixed(3) + ' s', Math.abs(a.essPct-10) < 0.1 && Math.abs(a.rise-0.2197) < 0.01]);
  const K=1, tau=1, Kp=1, Ki=1, wn = Math.sqrt(K*Ki/tau), z = (1+K*Kp)/(2*Math.sqrt(tau*K*Ki));
  const b = metrics(simulate({plant:P, Kp:1, Ki:1, Kd:0, T:20, dt:DT}));
  rows.push(['2', 'PI, Kp = 1, Ki = 1: wn and zeta from the formulas; simulated overshoot', 'wn = 1, zeta = 1, overshoot 0',
    'wn = ' + wn.toFixed(2) + ', zeta = ' + z.toFixed(2) + ', overshoot ' + b.overshoot.toFixed(2) + ' %',
    Math.abs(wn-1) < 1e-9 && Math.abs(z-1) < 1e-9 && b.overshoot < 0.5]);
  rows.push(['3', 'PI: steady-state error for a step', '0', b.ess.toExponential(1), Math.abs(b.ess) < 1e-3]);
  const t = $('vt');
  rows.forEach(r => { const tr = t.insertRow(); r.slice(0,4).forEach(c => tr.insertCell().textContent = c);
    const c = tr.insertCell(); c.textContent = r[4] ? 'PASS' : 'FAIL'; c.className = r[4] ? 'pass' : 'fail'; });
}
$('chk').onclick = () => {
  const v = (document.querySelector('input[name=q]:checked') || {}).value;
  $('qres').innerHTML = !v ? 'Pick an answer first.' : v === 'a'
    ? '<span class="pass">Right.</span> Error = 1/(1 + K&middot;Kp): it keeps shrinking but never hits zero. Try it below, then add Ki.'
    : '<span class="fail">Not quite.</span> Error = 1/(1 + K&middot;Kp), so it only shrinks. Move Kp and watch the steady-state error.';
};
[...SL, 'ptype', 'lim', 'aw'].forEach(id => $(id).addEventListener('input', update));
update(); validate();

function applyPreset(values) {
  Object.entries(values).forEach(([id,value]) => { $(id).value=value; });
  $('lim').checked=false;
  update();
}
$('presetP').onclick=()=>applyPreset({ptype:'1',K1:1,tau:1,Kp:9,Ki:0,Kd:0,r:1,T:20});
$('presetPI').onclick=()=>applyPreset({ptype:'1',K1:1,tau:1,Kp:1,Ki:1,Kd:0,r:1,T:20});
$('presetOscillation').onclick=()=>applyPreset({ptype:'2',K2:1,wn:1,zeta:.2,Kp:3,Ki:1,Kd:0,r:1,T:30});
$('presetDamping').onclick=()=>applyPreset({ptype:'2',K2:1,wn:1,zeta:.2,Kp:3,Ki:1,Kd:3,r:1,T:30});
$('saveComparison').onclick=()=>{savedResponse=currentResponse; $('comparisonStatus').textContent='Saved. Change gains to compare on the same plot.';update();};
$('clearComparison').onclick=()=>{savedResponse=null;$('comparisonStatus').textContent='Comparison cleared.';update();};
