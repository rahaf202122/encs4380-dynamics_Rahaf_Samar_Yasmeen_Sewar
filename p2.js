// P2 is self-contained and uses the IDs in p2.html.
(() => {
  const controls = [
    ['kSlider', 'kValue', 1, 1, ''],
    ['tauSlider', 'tauValue', 1, 2, ' s'],
    ['tauSSlider', 'tauSValue', 0.1, 2, ' s'],
    ['kpSlider', 'kpValue', 2, 1, ''],
    ['kiSlider', 'kiValue', 1, 1, ''],
    ['kdSlider', 'kdValue', 0, 2, ''],
    ['setpointSlider', 'setpointValue', 1, 1, '']
  ];
  const element = id => document.getElementById(id);

  function simulate(K, tau, tauS, kp, ki, kd, target) {
    // Small enough to resolve the fastest sensor and closed-loop dynamics.
    const dt = Math.min(0.001, tauS / 50, tau / (50 * (1 + K * kp + K * kd / tauS)));
    const duration = 30;
    const steps = Math.ceil(duration / dt);
    const h = duration / steps;
    const stride = Math.max(1, Math.ceil(steps / 6000));
    const t = [], y = [], measured = [], commands = [];
    let output = 0;
    let sensor = 0;
    let integral = 0;
    let diverged = false;

    for (let step = 0; step <= steps; step++) {
      if (![output, sensor, integral].every(Number.isFinite) ||
          Math.max(Math.abs(output), Math.abs(sensor)) > 1000 * target) {
        diverged = true;
        break;
      }
      if (step % stride === 0 || step === steps) {
        t.push(step * h);
        y.push(output);
        measured.push(sensor);
        commands.push(kp * (target-sensor) + ki * integral - kd * (output-sensor)/tauS);
      }
      if (step === steps) break;
      const error = target - sensor;
      const sensorRate = (output - sensor) / tauS;
      // After the setpoint step, de/dt = -dym/dt. No impulse is applied at t=0.
      const u = kp * error + ki * integral - kd * sensorRate;
      const outputRate = (K * u - output) / tau;
      // All rates use the old state, as required by forward Euler.
      output += h * outputRate;
      sensor += h * sensorRate;
      integral += h * error;
    }
    return { t, y, measured, commands, diverged };
  }

  function update() {
    const values = controls.map(([id, label, , digits, unit]) => {
      const value = Number(element(id).value);
      element(label).textContent = value.toFixed(digits) + unit;
      return value;
    });
    const [K, tau, tauS, kp, ki, kd, target] = values;
    const response = simulate(...values);
    const { t, y, measured, diverged } = response;
    const final = y.at(-1);
    const peak = Math.max(...y);
    const overshoot = Math.max(0, (peak - target) / target * 100);
    const tail = y.slice(Math.floor(y.length * 0.9));
    const tailMean = tail.reduce((sum, value) => sum + value, 0) / tail.length;
    const quietTail = Math.max(...tail) - Math.min(...tail) < 0.002 * target;
    const tolerance = 0.02 * target;
    let lastOutside = -1;
    y.forEach((value, index) => {
      if (Math.abs(value - target) > tolerance) lastOutside = index;
    });
    const settled = !diverged && lastOutside < y.length - 1 && quietTail;
    // Routh criterion for the continuous PID + first-order plant + sensor model.
    const a2 = tau + tauS + K * kd;
    const a1 = 1 + K * kp;
    const stable = ki === 0 || a2 * a1 > tau * tauS * K * ki;
    const valueOrDash = value => diverged ? '—' : value;
    element('overshootResult').textContent = valueOrDash(overshoot.toFixed(1) + '%');
    element('settlingResult').textContent = settled
      ? t[lastOutside + 1].toFixed(2) + ' s'
      : 'Not reached';
    element('finalTrueResult').textContent = valueOrDash(final.toFixed(3));
    element('steadyErrorResult').textContent = !diverged && quietTail && stable
      ? (100 * Math.abs(target - tailMean) / target).toFixed(2) + '%'
      : 'Not settled';
    element('behaviorNote').textContent =
      (diverged ? 'Response exceeded the display range. ' : '') +
      (!stable ? 'These gains are on or beyond the continuous-model stability boundary. ' : '') +
      'The controller uses the orange sensor measurement. Overshoot and the 2% settling band are relative to the setpoint. ' +
      'Final output is measured at the end of this 30 s run. ' +
      (!settled ? 'The response has not demonstrated settling around the setpoint during this run. ' : '') +
      'The derivative uses the sensor slope after the step, with no initial derivative kick. Control is unlimited in this experiment.';

    if (typeof Plotly === 'undefined') {
      element('behaviorNote').textContent = 'Plotly could not load. Connect to the internet and refresh the page.';
      return;
    }
    Plotly.react('sensorCommand', [{x:t,y:response.commands,name:'Control u',mode:'lines',line:{color:'#854F6C'}}], {margin:{t:20,r:15,b:50,l:60},xaxis:{title:'Time (s)'},yaxis:{title:'Control u'}}, {responsive:true,displaylogo:false});
    Plotly.react('responseGraph', [
      { x: t, y, name: 'True output y', mode: 'lines', line: { color: '#522B5B' } },
      { x: t, y: measured, name: 'Sensor measurement ym', mode: 'lines', line: { color: '#b77778' } },
      { x: [0, t.at(-1)], y: [target, target], name: 'Setpoint r', mode: 'lines', line: { color: '#555', dash: 'dash' } }
    ], {
      margin: { t: 25, r: 15, b: 55, l: 60 },
      xaxis: { title: 'Time (s)' },
      yaxis: { title: 'Output' },
      legend: { orientation: 'h' },
      autosize: true
    }, { responsive: true, displaylogo: false });
  }

  controls.forEach(([id]) => element(id).addEventListener('input', update));
  element('resetButton').addEventListener('click', () => {
    controls.forEach(([id, , value]) => { element(id).value = value; });
    update();
  });
  element('exampleButton').addEventListener('click', () => {
    // With K=tau=1, Kp=2, Ki=5, Kd=0, the stability boundary is tauS=1.5 s.
    const example = [1, 1, 2, 2, 5, 0, 1];
    controls.forEach(([id], index) => { element(id).value = example[index]; });
    update();
  });
  element('checkPrediction').addEventListener('click', () => {
    const answer = document.querySelector('input[name="sensorPrediction"]:checked');
    element('predictionFeedback').textContent = !answer
      ? 'Choose a prediction first.'
      : (answer.value === 'unstable' ? 'Correct. ' : 'For these gains, the loop becomes unstable. ') +
        'The stability boundary is τs = 1.5 s. Click Slow Sensor Example to see the response at 2 s, then reduce τs to 0.1 s and compare.';
  });
  update();
})();
