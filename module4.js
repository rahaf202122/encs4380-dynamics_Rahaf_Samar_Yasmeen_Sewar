// ============================================================
// Module 4: Guess the Sensor
// Uses the same formulas as Modules 1, 2 and 3.
// ============================================================

// Tolerance used to decide that zeta is exactly 1
const EPS = 1e-6;

// The hidden sensor of the current round
// (you can type S in the browser console to see the true values when testing)
let S = null;

// State of the round
let revealed = false;      // true after the user pressed "Check my guess"
let guessSensor = null;    // the sensor made from the user's guess
let pins = [];             // up to two points clicked by the user
let hintNumber = 0;

// Session score
let totalPoints = 0;
let roundsPlayed = 0;


// ------------------------------------------------------------
// 1. Formulas (same as the other modules)
// ------------------------------------------------------------

// Random number between a and b
function random(a, b) {
    return a + Math.random() * (b - a);
}

// Random noise with a normal distribution (Box-Muller)
function gaussianNoise() {
    return Math.sqrt(-2 * Math.log(1 - Math.random())) *
        Math.cos(2 * Math.PI * Math.random());
}

// Module 1: first-order step, A = 1: y = K (1 - e^(-t/tau))
function firstOrderStep(t, K, tau) {
    return K * (1 - Math.exp(-t / tau));
}

// Module 2: first-order response to sin(w t), starting from rest.
// y = K/(1+(w tau)^2) * [ w tau e^(-t/tau) + sin(wt) - w tau cos(wt) ]
// After the transient dies out this becomes K M sin(wt + phi)
function firstOrderSine(t, K, tau, w) {
    const wt = w * tau;
    return K / (1 + wt * wt) *
        (wt * Math.exp(-t / tau) + Math.sin(w * t) - wt * Math.cos(w * t));
}

// Module 3: second-order unit step (K = 1), underdamped
function secondOrderStep(t, wn, zeta) {
    const wd = wn * Math.sqrt(1 - zeta * zeta);
    const phi = Math.acos(zeta);
    return 1 - Math.exp(-zeta * wn * t) / Math.sqrt(1 - zeta * zeta) *
        Math.sin(wd * t + phi);
}

// Response of a sensor object s with parameters p (p can be the true or the guessed values)
function sensorResponse(s, p, t) {
    if (s.type === "first-step") return firstOrderStep(t, p.K, p.tau);
    if (s.type === "first-sine") return firstOrderSine(t, p.K, p.tau, s.w);
    return secondOrderStep(t, p.wn, p.zeta);
}

// The input signal that is applied to the sensor
function inputSignal(s, t) {
    if (s.type === "first-sine") return Math.sin(s.w * t);
    return 1;
}


// ------------------------------------------------------------
// 2. Create a random hidden sensor
// ------------------------------------------------------------
function newSensor() {

    const r = Math.random();
    const sensor = {};

    if (r < 0.35) {
        // first order, step input: random K and tau
        sensor.type = "first-step";
        sensor.K = Number(random(0.5, 5).toFixed(2));
        sensor.tau = Number(random(0.4, 6).toFixed(2));
        sensor.tEnd = sensor.tau * random(5, 7.5);

    } else if (r < 0.55) {
        // first order, sine input: K is given, the user finds tau
        sensor.type = "first-sine";
        sensor.K = Number(random(0.5, 5).toFixed(2));
        sensor.tau = Number(random(0.2, 3).toFixed(2));
        // choose w so that w*tau is between 0.5 and 3 (clear amplitude and phase)
        sensor.w = Number((random(0.5, 3) / sensor.tau).toFixed(2));
        sensor.tEnd = 3.5 * 2 * Math.PI / sensor.w;

    } else {
        // second order, step input: random zeta (underdamped) and wn
        sensor.type = "second-step";
        sensor.K = 1;
        sensor.zeta = Number(random(0.1, 0.8).toFixed(2));
        sensor.wn = Number(random(1, 20).toFixed(1));
        const wd = sensor.wn * Math.sqrt(1 - sensor.zeta * sensor.zeta);
        sensor.tEnd = Math.max(4.5 / (sensor.zeta * sensor.wn), 3 * 2 * Math.PI / wd);
    }

    // Measure the sensor: true response plus a little noise (1.5% of the size)
    const n = 300;
    const noise = 0.015 * sensor.K;
    sensor.t = [];
    sensor.y = [];
    for (let i = 0; i < n; i++) {
        const t = sensor.tEnd * i / (n - 1);
        sensor.t.push(t);
        sensor.y.push(sensorResponse(sensor, sensor, t) + noise * gaussianNoise());
    }

    // Reset the round
    S = sensor;
    revealed = false;
    guessSensor = null;
    pins = [];
    hintNumber = 0;

    document.getElementById("resultModule").style.display = "none";
    document.getElementById("submitBtn").disabled = false;
    document.getElementById("hintText").textContent = "";
    document.getElementById("msgText").textContent = "";
    document.getElementById("kEstimate").value = "";
    document.getElementById("readout").textContent =
        "Click a point on the curve to place marker 1, then another for marker 2.";

    showTask();
    drawMainGraph();
    drawLogGraph();
}


// What the user sees about the sensor, and which boxes they must fill
function showTask() {
    let text = "";
    let fields = [];

    if (S.type === "first-step") {
        text = "First-order sensor. The input is a step of size A = 1 at t = 0. Estimate K and τ.";
        fields = [["K", "K (gain)"], ["tau", "τ (seconds)"]];
    } else if (S.type === "first-sine") {
        text = "First-order sensor with K = " + S.K + ". The input is sin(" + S.w +
            "·t) (dashed). Estimate τ from the amplitude ratio or the phase lag.";
        fields = [["tau", "τ (seconds)"]];
    } else {
        text = "Second-order sensor with K = 1. The input is a unit step at t = 0. Estimate ζ and ωn.";
        fields = [["zeta", "ζ (between 0 and 1)"], ["wn", "ωn (rad/s)"]];
    }

    S.fields = fields;
    document.getElementById("taskText").textContent = text;

    let html = "";
    for (let i = 0; i < fields.length; i++) {
        html += '<div class="slider-box"><label for="g_' + fields[i][0] + '">' + fields[i][1] + '</label>' +
            '<input type="number" id="g_' + fields[i][0] + '" step="any"></div>';
    }
    document.getElementById("inputs").innerHTML = html;

    // The log-method helper only makes sense for a first-order step
    document.getElementById("logBox").style.display = (S.type === "first-step") ? "block" : "none";
}


// ------------------------------------------------------------
// 3. Graphs
// ------------------------------------------------------------

// Make a smooth curve for the true sensor or for the guess
function makeCurve(p) {
    const x = [];
    const y = [];
    for (let i = 0; i <= 400; i++) {
        const t = S.tEnd * i / 400;
        x.push(t);
        y.push(sensorResponse(S, p, t));
    }
    return { x: x, y: y };
}

function drawMainGraph() {

    // The input signal (dashed)
    const inputX = [];
    const inputY = [];
    for (let i = 0; i <= 400; i++) {
        const t = S.tEnd * i / 400;
        inputX.push(t);
        inputY.push(inputSignal(S, t));
    }

    const traces = [
        {
            x: inputX, y: inputY,
            mode: "lines", name: "Input",
            line: { color: "gray", width: 1.5, dash: "dash" },
            hoverinfo: "skip"
        },
        {
            x: S.t, y: S.y,
            mode: "markers", name: "Measured (noisy)",
            marker: { color: "#7654bd", size: 5 },
            hovertemplate: "t = %{x:.3f} s<br>y = %{y:.3f}<extra></extra>"
        },
        {
            x: pins.map(function (p) { return p.x; }),
            y: pins.map(function (p) { return p.y; }),
            mode: "markers", name: "Your markers",
            marker: { color: "black", size: 12, symbol: "x" },
            hoverinfo: "skip"
        }
    ];

    // After the reveal: the true curve and the curve of the guess
    if (revealed) {
        const trueCurve = makeCurve(S);
        traces.push({
            x: trueCurve.x, y: trueCurve.y,
            mode: "lines", name: "True sensor",
            line: { color: "#2a9d8f", width: 3 },
            hoverinfo: "skip"
        });

        const guessCurve = makeCurve(guessSensor);
        traces.push({
            x: guessCurve.x, y: guessCurve.y,
            mode: "lines", name: "Your guess",
            line: { color: "red", width: 2.5, dash: "dash" },
            hoverinfo: "skip"
        });
    }

    const layout = {
        title: "Response of the hidden sensor",
        xaxis: { title: "Time (seconds)" },
        yaxis: { title: "Output y" },
        legend: { orientation: "h", y: -0.3, yanchor: "top" },
        margin: { t: 50, l: 60, r: 20, b: 100 }
    };

    Plotly.newPlot("mainGraph", traces, layout, { responsive: true });

    // Clicking a point places a marker (two markers give dt and dy)
    document.getElementById("mainGraph").on("plotly_click", function (event) {
        const point = event.points[0];
        if (pins.length >= 2) pins = [];
        pins.push({ x: point.x, y: point.y });
        showReadout();
        drawMainGraph();
    });
}

function showReadout() {
    let text = "";
    for (let i = 0; i < pins.length; i++) {
        text += "Marker " + (i + 1) + ": t = " + pins[i].x.toFixed(3) + " s, y = " + pins[i].y.toFixed(3) + "     ";
    }
    if (pins.length === 2) {
        text += "→ Δt = " + (pins[1].x - pins[0].x).toFixed(3) + " s, Δy = " +
            (pins[1].y - pins[0].y).toFixed(3);
    }
    document.getElementById("readout").textContent = text;
}

// Log method (Module 1): ln(1 - y/K) against t is a line with slope -1/tau.
// The user types an estimate of K, so this is their own measurement.
function drawLogGraph() {

    if (S.type !== "first-step") return;

    const K = Number(document.getElementById("kEstimate").value);
    const layout = {
        xaxis: { title: "Time (seconds)" },
        yaxis: { title: "ln(1 − y/K)" },
        legend: { orientation: "h", y: -0.35, yanchor: "top" },
        margin: { t: 20, l: 60, r: 20, b: 100 }
    };

    if (!(K > 0)) {
        Plotly.newPlot("logGraph", [], layout, { responsive: true });
        return;
    }

    // Use only points where the error fraction is still above 5% (noise would ruin the rest)
    const x = [];
    const y = [];
    for (let i = 0; i < S.t.length; i++) {
        const fraction = 1 - S.y[i] / K;
        if (fraction > 0.05) {
            x.push(S.t[i]);
            y.push(Math.log(fraction));
        }
    }

    const traces = [{
        x: x, y: y,
        mode: "markers", name: "ln(1 − y/K̂)",
        marker: { color: "green", size: 5 },
        hovertemplate: "t = %{x:.3f} s<br>ln = %{y:.3f}<extra></extra>"
    }];

    // After the reveal show the true line: slope = -1/tau
    if (revealed) {
        traces.push({
            x: [0, S.tEnd], y: [0, -S.tEnd / S.tau],
            mode: "lines", name: "True line (slope −1/τ)",
            line: { color: "#2a9d8f", width: 2 }
        });
    }

    Plotly.newPlot("logGraph", traces, layout, { responsive: true });
}


// ------------------------------------------------------------
// 4. Hints
// ------------------------------------------------------------
function showHint() {
    let hints = [];

    if (S.type === "first-step") {
        hints = [
            "Estimate K from the final plateau, then find the time where the output is at 63.2% of K. That time is τ.",
            "Log method: ln(1 − y/K) against t is a straight line with slope −1/τ. Use two markers to measure the slope.",
            "At t = 3τ the output is at 95% of K. Use it to check your answer."
        ];
    } else if (S.type === "first-sine") {
        hints = [
            "The amplitude ratio is M = 1/√(1+(ωτ)²). Measure the output amplitude after the first transient, and divide it by K.",
            "The phase lag is φ = tan⁻¹(ωτ). Use two markers to measure the time shift between the input and output peaks.",
            "Do not use the first one or two τ of the curve: it still contains the transient."
        ];
    } else {
        hints = [
            "Overshoot depends only on ζ: Overshoot = e^(−πζ/√(1−ζ²)).",
            "Invert it: ζ = −ln(Mp) / √(π² + ln²(Mp)), where Mp = (peak − final) / final.",
            "The peak time is tp = π/ωd, with ωd = ωn√(1−ζ²). Measure tp with two markers, then solve for ωn."
        ];
    }

    document.getElementById("hintText").textContent = hints[hintNumber % hints.length];
    hintNumber = hintNumber + 1;
}


// ------------------------------------------------------------
// 5. Score the guess
// ------------------------------------------------------------

// Within 10%: 100 points. Then it falls in a line to 0 points at 50% error
function pointsFor(guess, truth) {
    const error = Math.abs(guess - truth) / truth;
    if (error <= 0.1) return 100;
    return Math.max(0, 100 * (1 - (error - 0.1) / 0.4));
}

function submitGuess() {

    if (revealed) return;

    // Read the guess
    const guess = {};
    for (let i = 0; i < S.fields.length; i++) {
        const name = S.fields[i][0];
        const value = Number(document.getElementById("g_" + name).value);
        if (!(value > 0)) {
            document.getElementById("msgText").textContent = "Write a positive number in every box.";
            return;
        }
        if (name === "zeta" && value >= 1) {
            document.getElementById("msgText").textContent = "ζ must be below 1 for this curve (it overshoots).";
            return;
        }
        guess[name] = value;
    }

    // The sensor made from the guess: unknown values come from the guess, the rest are given
    guessSensor = Object.assign({}, S, guess);
    revealed = true;
    document.getElementById("msgText").textContent = "";
    document.getElementById("submitBtn").disabled = true;

    // Build the result table
    const names = { K: "K", tau: "τ (s)", zeta: "ζ", wn: "ωn (rad/s)" };
    let rows = "";
    let sum = 0;

    for (let i = 0; i < S.fields.length; i++) {
        const name = S.fields[i][0];
        const truth = S[name];
        const points = pointsFor(guess[name], truth);
        const errorPercent = (guess[name] - truth) / truth * 100;
        sum += points;

        rows += "<tr><td>" + names[name] + "</td><td>" + truth + "</td><td>" + guess[name] +
            "</td><td>" + errorPercent.toFixed(1) + "%</td><td>" + points.toFixed(0) + "</td></tr>";
    }

    const roundScore = sum / S.fields.length;
    totalPoints += roundScore;
    roundsPlayed++;

    document.getElementById("resultTable").innerHTML = rows;
    document.getElementById("roundScore").textContent =
        roundScore.toFixed(0) + " / 100" + (roundScore >= 100 ? "  (full marks)" : "");
    document.getElementById("resultModule").style.display = "block";

    document.getElementById("roundsResult").textContent = roundsPlayed;
    document.getElementById("totalResult").textContent = totalPoints.toFixed(0);
    document.getElementById("avgResult").textContent = (totalPoints / roundsPlayed).toFixed(0) + " / 100";

    // Show the true curve and the guess on top of the data
    drawMainGraph();
    drawLogGraph();
}


// Start the first round when the page opens
newSensor();
