// =============================================================
// My system: Micromouse drive motor (N20 6V 530 RPM + L298N + ESP32)
// The model K/(tau*s + 1) maps PWM (%) to wheel speed (rpm).
// K is taken from the datasheets; tau is the usual N20 value (see the page).
// =============================================================

function updateSystem() {
  const { value, get, trace, plot } = Lab;

  const K = value('K');            // rpm per % PWM
  const tau = value('tau');        // s
  const target = value('target');  // rpm
  const z = value('z');            // desired damping ratio
  const w = value('wn');           // desired natural frequency, rad/s

  // PI design by matching the closed-loop characteristic polynomial
  //   tau*s^2 + (1 + K*Kp)*s + K*Ki   to   tau*(s^2 + 2*z*w*s + w^2)
  const kp = (2 * z * w * tau - 1) / K;
  const ki = tau * w * w / K;

  // Simulate the closed loop with the real PWM limits 0..100 %
  const T = 1;
  const res = simulate({ plant: firstOrder({ K, tau }), Kp: kp, Ki: ki, Kd: 0, r: target,
                         T, dt: 0.0002, umin: 0, umax: 100, antiWindup: true });
  const metrics = Lab.measure(res.t, res.y, target);
  const peakPwm = Math.max(...res.u);

  get('gains').textContent =
    `PI gains: Kp = ${kp.toFixed(4)} %/rpm, Ki = ${ki.toFixed(3)} %/(rpm·s). ` +
    `Steady PWM needed for ${target} rpm = ${(target / K).toFixed(1)} %. Peak PWM in the run = ${peakPwm.toFixed(1)} %.`;

  plot('outputPlot', [
    trace('Wheel speed', res.t, res.y),
    trace('Target', [0, T], [target, target], { line: { dash: 'dash' } })
  ], 'Wheel speed (rpm)');

  plot('commandPlot', [
    trace('PWM %', res.t, res.u),
    trace('PWM limit 100 %', [0, T], [100, 100], { line: { dash: 'dot' } })
  ], 'PWM (%)');

  Lab.readouts('results', metrics);

  // Spec check: overshoot <= 10 %, settling (2 %) <= 0.3 s, error <= 1 %, PWM within 0..100 %
  const pass = metrics.overshoot <= 10 && metrics.settle !== null && metrics.settle <= 0.3 &&
               metrics.error <= 1 && target / K <= 100 && kp >= 0;
  get('systemStatus').textContent =
    (pass ? 'PASS: the simulated response meets the spec. ' : 'FAIL: change ωn or ζ, or lower the target. ') +
    (target / K > 100 ? 'The target needs more than 100 % PWM. ' : '') +
    (kp < 0 ? 'Kp is negative: increase ωn. ' : '');

  drawRobustness(K, tau, target, kp, ki);

  get('arduino').textContent = arduinoCode(kp, ki, target);
}

// tau is not in the datasheet, so run the same gains with tau halved and doubled
function drawRobustness(K, tau, target, kp, ki) {
  const T = 1;
  const cases = [0.5, 1, 2];
  const traces = [];
  const notes = [];
  for (const f of cases) {
    const t = tau * f;
    const res = simulate({ plant: firstOrder({ K, tau: t }), Kp: kp, Ki: ki, Kd: 0, r: target,
                           T, dt: 0.0002, umin: 0, umax: 100, antiWindup: true });
    const m = Lab.measure(res.t, res.y, target);
    traces.push(Lab.trace(`τ = ${t.toFixed(3)} s`, res.t, res.y));
    notes.push(`τ = ${t.toFixed(3)} s: overshoot ${m.overshoot.toFixed(1)} %, settling ` +
               (m.settle === null ? 'not reached' : m.settle.toFixed(2) + ' s'));
  }
  traces.push(Lab.trace('Target', [0, T], [target, target], { line: { dash: 'dash' } }));
  Lab.plot('robustPlot', traces, 'Wheel speed (rpm)');
  Lab.get('robustNote').textContent = notes.join(' · ');
}

// ESP32 + L298N speed loop. ENA jumper stays on, PWM goes to IN1.
function arduinoCode(kp, ki, target) {
  return `// Micromouse wheel speed loop: ESP32 + L298N + N20 6V 530 RPM with encoder
// Wiring: D26 -> IN1 (PWM), D27 -> IN2, encoder C1 -> D18, C2 -> D19,
//         encoder VCC -> 3.3V, all grounds together. ENA jumper left on.
const int PIN_IN1 = 26, PIN_IN2 = 27, PIN_ENC_A = 18, PIN_ENC_B = 19;

const float Kp = ${kp.toFixed(5)};      // % PWM per rpm of error
const float Ki = ${ki.toFixed(4)};      // % PWM per (rpm * s)
const float targetRpm = ${target.toFixed(1)};
const float Ts = 0.01;                  // 10 ms loop
const float COUNTS_PER_REV = 420.0;     // 7 pulses x 2 edges x 30:1 gear (check on your motor)

volatile long encoderCount = 0;
void IRAM_ATTR onEncoderA() {
  if (digitalRead(PIN_ENC_A) == digitalRead(PIN_ENC_B)) encoderCount--; else encoderCount++;
}

long lastCount = 0;
float integral = 0;
unsigned long lastUpdate = 0;

// Wheel speed in rpm from the counts seen during the last Ts
float readSpeed() {
  noInterrupts(); long c = encoderCount; interrupts();
  long delta = c - lastCount;
  lastCount = c;
  return delta / COUNTS_PER_REV / Ts * 60.0;
}

void setup() {
  pinMode(PIN_IN1, OUTPUT); pinMode(PIN_IN2, OUTPUT);
  digitalWrite(PIN_IN2, LOW); analogWrite(PIN_IN1, 0);
  pinMode(PIN_ENC_A, INPUT_PULLUP); pinMode(PIN_ENC_B, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_A), onEncoderA, CHANGE);
  Serial.begin(115200);
  lastUpdate = micros();
}

void loop() {
  unsigned long now = micros();
  if (now - lastUpdate < 10000UL) return;   // run every 10 ms
  lastUpdate = now;

  float speed = readSpeed();
  float error = targetRpm - speed;

  // PI with anti-windup: only keep the new integral if PWM is not saturated
  float candidate = integral + Ts * error;
  float raw = Kp * error + Ki * candidate;
  if (!((raw > 100 && error > 0) || (raw < 0 && error < 0))) integral = candidate;
  float pwm = constrain(Kp * error + Ki * integral, 0.0, 100.0);

  analogWrite(PIN_IN1, (int)(pwm * 255.0 / 100.0 + 0.5));
  Serial.print(speed); Serial.print(","); Serial.println(pwm);
}`;
}

Lab.bind(['K', 'tau', 'target', 'z', 'wn'], updateSystem);
Lab.copy();
