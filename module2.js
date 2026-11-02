
// Get the controls from the HTML page
const gainSlider = document.getElementById("gain");
const tauSlider = document.getElementById("tau");
const frequencySlider = document.getElementById("frequency");
const amplitudeSlider = document.getElementById("amplitude");


// Update the page whenever a slider value changes
gainSlider.addEventListener("input", update);
tauSlider.addEventListener("input", update);
frequencySlider.addEventListener("input", update);
amplitudeSlider.addEventListener("input", update);


// Convert radians to degrees
function toDegrees(radians) {
    return radians * (180 / Math.PI);
}


// Main function: calculate the response and update all graphs
function update() {

    // Read the current values from the sliders
    const K = Number(gainSlider.value);
    const tau = Number(tauSlider.value);
    const frequency = Number(frequencySlider.value);
    const A = Number(amplitudeSlider.value);

    // Convert frequency from Hz to angular frequency in rad/s
    const omega = 2 * Math.PI * frequency;

    // Calculate the amplitude ratio
    const M = 1 / Math.sqrt(1 + Math.pow(omega * tau, 2));

    // Calculate the phase angle in radians
    const phaseRadians = -Math.atan(omega * tau);

    // Convert the phase angle to degrees
    const phaseDegrees = toDegrees(phaseRadians);

    // Calculate the dynamic error
    const dynamicError = M - 1;

    // Calculate the cutoff angular frequency
    const cutoffFrequency = 1 / tau;

    // Calculate the output amplitude
    const outputAmplitude = K * A * M;


    // Display the current slider values
    document.getElementById("gainValue").textContent = K.toFixed(2);
    document.getElementById("tauValue").textContent = tau.toFixed(3) + " s";
    document.getElementById("frequencyValue").textContent = frequency.toFixed(2) + " Hz";
    document.getElementById("amplitudeValue").textContent = A.toFixed(2);


    // Display the calculated results
    document.getElementById("mResult").textContent = M.toFixed(4);
    document.getElementById("phaseResult").textContent = phaseDegrees.toFixed(2) + "°";
    document.getElementById("errorResult").textContent =
        dynamicError.toFixed(4) + " (" + (dynamicError * 100).toFixed(2) + "%)";
    document.getElementById("cutoffResult").textContent =
        cutoffFrequency.toFixed(2) + " rad/s";
    document.getElementById("omegaResult").textContent =
        omega.toFixed(2) + " rad/s";
    document.getElementById("outputAmplitudeResult").textContent =
        outputAmplitude.toFixed(4);
    
    
    // Validation: maximum time constant at 100 Hz
    // The amplitude ratio must be at least 0.95
    const validationFrequency = 100;
    const minimumM = 0.95;

    // Calculate the maximum allowed tau
    const maxTau = Math.sqrt(
        (1 / Math.pow(minimumM, 2)) - 1
    ) / (2 * Math.PI * validationFrequency);

    // Calculate the phase lag at 50 Hz using the maximum tau
    const phaseAt50Hz = toDegrees(
        -Math.atan(2 * Math.PI * 50 * maxTau)
    );

    // Display the validation results
    document.getElementById("maxTauResult").textContent =
        (maxTau * 1000).toFixed(3) + " ms";

    document.getElementById("phase50Result").textContent =
        Math.abs(phaseAt50Hz).toFixed(2) + "° lag";


    // Draw the sine wave graph
    drawSineGraph(K, tau, omega, A, M, phaseRadians);

    // Draw the Bode magnitude and phase graphs
    drawBodeGraphs(tau, omega);
}


// Draw the input and output sine waves
function drawSineGraph(K, tau, omega, A, M, phaseRadians) {

    // Arrays used to store time and signal values
    const time = [];
    const inputSignal = [];
    const outputSignal = [];

    // Show four complete periods of the input signal
    const period = 1 / (omega / (2 * Math.PI));
    const totalTime = 4 * period;
    const numberOfPoints = 500;

    // Calculate the input and output signals at each time point
    for (let i = 0; i <= numberOfPoints; i++) {

        const t = (i / numberOfPoints) * totalTime;

        // Input signal: x(t) = A sin(ωt)
        const input = A * Math.sin(omega * t);

        // Output signal: y(t) = KAM sin(ωt + φ)
        const output = K * A * M * Math.sin(omega * t + phaseRadians);

        time.push(t);
        inputSignal.push(input);
        outputSignal.push(output);
    }

    // Create the input signal line
    const inputTrace = {
        x: time,
        y: inputSignal,
        mode: "lines",
        name: "Input Signal",
        line: {
            color: "#7654bd",
            width: 2
        }
    };

    // Create the output signal line
    const outputTrace = {
        x: time,
        y: outputSignal,
        mode: "lines",
        name: "Output Signal",
        line: {
            color: "#e18a38",
            width: 2
        }
    };

    // Set the graph title and axis labels
    const layout = {
        title: "Input vs Output Sine Waves",
        xaxis: {
            title: "Time (seconds)"
        },
        yaxis: {
            title: "Amplitude"
        },
        legend: {
            orientation: "h"
        },
        margin: {
            t: 50,
            l: 55,
            r: 20,
            b: 55
        }
    };

    // Display the graph inside the HTML element
    Plotly.newPlot("sineGraph", [inputTrace, outputTrace], layout,
        { responsive: true });
}


// Draw the Bode magnitude and phase graphs
function drawBodeGraphs(tau, currentOmega) {

    // Arrays used for the frequency values and calculated results
    const frequencies = [];
    const magnitudes = [];
    const phases = [];

    // Generate frequencies from 0.1 to 1000 rad/s on a logarithmic scale
    const minFrequency = 0.1;
    const maxFrequency = 1000;
    const numberOfPoints = 300;

    for (let i = 0; i < numberOfPoints; i++) {

        // Logarithmic frequency spacing
        const logFrequency =
            Math.log10(minFrequency) +
            (i / (numberOfPoints - 1)) *
            (Math.log10(maxFrequency) - Math.log10(minFrequency));

        const omega = Math.pow(10, logFrequency);

        // Calculate the amplitude ratio at this frequency
        const M = 1 / Math.sqrt(1 + Math.pow(omega * tau, 2));

        // Calculate the phase angle in degrees
        const phase = toDegrees(-Math.atan(omega * tau));

        frequencies.push(omega);
        magnitudes.push(M);
        phases.push(phase);
    }


    // Magnitude response trace
    const magnitudeTrace = {
        x: frequencies,
        y: magnitudes,
        mode: "lines",
        name: "Magnitude Ratio",
        line: {
            color: "#7654bd",
            width: 3
        }
    };

    // Mark the current input frequency on the magnitude graph
    const currentM = 1 / Math.sqrt(1 + Math.pow(currentOmega * tau, 2));

    const currentMagnitudePoint = {
        x: [currentOmega],
        y: [currentM],
        mode: "markers",
        name: "Current Frequency",
        marker: {
            color: "#e18a38",
            size: 10
        }
    };

    // Magnitude graph layout
    const magnitudeLayout = {
        title: "Bode Magnitude Plot",
        xaxis: {
            title: "Angular Frequency (rad/s)",
            type: "log"
        },
        yaxis: {
            title: "Amplitude Ratio (M)",
            range: [0, 1.05]
        },
        margin: {
            t: 50,
            l: 60,
            r: 20,
            b: 55
        }
    };

    Plotly.newPlot(
        "magnitudeGraph",
        [magnitudeTrace, currentMagnitudePoint],
        magnitudeLayout,
        { responsive: true }
    );


    // Phase response trace
    const phaseTrace = {
        x: frequencies,
        y: phases,
        mode: "lines",
        name: "Phase",
        line: {
            color: "#e18a38",
            width: 3
        }
    };

    // Calculate the phase at the current input frequency
    const currentPhase = toDegrees(-Math.atan(currentOmega * tau));

    // Mark the current input frequency on the phase graph
    const currentPhasePoint = {
        x: [currentOmega],
        y: [currentPhase],
        mode: "markers",
        name: "Current Frequency",
        marker: {
            color: "#7654bd",
            size: 10
        }
    };

    // Phase graph layout
    const phaseLayout = {
        title: "Bode Phase Plot",
        xaxis: {
            title: "Angular Frequency (rad/s)",
            type: "log"
        },
        yaxis: {
            title: "Phase Angle (degrees)",
            range: [-95, 5]
        },
        margin: {
            t: 50,
            l: 60,
            r: 20,
            b: 55
        }
    };

    Plotly.newPlot(
        "phaseGraph",
        [phaseTrace, currentPhasePoint],
        phaseLayout,
        { responsive: true }
    );
}


// Set the values required by the validation example
function setValidationExample() {

    // For sin(2t), angular frequency is 2 rad/s.
    // Frequency in Hz = 2 / (2π) ≈ 0.3183 Hz.
    gainSlider.value = 1;
    tauSlider.value = 0.2;
    frequencySlider.value = 2 / (2 * Math.PI);
    amplitudeSlider.value = 1;

    // Recalculate the results and redraw the graphs
    update();
}


// Return all controls to their initial values
function resetControls() {

    gainSlider.value = 1;
    tauSlider.value = 0.2;
    frequencySlider.value = 0.32;
    amplitudeSlider.value = 1;

    update();
}


// Run the update function when the page first opens
update();
