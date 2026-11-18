(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const panels = [...document.querySelectorAll('canvas[data-wave]')].map(canvas => {
    const context = canvas.getContext('2d');
    const panel = { canvas, context, width: 0, height: 0, pointer: 0 };
    canvas.parentElement.addEventListener('pointermove', event => {
      const bounds = canvas.getBoundingClientRect();
      panel.pointer = (event.clientX - bounds.left) / bounds.width - 0.5;
    });
    canvas.parentElement.addEventListener('pointerleave', () => { panel.pointer = 0; });
    return panel;
  });
  function resize() {
    for (const panel of panels) {
      const { canvas, context } = panel;
      const bounds = canvas.getBoundingClientRect();
      panel.width = bounds.width;
      panel.height = bounds.height;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * ratio);
      canvas.height = Math.round(bounds.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    draw(performance.now());
  }
  function draw(now) {
    const phase = reducedMotion.matches ? 0 : now * 0.00025;
    for (const { canvas, context: ctx, width: w, height: h, pointer } of panels) {
      if (!ctx) continue;
      const control = canvas.dataset.wave === 'control';
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = '#854F6C12';
      ctx.lineWidth = 1;
      for (let x = 25; x < w; x += 35) {
        ctx.beginPath(); ctx.moveTo(x, 45); ctx.lineTo(x, h - 30); ctx.stroke();
      }
      for (let row = 0; row < 3; row++) {
        ctx.beginPath();
        ctx.strokeStyle = control ? ['#522B5B', '#854F6C80', '#854F6C40'][row] : ['#854F6C', '#522B5B70', '#522B5B35'][row];
        ctx.lineWidth = row === 0 ? 2 : 1;
        for (let x = 0; x <= w; x++) {
          const t = x / w;
          const oscillation = control
            ? Math.exp(-5 * t) * Math.cos(t * 18 + phase + pointer)
            : Math.sin(t * 10 - phase + pointer + row * 0.3) * Math.exp(-t * 0.7);
          const y = h * 0.55 + oscillation * h * 0.23 + row * 7;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  }
  function animate(now) {
    draw(now);
    if (!reducedMotion.matches && !document.hidden) requestAnimationFrame(animate);
  }
  function start() { if (!reducedMotion.matches && !document.hidden) requestAnimationFrame(animate); else draw(0); }
  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', start);
  reducedMotion.addEventListener('change', start);
  resize();
  start();
})();
