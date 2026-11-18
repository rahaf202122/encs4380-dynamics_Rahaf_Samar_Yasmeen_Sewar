function metrics(res) {
  const { t, y, r } = res;
  const N = y.length;

  if (y.some(v => !isFinite(v) || Math.abs(v) > 100 * Math.abs(r))) {
    return { unstable: true, settled: false };
  }

  // Use the last part of the run to estimate the final output.
  // If the curve is still moving, a longer simulation may be needed.
  const tail = y.slice(Math.floor(0.9 * N));
  const yss = tail.reduce((a, b) => a + b, 0) / tail.length;
  const ripple = Math.max(...tail) - Math.min(...tail);
  const settled = ripple < 0.02 * Math.abs(r);

  const ess = r - yss;
  const essPct = (ess / r) * 100;

  const peak = Math.max(...y);
  const overshoot = Math.abs(yss) > 1e-9 ? Math.max(0, (peak - yss) / yss * 100) : 0;

  // Find the crossing between two samples instead of rounding to a sample time.
  function crossing(level) {
    for (let i = 1; i < N; i++) {
      if ((y[i - 1] - level) * (y[i] - level) <= 0 && y[i] !== y[i - 1]) {
        const fr = (level - y[i - 1]) / (y[i] - y[i - 1]);
        return t[i - 1] + fr * (t[i] - t[i - 1]);
      }
    }
    return null;
  }
  const t10 = crossing(0.1 * yss), t90 = crossing(0.9 * yss);
  const rise = (t10 !== null && t90 !== null) ? t90 - t10 : null;

  let settle = 0;
  if (!settled) {
    settle = Infinity;
  } else {
    for (let i = N - 1; i >= 0; i--) {
      if (Math.abs(y[i] - yss) > 0.02 * Math.abs(yss)) { settle = t[Math.min(i + 1, N - 1)]; break; }
    }
  }
  return { unstable: false, settled, yss, ess, essPct, overshoot, rise, settle };
}
