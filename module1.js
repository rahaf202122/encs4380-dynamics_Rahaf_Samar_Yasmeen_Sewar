// ============================================================
// Module 1: First-Order Time Response (thermometer)
// ============================================================

// =====================================================
//  FORMULAS (from the lecture slides)
// =====================================================

// step input of size A
// y(t) = K * A * (1 - e^(-t/tau))
function stepOutput(t, K, A, tau) {
  return K * A * (1 - Math.exp(-t / tau));
}

// ramp input x(t) = R * t
// y(t) = K * R * (t - tau + tau * e^(-t/tau))
function rampOutput(t, K, R, tau) {
  return K * R * (t - tau + tau * Math.exp(-t / tau));
}


// =====================================================
//  MAIN FUNCTION: runs every time a slider moves
// =====================================================
function update() {

  // 1) read the sliders
  let K = Number(document.getElementById("kSlider").value);
  let tau = Number(document.getElementById("tauSlider").value);
  let A = Number(document.getElementById("aSlider").value);
  let isStep = document.getElementById("stepRadio").checked;

  // 2) show the values next to the sliders
  document.getElementById("kText").innerHTML = K;
  document.getElementById("tauText").innerHTML = tau;
  document.getElementById("aText").innerHTML = A;
  if (isStep) {
    document.getElementById("aLabel").innerHTML = "A (step size)";
  } else {
    document.getElementById("aLabel").innerHTML = "R (ramp rate per second)";
  }

  // 3) make the time points: 300 points from 0 to 6*tau
  let timeList = [];
  for (let i = 0; i <= 300; i++) {
    timeList.push(i * 6 * tau / 300);
  }

  if (isStep) {
    drawStep(timeList, K, A, tau);
  } else {
    drawRamp(timeList, K, A, tau);
  }

  // 4) update the question with the new values
  makeQuestion();
  document.getElementById("guessResult").innerHTML = "";
}


// =====================================================
//  STEP INPUT
// =====================================================
function drawStep(timeList, K, A, tau) {

  let finalValue = K * A;
  let outputList = [];
  let idealList = [];

  for (let i = 0; i < timeList.length; i++) {
    outputList.push(stepOutput(timeList[i], K, A, tau));
    idealList.push(finalValue);
  }

  // the two special points
  let yAtTau = stepOutput(tau, K, A, tau);
  let yAt3Tau = stepOutput(3 * tau, K, A, tau);

  // ----- graph 1: the response -----
  let idealLine = {
    x: timeList, y: idealList,
    name: "Ideal (K·A)",
    line: { dash: "dash", color: "gray" }
  };
  let sensorLine = {
    x: timeList, y: outputList,
    name: "Sensor output",
    line: { color: "blue", width: 3 }
  };
  let points = {
    x: [tau, 3 * tau], y: [yAtTau, yAt3Tau],
    mode: "markers+text",
    name: "τ and 3τ",
    text: ["63.2% at τ", "95% at 3τ"],
    textposition: "bottom right",
    marker: { size: 12, color: "red" }
  };
  Plotly.react("graph1", [idealLine, sensorLine, points], makeLayout("time t (s)", "y(t)"), { responsive: true });

  // ----- results box -----
  let percentAtTau = yAtTau / finalValue * 100;
  let percentAt3Tau = yAt3Tau / finalValue * 100;
  document.getElementById("results").innerHTML =
    "Final value K·A = " + finalValue.toFixed(2) + "<br>" +
    "At t = τ = " + tau + " s → y = " + yAtTau.toFixed(2) + " (" + percentAtTau.toFixed(1) + "%)<br>" +
    "At t = 3τ = " + (3 * tau) + " s → y = " + yAt3Tau.toFixed(2) + " (" + percentAt3Tau.toFixed(1) + "%)";

  // ----- graph 2: log of the error fraction -----
  // error fraction = (final - y) / final = e^(-t/tau)
  // ln(error fraction) = -t/tau  → straight line, slope = -1/tau
  let lnList = [];
  for (let i = 0; i < timeList.length; i++) {
    let errorFraction = (finalValue - outputList[i]) / finalValue;
    lnList.push(Math.log(errorFraction));
  }

  // measure the slope between two points (like on paper)
  let slope = (lnList[200] - lnList[50]) / (timeList[200] - timeList[50]);
  let tauFromSlope = -1 / slope;

  document.getElementById("graph2Title").innerHTML = "Log method: ln(error fraction) vs t";
  document.getElementById("graph2Note").innerHTML =
    "Straight line with slope = " + slope.toFixed(4) + " → τ = −1/slope = " + tauFromSlope.toFixed(2) + " s";

  let lnLine = {
    x: timeList, y: lnList,
    name: "ln(error fraction)",
    line: { color: "green", width: 3 }
  };
  Plotly.react("graph2", [lnLine], makeLayout("time t (s)", "ln((KA − y)/KA)"), { responsive: true });
}


// =====================================================
//  RAMP INPUT
// =====================================================
function drawRamp(timeList, K, R, tau) {

  let idealList = [];
  let outputList = [];
  let errorList = [];
  let steadyError = K * R * tau;
  let steadyList = [];

  for (let i = 0; i < timeList.length; i++) {
    let t = timeList[i];
    let ideal = K * R * t;
    let out = rampOutput(t, K, R, tau);
    idealList.push(ideal);
    outputList.push(out);
    errorList.push(ideal - out);
    steadyList.push(steadyError);
  }

  // ----- graph 1 -----
  let idealLine = {
    x: timeList, y: idealList,
    name: "Ideal K·R·t",
    line: { dash: "dash", color: "gray" }
  };
  let sensorLine = {
    x: timeList, y: outputList,
    name: "Sensor output",
    line: { color: "blue", width: 3 }
  };
  Plotly.react("graph1", [idealLine, sensorLine], makeLayout("time t (s)", "y(t)"), { responsive: true });

  // ----- results box -----
  document.getElementById("results").innerHTML =
    "Time lag = τ = " + tau + " s (the output is " + tau + " s behind the input)<br>" +
    "Steady-state error = K·R·τ = " + steadyError.toFixed(2);

  // ----- graph 2: the error -----
  document.getElementById("graph2Title").innerHTML = "Ramp error: ideal − output";
  document.getElementById("graph2Note").innerHTML =
    "The error grows, then stays at K·R·τ = " + steadyError.toFixed(2);

  let errorLine = {
    x: timeList, y: errorList,
    name: "Error",
    line: { color: "green", width: 3 }
  };
  let steadyLine = {
    x: timeList, y: steadyList,
    name: "K·R·τ",
    line: { dash: "dash", color: "red" }
  };
  Plotly.react("graph2", [errorLine, steadyLine], makeLayout("time t (s)", "error"), { responsive: true });
}


// =====================================================
//  same look for all graphs
// =====================================================
function makeLayout(xTitle, yTitle) {
  return {
    xaxis: { title: xTitle },
    yaxis: { title: yTitle },
    margin: { l: 55, r: 15, t: 15, b: 45 },
    legend: { orientation: "h", y: -0.25 },
    paper_bgcolor: "white",
    plot_bgcolor: "white"
  };
}


// =====================================================
//  LECTURE EXAMPLE: thermometer from 20°C air into 80°C tea
// =====================================================
function teaExample() {
  document.getElementById("stepRadio").checked = true;
  document.getElementById("kSlider").value = 1;
  document.getElementById("tauSlider").value = 10;
  document.getElementById("aSlider").value = 60;   // jump of 60°C (from 20 to 80)
  update();

  let after10 = 20 + stepOutput(10, 1, 60, 10);
  let after30 = 20 + stepOutput(30, 1, 60, 10);
  document.getElementById("teaText").innerHTML =
    "Start 20°C, tea 80°C, τ = 10 s:<br>" +
    "after 10 s it reads " + after10.toFixed(0) + "°C<br>" +
    "after 30 s it reads " + after30.toFixed(0) + "°C";
}


// =====================================================
//  PREDICT, THEN CHECK
//  The question uses the current slider values,
//  so it changes when the user moves a slider.
// =====================================================
let questionNumber = 0;    // which question is shown now
let correctAnswer = 0;     // the right answer for the current question

function makeQuestion() {
  let K = Number(document.getElementById("kSlider").value);
  let tau = Number(document.getElementById("tauSlider").value);
  let A = Number(document.getElementById("aSlider").value);
  let isStep = document.getElementById("stepRadio").checked;
  let text = "";

  if (isStep) {
    let finalValue = K * A;
    let q = questionNumber % 4;
    if (q == 0) {
      text = "With K = " + K + ", A = " + A + " and τ = " + tau + " s, what will the sensor read at t = " + tau + " s?";
      correctAnswer = stepOutput(tau, K, A, tau);
    } else if (q == 1) {
      text = "With τ = " + tau + " s, at what time (in s) will the output reach 95% of its final value?";
      correctAnswer = 3 * tau;
    } else if (q == 2) {
      text = "With K = " + K + " and A = " + A + ", what is the final value the sensor reaches?";
      correctAnswer = finalValue;
    } else {
      text = "With K = " + K + ", A = " + A + " and τ = " + tau + " s, what will the sensor read at t = " + (2 * tau) + " s?";
      correctAnswer = stepOutput(2 * tau, K, A, tau);
    }
  } else {
    let R = A;
    let q = questionNumber % 2;
    if (q == 0) {
      text = "Ramp input with τ = " + tau + " s. How many seconds is the output behind the ideal line?";
      correctAnswer = tau;
    } else {
      text = "Ramp input with K = " + K + ", R = " + R + " and τ = " + tau + " s. What is the steady-state error?";
      correctAnswer = K * R * tau;
    }
  }

  document.getElementById("questionText").innerHTML = text;
}

function newQuestion() {
  questionNumber = questionNumber + 1;
  document.getElementById("guess").value = "";
  document.getElementById("guessResult").innerHTML = "";
  makeQuestion();
}

function checkGuess() {
  let input = document.getElementById("guess").value;
  let resultText = document.getElementById("guessResult");

  if (input == "") {
    resultText.innerHTML = "Write your answer first.";
    return;
  }

  let guess = Number(input);
  // accept the answer if it is within 5% of the correct value
  let error = Math.abs(guess - correctAnswer) / Math.abs(correctAnswer) * 100;

  if (error <= 5) {
    resultText.innerHTML = "<span class='pass'>Correct!</span> The answer is " + correctAnswer.toFixed(2) + ". Check it on the graph.";
  } else {
    resultText.innerHTML = "<span class='fail'>Wrong.</span> The answer is " + correctAnswer.toFixed(2) + ". Look at the graph to see why.";
  }
}


// =====================================================
//  VALIDATION TEST 1
// =====================================================
function runValidation() {
  // any K, A, tau give the same ratio, so we use 1
  let ratioTau = stepOutput(1, 1, 1, 1);
  let ratio3Tau = stepOutput(3, 1, 1, 1);

  let tests = [
    ["1a", "First-order step: y(τ) / KA", 0.632, ratioTau],
    ["1b", "First-order step: y(3τ) / KA", 0.950, ratio3Tau]
  ];

  let rows = "";
  for (let i = 0; i < tests.length; i++) {
    let expected = tests[i][2];
    let ours = tests[i][3];
    let passed = Math.abs(ours - expected) < 0.001;

    rows += "<tr>";
    rows += "<td>" + tests[i][0] + "</td>";
    rows += "<td>" + tests[i][1] + "</td>";
    rows += "<td>" + expected.toFixed(3) + "</td>";
    rows += "<td>" + ours.toFixed(4) + "</td>";
    if (passed) {
      rows += "<td class='pass'>PASS</td>";
    } else {
      rows += "<td class='fail'>FAIL</td>";
    }
    rows += "</tr>";
  }
  document.getElementById("validationTable").innerHTML = rows;
}


// run once when the page opens
update();
runValidation();
