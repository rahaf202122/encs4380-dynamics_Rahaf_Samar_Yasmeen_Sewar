// ---------- Plants ----------
function firstOrder({ K, tau }) {
  return {
    n: 1,                                    // state s = [y]
    deriv: (s, u) => [(-s[0] + K * u) / tau],
  };
}

function secondOrder({ K, wn, zeta }) {
  return {
    n: 2,                                    // state s = [y, v], v = dy/dt
    deriv: (s, u) => [
      s[1],
      -wn * wn * s[0] - 2 * zeta * wn * s[1] + K * wn * wn * u,
    ],
  };
}

// ---------- Closed-loop simulation (RK4) ----------
function simulate(cfg) {
  const { plant, Kp, Ki, Kd, r = 1,
          umin = -Infinity, umax = Infinity, antiWindup = true,
          T = 10, dt = 0.001, Tf = 0.01, tauS = 0 } = cfg;

  const n = plant.n;
  const iI = n, iF = n + 1, iS = n + 2;      // I, xf and the sensor state live after the plant states

  // Read the sensor first, then calculate the command from the error.
  function control(s) {
    const ym = tauS > 0 ? s[iS] : s[0];      // what the controller SEES (the sensor reading)
    const e = r - ym;
    const D = -Kd * (ym - s[iF]) / Tf;       // derivative of the MEASUREMENT (no kick)
    const uRaw = Kp * e + Ki * s[iI] + D;
    const u = Math.min(umax, Math.max(umin, uRaw));
    return { e, uRaw, u };
  }

  function f(s) {
    const { e, uRaw, u } = control(s);
    const dPlant = plant.deriv(s.slice(0, n), u);
    // Stop accumulating error when the actuator is already at its limit
    // and the error would push it further into that limit.
    const windingUp = antiWindup && ((uRaw > umax && e > 0) || (uRaw < umin && e < 0));
    const dI = windingUp ? 0 : e;
    
    const ym = tauS > 0 ? s[iS] : s[0];
    const dF = (ym - s[iF]) / Tf;            // filter state follows the measurement
    const dS = tauS > 0 ? (s[0] - s[iS]) / tauS : 0;   // first-order sensor: ys follows the true y
    return [...dPlant, dI, dF, dS];
  }

  function rk4(s) {
    const add = (a, b, h) => a.map((x, i) => x + h * b[i]);
    const k1 = f(s);
    const k2 = f(add(s, k1, dt / 2));
    const k3 = f(add(s, k2, dt / 2));
    const k4 = f(add(s, k3, dt));
    return s.map((x, i) => x + dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
  }

  let s = new Array(n + 3).fill(0);
  const t = [], y = [], u = [], ys = [];
  const steps = Math.round(T / dt);
  for (let k = 0; k <= steps; k++) {
    if (k % 10 === 0) { t.push(k * dt); y.push(s[0]); ys.push(tauS > 0 ? s[iS] : s[0]); u.push(control(s).u); }
    s = rk4(s);
  }
  return { t, y, ys, u, r };
}
