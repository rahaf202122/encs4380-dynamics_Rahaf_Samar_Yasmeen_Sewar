// ============================================================
// Module 3: Second-Order Response (mass-spring-damper)
// ============================================================

// Tolerance used to decide that zeta is exactly 1 (critically damped)
const EPS = 1e-6;

// Get the controls from the HTML page
const massSlider = document.getElementById("mass");
const dampingSlider = document.getElementById("damping");
const springSlider = document.getElementById("spring");
const amplitudeSlider = document.getElementById("amplitude");

// Update the page whenever a slider value changes
massSlider.addEventListener("input", update);
dampingSlider.addEventListener("input", update);
springSlider.addEventListener("input", update);
amplitudeSlider.addEventListener("input", update);


// ------------------------------------------------------------
// 1. System parameters
// ------------------------------------------------------------

// From m, b, k calculate wn, zeta and the static gain K
function makeSystem(m, b, k) {
    return {
        m: m,
        b: b,
        k: k,
        wn: Math.sqrt(k / m),
        zeta: b / (2 * Math.sqrt(k * m)),
        K: 1 / k
    };
}

// Name of the damping case
function dampingType(zeta) {
    if (zeta < 1 - EPS) return "Underdamped";
    if (Math.abs(zeta - 1) <= EPS) return "Critically damped";
    return "Overdamped";
}

// Poles of G(s): roots of s^2 + 2*zeta*wn*s + wn^2 = 0
function getPoles(wn, zeta) {
    if (zeta < 1 - EPS) {
        const re = -zeta * wn;
        const im = wn * Math.sqrt(1 - zeta * zeta);
        return [{ re: re, im: im }, { re: re, im: -im }];
    }
    if (Math.abs(zeta - 1) <= EPS) {
        return [{ re: -wn, im: 0 }, { re: -wn, im: 0 }];
    }
    const root = wn * Math.sqrt(zeta * zeta - 1);
    return [
        { re: -zeta * wn + root, im: 0 },
        { re: -zeta * wn - root, im: 0 }
    ];
}

// Eigenvalues of A = [[0, 1], [-k/m, -b/m]]
// For a 2x2 matrix: lambda = (trace +- sqrt(trace^2 - 4*det)) / 2
function getEigenvalues(m, b, k) {
    const trace = -b / m;
    const det = k / m;
    const disc = trace * trace - 4 * det;

    if (disc >= 0) {
        const root = Math.sqrt(disc);
        return [
            { re: (trace + root) / 2, im: 0 },
            { re: (trace - root) / 2, im: 0 }
        ];
    }
    const im = Math.sqrt(-disc) / 2;
    return [{ re: trace / 2, im: im }, { re: trace / 2, im: -im }];
}

// Sort pairs so two lists can be compared element by element
function sortPoles(list) {
    return list.slice().sort(function (p, q) {
        return (q.im - p.im) || (p.re - q.re);
    });
}

// Check that two lists of poles are the same numbers
function samePoles(listA, listB) {
    const a = sortPoles(listA);
    const b = sortPoles(listB);
    for (let i = 0; i < 2; i++) {
        const scale = Math.max(1, Math.abs(a[i].re), Math.abs(a[i].im));
        if (Math.abs(a[i].re - b[i].re) > 1e-4 * scale) return false;
        if (Math.abs(a[i].im - b[i].im) > 1e-4 * scale) return false;
    }
    return true;
}

// Write the poles as text
function formatPoles(list) {
    const p = sortPoles(list);
    if (Math.abs(p[0].im) < 1e-6) {
        return "s₁ = " + p[0].re.toFixed(3) + ",  s₂ = " + p[1].re.toFixed(3);
    }
    return p[0].re.toFixed(3) + " ± j" + Math.abs(p[0].im).toFixed(3);
}


// ------------------------------------------------------------
// 2. Closed-form step response (unit step, K = 1)
// ------------------------------------------------------------

function unitStep(t, wn, zeta) {

    // Underdamped: y = 1 - e^(-zeta*wn*t)/sqrt(1-zeta^2) * sin(wd*t + phi)
    if (zeta < 1 - EPS) {
        const wd = wn * Math.sqrt(1 - zeta * zeta);
        const phi = Math.acos(zeta);
        return 1 - Math.exp(-zeta * wn * t) / Math.sqrt(1 - zeta * zeta) *
            Math.sin(wd * t + phi);
    }

    // Critically damped: y = 1 - (1 + wn*t) * e^(-wn*t)
    if (Math.abs(zeta - 1) <= EPS) {
        return 1 - (1 + wn * t) * Math.exp(-wn * t);
    }

    // Overdamped: y = 1 + (s2*e^(s1*t) - s1*e^(s2*t)) / (s1 - s2)
    const root = wn * Math.sqrt(zeta * zeta - 1);
    const s1 = -zeta * wn + root;
    const s2 = -zeta * wn - root;
    return 1 + (s2 * Math.exp(s1 * t) - s1 * Math.exp(s2 * t)) / (s1 - s2);
}

// How long we simulate, long enough to see the response settle
function simulationTime(wn, zeta) {
    if (zeta < 1 - EPS) {
        return 8 / (zeta * wn);
    }
    if (Math.abs(zeta - 1) <= EPS) {
        return 8 / wn;
    }
    // Overdamped: the slowest pole decides how long it takes
    const slowPole = wn * (zeta - Math.sqrt(zeta * zeta - 1));
    return 8 / slowPole;
}

// Number of points: enough to draw every oscillation smoothly
function numberOfPoints(wn, zeta, tEnd) {
    let n = 2000;
    if (zeta < 1 - EPS) {
        const wd = wn * Math.sqrt(1 - zeta * zeta);
        const period = 2 * Math.PI / wd;
        n = Math.ceil(tEnd / (period / 40));
    }
    return Math.min(20000, Math.max(2000, n));
}

// Calculate the normalized step response y/(K*F0) on a time grid
function stepResponseData(wn, zeta) {
    const tEnd = simulationTime(wn, zeta);
    const n = numberOfPoints(wn, zeta, tEnd);

    const t = [];
    const r = [];

    for (let i = 0; i <= n; i++) {
        const ti = (i / n) * tEnd;
        t.push(ti);
        r.push(unitStep(ti, wn, zeta));
    }

    return { t: t, r: r, tEnd: tEnd, n: n };
}


// ------------------------------------------------------------
// 3. Metrics read from the curve (r = y / final value)
// ------------------------------------------------------------

// Time when the curve first reaches a level (linear interpolation)
function firstCrossing(t, r, level) {
    for (let i = 1; i < r.length; i++) {
        if (r[i] >= level) {
            const fraction = (level - r[i - 1]) / (r[i] - r[i - 1]);
            return t[i - 1] + fraction * (t[i] - t[i - 1]);
        }
    }
    return null;
}

function measureCurve(t, r) {

    // Rise time: from 10% to 90% of the final value
    const t10 = firstCrossing(t, r, 0.1);
    const t90 = firstCrossing(t, r, 0.9);
    const riseTime = (t10 !== null && t90 !== null) ? t90 - t10 : null;

    // Peak: the maximum point of the curve
    let peakIndex = 0;
    for (let i = 1; i < r.length; i++) {
        if (r[i] > r[peakIndex]) peakIndex = i;
    }
    const peakValue = r[peakIndex];

    // Overshoot: how far the peak goes above the final value
    let overshoot = (peakValue - 1) * 100;
    if (overshoot < 1e-6) overshoot = 0;

    const peakTime = overshoot > 0 ? t[peakIndex] : null;

    // Settling time (2%): the LAST moment the curve is outside the band
    let lastOutside = -1;
    for (let i = 0; i < r.length; i++) {
        if (Math.abs(r[i] - 1) > 0.02) lastOutside = i;
    }

    let settlingTime = null;
    if (lastOutside === -1) {
        settlingTime = 0;
    } else if (lastOutside < r.length - 1) {
        settlingTime = t[lastOutside + 1];
    }

    return {
        t10: t10,
        t90: t90,
        riseTime: riseTime,
        peakTime: peakTime,
        peakValue: peakValue,
        overshoot: overshoot,
        settlingTime: settlingTime
    };
}


// ------------------------------------------------------------
// 4. RK4 solver for the state-space model
// ------------------------------------------------------------
// x1' = x2
// x2' = (F0 - b*x2 - k*x1) / m
function simulateStateSpace(sys, F0, tEnd, n) {
    const m = sys.m;
    const b = sys.b;
    const k = sys.k;

    function derivative(x1, x2) {
        return [x2, (F0 - b * x2 - k * x1) / m];
    }

    // Use smaller internal steps if the system is fast (keeps RK4 accurate)
    const poles = getEigenvalues(m, b, k);
    const fastest = Math.max(
        Math.hypot(poles[0].re, poles[0].im),
        Math.hypot(poles[1].re, poles[1].im)
    );
    const h = tEnd / n;
    const sub = Math.max(1, Math.ceil(h * fastest / 0.1));
    const dt = h / sub;

    let x1 = 0;
    let x2 = 0;

    const t = [0];
    const X1 = [0];
    const X2 = [0];

    for (let i = 1; i <= n; i++) {
        for (let s = 0; s < sub; s++) {
            const k1 = derivative(x1, x2);
            const k2 = derivative(x1 + dt / 2 * k1[0], x2 + dt / 2 * k1[1]);
            const k3 = derivative(x1 + dt / 2 * k2[0], x2 + dt / 2 * k2[1]);
            const k4 = derivative(x1 + dt * k3[0], x2 + dt * k3[1]);

            x1 += dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
            x2 += dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
        }
        t.push(i * h);
        X1.push(x1);
        X2.push(x2);
    }

    return { t: t, x1: X1, x2: X2 };
}


// ------------------------------------------------------------
// 5. Main function: calculate everything and update the page
// ------------------------------------------------------------
function update() {

    // Read the current values from the sliders
    const m = Number(massSlider.value);
    const b = Number(dampingSlider.value);
    const k = Number(springSlider.value);
    const F0 = Number(amplitudeSlider.value);

    const sys = makeSystem(m, b, k);
    const finalValue = sys.K * F0;

    // Display the current slider values
    document.getElementById("massValue").textContent = m.toFixed(1) + " kg";
    document.getElementById("dampingValue").textContent = b.toFixed(1) + " N·s/m";
    document.getElementById("springValue").textContent = k.toFixed(1) + " N/m";
    document.getElementById("amplitudeValue").textContent = F0.toFixed(1) + " N";

    // Closed-form response and the metrics read from it
    const data = stepResponseData(sys.wn, sys.zeta);
    const metrics = measureCurve(data.t, data.r);

    // State-space simulation (RK4) on the same time grid
    const sim = simulateStateSpace(sys, F0, data.tEnd, data.n);

    // Poles and eigenvalues
    const poles = getPoles(sys.wn, sys.zeta);
    const eigenvalues = getEigenvalues(m, b, k);

    // Display the calculated results
    document.getElementById("wnResult").textContent = sys.wn.toFixed(3) + " rad/s";
    document.getElementById("zetaResult").textContent = sys.zeta.toFixed(3);
    document.getElementById("typeResult").textContent = dampingType(sys.zeta);
    document.getElementById("kResult").textContent = sys.K.toFixed(4);
    document.getElementById("finalResult").textContent = finalValue.toFixed(4) + " m";

    document.getElementById("riseResult").textContent =
        metrics.riseTime !== null ? metrics.riseTime.toFixed(3) + " s" : "-";

    document.getElementById("peakResult").textContent =
        metrics.peakTime !== null ? metrics.peakTime.toFixed(3) + " s" : "none";

    document.getElementById("overshootResult").textContent =
        metrics.overshoot.toFixed(2) + "%";

    document.getElementById("settlingResult").textContent =
        metrics.settlingTime !== null ? metrics.settlingTime.toFixed(3) + " s" : "-";

    document.getElementById("polesResult").textContent = formatPoles(poles);
    document.getElementById("eigResult").textContent = formatPoles(eigenvalues);

    const same = samePoles(poles, eigenvalues);
    document.getElementById("matchResult").innerHTML = same
        ? "✅ The eigenvalues of A are the same numbers as the poles of G(s)."
        : "❌ The eigenvalues of A and the poles are different. Check the calculation.";

    // State-space matrices (live)
    showMatrices(m, b, k);

    // Draw the graphs
    drawStepGraph(sys, F0, data, metrics, sim);
    drawSPlane(poles, eigenvalues);
    drawPhasePlane(sys, F0, sim);
}


// Show A, B and C as matrices
function showMatrices(m, b, k) {

    function matrixHTML(rows) {
        let html = '<table class="matrix">';
        for (let i = 0; i < rows.length; i++) {
            html += "<tr>";
            for (let j = 0; j < rows[i].length; j++) {
                html += "<td>" + rows[i][j] + "</td>";
            }
            html += "</tr>";
        }
        return html + "</table>";
    }

    document.getElementById("matrixA").innerHTML = matrixHTML([
        ["0", "1"],
        [(-k / m).toFixed(3), (-b / m).toFixed(3)]
    ]);

    document.getElementById("matrixB").innerHTML = matrixHTML([
        ["0"],
        [(1 / m).toFixed(3)]
    ]);

    document.getElementById("matrixC").innerHTML = matrixHTML([
        ["1", "0"]
    ]);
}


// ------------------------------------------------------------
// 6. Graphs
// ------------------------------------------------------------

// Layout settings that depend on the screen size (phone or computer).
// On a phone the legend becomes a tall column, so the figure needs more room.
function screenSettings(legendEntries) {
    const narrow = window.innerWidth < 700;
    const bottom = narrow ? 90 + 24 * legendEntries : 120;
    return {
        bottom: bottom,
        height: narrow ? 300 + bottom : undefined,
        titleSize: narrow ? 14 : 17
    };
}

// Legend at the bottom of the figure, under the axis title
const legendBelow = {
    orientation: "h",
    yref: "container",
    y: 0,
    yanchor: "bottom"
};

// No toolbar icons (they cover the title on a phone)
const plotConfig = { responsive: true, displayModeBar: false };

// Step response with the measured points marked on the curve
function drawStepGraph(sys, F0, data, metrics, sim) {
    const screen = screenSettings(7);

    const finalValue = sys.K * F0;
    const t = data.t;
    const y = data.r.map(function (value) { return value * finalValue; });

    const curve = {
        x: t,
        y: y,
        mode: "lines",
        name: "x(t) from formula",
        line: { color: "#7654bd", width: 3 }
    };

    // The RK4 result of the state-space model (dotted, should lie on the curve)
    const rk4 = {
        x: sim.t,
        y: sim.x1,
        mode: "lines",
        name: "x₁(t) from RK4",
        line: { color: "#e18a38", width: 2, dash: "dot" }
    };

    const finalLine = {
        x: [0, data.tEnd],
        y: [finalValue, finalValue],
        mode: "lines",
        name: "Final value",
        line: { color: "gray", width: 1.5, dash: "dash" }
    };

    const upperBand = {
        x: [0, data.tEnd],
        y: [1.02 * finalValue, 1.02 * finalValue],
        mode: "lines",
        name: "±2% band",
        line: { color: "gray", width: 1, dash: "dot" }
    };

    const lowerBand = {
        x: [0, data.tEnd],
        y: [0.98 * finalValue, 0.98 * finalValue],
        mode: "lines",
        showlegend: false,
        line: { color: "gray", width: 1, dash: "dot" }
    };

    const traces = [curve, rk4, finalLine, upperBand, lowerBand];

    // Rise time points (10% and 90%)
    if (metrics.t10 !== null && metrics.t90 !== null) {
        traces.push({
            x: [metrics.t10, metrics.t90],
            y: [0.1 * finalValue, 0.9 * finalValue],
            mode: "markers",
            name: "Rise time (10%, 90%)",
            marker: { color: "#2a9d8f", size: 10 }
        });
    }

    // Peak point
    if (metrics.peakTime !== null) {
        traces.push({
            x: [metrics.peakTime],
            y: [metrics.peakValue * finalValue],
            mode: "markers",
            name: "Peak",
            marker: { color: "red", size: 11, symbol: "triangle-up" }
        });
    }

    // Settling point
    if (metrics.settlingTime !== null && metrics.settlingTime > 0) {
        const index = Math.min(
            t.length - 1,
            Math.round(metrics.settlingTime / data.tEnd * data.n)
        );
        traces.push({
            x: [metrics.settlingTime],
            y: [y[index]],
            mode: "markers",
            name: "Settling time (2%)",
            marker: { color: "black", size: 11, symbol: "diamond" }
        });
    }

    const layout = {
        title: { text: "Step Response of the Mass-Spring-Damper", font: { size: screen.titleSize } },
        xaxis: { title: "Time (seconds)" },
        yaxis: { title: "Displacement x (m)" },
        legend: legendBelow,
        height: screen.height,
        margin: { t: 50, l: 65, r: 20, b: screen.bottom }
    };

    Plotly.newPlot("stepGraph", traces, layout, plotConfig);
}


// Poles and eigenvalues in the s-plane
function drawSPlane(poles, eigenvalues) {
    const screen = screenSettings(2);

    // Size of the plot depends on the farthest pole
    let radius = 0;
    for (let i = 0; i < 2; i++) {
        radius = Math.max(radius, Math.hypot(poles[i].re, poles[i].im));
    }
    radius = radius * 1.3;

    // Imaginary axis and real axis
    const imaginaryAxis = {
        x: [0, 0],
        y: [-radius, radius],
        mode: "lines",
        showlegend: false,
        line: { color: "black", width: 1 }
    };

    const realAxis = {
        x: [-1.4 * radius, 0.4 * radius],
        y: [0, 0],
        mode: "lines",
        showlegend: false,
        line: { color: "black", width: 1 }
    };

    const poleTrace = {
        x: poles.map(function (p) { return p.re; }),
        y: poles.map(function (p) { return p.im; }),
        mode: "markers",
        name: "Poles of G(s)",
        marker: { color: "#7654bd", size: 14, symbol: "x", line: { width: 3 } }
    };

    // The eigenvalues are drawn as circles around the poles: same place
    const eigTrace = {
        x: eigenvalues.map(function (p) { return p.re; }),
        y: eigenvalues.map(function (p) { return p.im; }),
        mode: "markers",
        name: "Eigenvalues of A",
        marker: {
            color: "rgba(0,0,0,0)",
            size: 22,
            symbol: "circle",
            line: { color: "#e18a38", width: 3 }
        }
    };

    const layout = {
        title: { text: "s-plane: Poles and Eigenvalues", font: { size: screen.titleSize } },
        xaxis: { title: "Real part (σ)", range: [-1.4 * radius, 0.4 * radius], zeroline: false },
        yaxis: { title: "Imaginary part (jω)", range: [-radius, radius], zeroline: false },
        legend: legendBelow,
        height: screen.height,
        margin: { t: 50, l: 65, r: 20, b: screen.bottom }
    };

    Plotly.newPlot("sGraph", [imaginaryAxis, realAxis, poleTrace, eigTrace],
        layout, plotConfig);
}


// Phase plane: position x1 against velocity x2
function drawPhasePlane(sys, F0, sim) {
    const screen = screenSettings(3);

    const path = {
        x: sim.x1,
        y: sim.x2,
        mode: "lines",
        name: "Path (x₁, x₂)",
        line: { color: "#7654bd", width: 2 }
    };

    const start = {
        x: [0],
        y: [0],
        mode: "markers",
        name: "Start",
        marker: { color: "#2a9d8f", size: 11 }
    };

    const end = {
        x: [F0 / sys.k],
        y: [0],
        mode: "markers",
        name: "Final point (F₀/k, 0)",
        marker: { color: "red", size: 11, symbol: "star" }
    };

    const layout = {
        title: { text: "Phase Plane during the Step Response", font: { size: screen.titleSize } },
        xaxis: { title: "Displacement x₁ (m)" },
        yaxis: { title: "Velocity x₂ (m/s)" },
        legend: legendBelow,
        height: screen.height,
        margin: { t: 50, l: 65, r: 20, b: screen.bottom }
    };

    Plotly.newPlot("phaseGraph", [path, start, end], layout, plotConfig);
}


// ------------------------------------------------------------
// 7. Buttons
// ------------------------------------------------------------

// Set m, b and k to a chosen case
function setPreset(m, b, k) {
    massSlider.value = m;
    dampingSlider.value = b;
    springSlider.value = k;
    amplitudeSlider.value = 1;
    update();
}

// Return all controls to their initial values
function resetControls() {
    setPreset(1, 2, 4);
}


// ------------------------------------------------------------
// 8. Predict, then check
// ------------------------------------------------------------
function checkPrediction() {
    const choice = document.querySelector('input[name="pred"]:checked');
    const output = document.getElementById("predResult");

    if (!choice) {
        output.textContent = "Pick an answer first.";
        return;
    }

    if (choice.value === "up") {
        output.textContent =
            "Correct! ζ = b / (2√(km)), so a smaller b gives a smaller ζ, and the overshoot " +
            "e^(−πζ/√(1−ζ²)) gets bigger. Now move the damper slider and watch it.";
    } else {
        output.textContent =
            "Not quite. Decrease b with the slider and watch the overshoot: less damping means more oscillation.";
    }
}


// ------------------------------------------------------------
// 9. Validation checks (independent of the sliders)
// ------------------------------------------------------------
function showCheck(valueId, text, passed) {
    document.getElementById(valueId).textContent = text;
    document.getElementById(valueId + "S").textContent = passed ? "✅ PASS" : "❌ FAIL";
}

function runValidation() {

    // Check 4: zeta = 0.5 gives about 16.3% overshoot
    // (m = 1, b = 2, k = 4 gives wn = 2 and zeta = 0.5)
    const sys4 = makeSystem(1, 2, 4);
    const data4 = stepResponseData(sys4.wn, sys4.zeta);
    const metrics4 = measureCurve(data4.t, data4.r);
    showCheck("v4a", metrics4.overshoot.toFixed(2) + "%",
        Math.abs(metrics4.overshoot - 16.3) <= 0.1);

    // Check 5: zeta = 1 gives no overshoot
    // (m = 1, b = 4, k = 4 gives wn = 2 and zeta = 1)
    const sys5 = makeSystem(1, 4, 4);
    const data5 = stepResponseData(sys5.wn, sys5.zeta);
    const metrics5 = measureCurve(data5.t, data5.r);
    showCheck("v5a", metrics5.overshoot.toFixed(2) + "%  (ζ = " + sys5.zeta.toFixed(2) + ")",
        metrics5.overshoot === 0);

    // Check 6: eigenvalues of A for m = 1, b = 2, k = 4 are -1 +- j1.732
    const eig = getEigenvalues(1, 2, 4);
    const eigOk =
        Math.abs(eig[0].re + 1) < 0.001 &&
        Math.abs(Math.abs(eig[0].im) - 1.732) < 0.001;
    showCheck("v6a", formatPoles(eig), eigOk);

    // Check 6: the eigenvalues are equal to the poles
    const poles6 = getPoles(sys4.wn, sys4.zeta);
    const equal = samePoles(poles6, eig);
    showCheck("v6b", equal ? "equal" : "different", equal);
}


// Run when the page first opens
update();
runValidation();
