// Get HTML elements
const kSlider = document.getElementById("kSlider");
const tauSlider = document.getElementById("tauSlider");
const frequencySlider = document.getElementById("frequencySlider");
const omegaSlider = document.getElementById("omega");
const amplitudeSlider = document.getElementById("amplitudeSlider");


// Main function to update calculations and graphs
function update() {

    // Read values from sliders
    const K = Number(kSlider.value);
    const tau = Number(tauSlider.value);
    const omega = Number(omegaSlider.value);
    const frequency = omega / (2 * Math.PI);
    const A = Number(amplitudeSlider.value);

    // Keep the frequency slider synchronized with omega
    frequencySlider.value = frequency.toFixed(3);

    // Calculate amplitude ratio
    const M = 1 / Math.sqrt(1 + Math.pow(omega * tau, 2));

    // Calculate phase lag in radians
    const phaseRadians = Math.atan(omega * tau);

    // Convert phase lag to degrees
    const phaseDegrees = phaseRadians * 180 / Math.PI;

    // Calculate dynamic error
    const dynamicError = M - 1;

    // Calculate cutoff angular frequency
    const cutoffFrequency = 1 / tau;

    // Calculate output amplitude
    const outputAmplitude = K * A * M;


    // Update slider values
    document.getElementById("kValue").textContent =
        K.toFixed(1);

    document.getElementById("tauValue").textContent =
        tau.toFixed(2);

    document.getElementById("frequencyValue").textContent =
        frequency.toFixed(3) + " Hz";

    document.getElementById("omegaControlValue").textContent =
        omega.toFixed(3) + " rad/s";

    document.getElementById("amplitudeValue").textContent =
        A.toFixed(1);


    // Update calculated results
    document.getElementById("mResult").textContent =
        M.toFixed(4);

    document.getElementById("phaseResult").textContent =
        phaseDegrees.toFixed(2) + "°";

    document.getElementById("errorResult").textContent =
        dynamicError.toFixed(4);

    document.getElementById("cutoffResult").textContent =
        cutoffFrequency.toFixed(2) + " rad/s";

    document.getElementById("omegaResult").textContent =
        omega.toFixed(3) + " rad/s";

    document.getElementById("outputAmplitudeResult").textContent =
        outputAmplitude.toFixed(4);


    // Draw input and output sine waves
    drawSineGraph(omega, A, phaseRadians, outputAmplitude);

    // Draw Bode plots
    drawBodeGraphs(tau);
}


// Draw input and output signals
function drawSineGraph(omega, A, phaseRadians, outputAmplitude) {

    const time = [];
    const inputSignal = [];
    const outputSignal = [];

    // Calculate the period
    const period = (2 * Math.PI) / omega;

    // Generate time values for three periods
    for (let i = 0; i <= 500; i++) {

        const t = (i / 500) * (3 * period);

        time.push(t);

        // Input sine wave
        const input = A * Math.sin(omega * t);

        // Output sine wave
        const output = outputAmplitude *
            Math.sin(omega * t - phaseRadians);

        inputSignal.push(input);
        outputSignal.push(output);
    }


    const data = [

        {
            x: time,
            y: inputSignal,
            type: "scatter",
            mode: "lines",
            name: "Input Signal",
            line: {
                color: "blue",
                width: 2
            }
        },

        {
            x: time,
            y: outputSignal,
            type: "scatter",
            mode: "lines",
            name: "Output Signal",
            line: {
                color: "red",
                width: 2
            }
        }

    ];


    const layout = {

        title: "Input and Output Sine Waves",

        xaxis: {
            title: "Time (seconds)"
        },

        yaxis: {
            title: "Amplitude"
        },

        legend: {
            orientation: "h"
        }

    };


    Plotly.react("sineGraph", data, layout, {
        responsive: true
    });

}


// Draw magnitude and phase Bode plots
function drawBodeGraphs(tau) {

    const frequencies = [];
    const magnitudes = [];
    const phases = [];

    // Calculate cutoff angular frequency
    const cutoffFrequency = 1 / tau;


    // Generate angular frequency values
    for (let i = 0; i <= 300; i++) {

        const omega = Math.pow(10, -2 + i * 0.02);

        frequencies.push(omega);

        // Calculate magnitude ratio
        const M = 1 / Math.sqrt(
            1 + Math.pow(omega * tau, 2)
        );

        magnitudes.push(M);

        // Calculate phase in degrees
        const phase =
            -Math.atan(omega * tau) * 180 / Math.PI;

        phases.push(phase);

    }


    // Magnitude plot
    const magnitudeData = [

        {
            x: frequencies,
            y: magnitudes,
            type: "scatter",
            mode: "lines",
            name: "Magnitude Ratio",
            line: {
                color: "blue",
                width: 2
            }
        },

        {
            x: [cutoffFrequency],
            y: [1 / Math.sqrt(2)],
            type: "scatter",
            mode: "markers",
            name: "Cutoff Point",
            marker: {
                color: "red",
                size: 10
            }
        }

    ];


    const magnitudeLayout = {

        title: "Magnitude Response",

        xaxis: {
            title: "Angular Frequency (rad/s)",
            type: "log"
        },

        yaxis: {
            title: "Amplitude Ratio (M)"
        },

        shapes: [

            {
                type: "line",
                x0: cutoffFrequency,
                x1: cutoffFrequency,
                y0: 0,
                y1: 1,
                xref: "x",
                yref: "y",
                line: {
                    color: "red",
                    dash: "dash",
                    width: 2
                }
            }

        ]

    };


    Plotly.react(
        "magnitudeGraph",
        magnitudeData,
        magnitudeLayout,
        { responsive: true }
    );


    // Phase plot
    const phaseData = [

        {
            x: frequencies,
            y: phases,
            type: "scatter",
            mode: "lines",
            name: "Phase Response",
            line: {
                color: "green",
                width: 2
            }
        },

        {
            x: [cutoffFrequency],
            y: [-45],
            type: "scatter",
            mode: "markers",
            name: "Cutoff Point (-45°)",
            marker: {
                color: "red",
                size: 10
            }
        }

    ];


    const phaseLayout = {

        title: "Phase Response",

        xaxis: {
            title: "Angular Frequency (rad/s)",
            type: "log"
        },

        yaxis: {
            title: "Phase (degrees)"
        },

        shapes: [

            {
                type: "line",
                x0: cutoffFrequency,
                x1: cutoffFrequency,
                y0: -90,
                y1: 0,
                xref: "x",
                yref: "y",
                line: {
                    color: "red",
                    dash: "dash",
                    width: 2
                }
            }

        ]

    };


    Plotly.react(
        "phaseGraph",
        phaseData,
        phaseLayout,
        { responsive: true }
    );

}


// Display validation result
function showCheck(id, statusId, actual, expected, tolerance) {

    const valueElement = document.getElementById(id);
    const statusElement = document.getElementById(statusId);

    valueElement.textContent = actual.toFixed(4);

    if (Math.abs(actual - expected) <= tolerance) {

        statusElement.textContent = "PASS";
        statusElement.className = "validation-result pass";

    } else {

        statusElement.textContent = "FAIL";
        statusElement.className = "validation-result fail";

    }

}


// Run validation tests
function runValidation() {

    const tau = 0.2;
    const omega = 2;

    // Test 1: Amplitude ratio
    const M = 1 / Math.sqrt(
        1 + Math.pow(omega * tau, 2)
    );

    // Test 2: Phase lag
    const phase = Math.atan(omega * tau) * 180 / Math.PI;

    // Test 3: Dynamic error
    const dynamicError = M - 1;

    // Test 4: Cutoff frequency
    const cutoff = 1 / tau;


    // Display validation results
    showCheck("v2a", "v2aS", M, 0.9285, 0.001);

    showCheck("v2b", "v2bS", phase, 21.8014, 0.01);

    showCheck("v2c", "v2cS", dynamicError, -0.0715, 0.001);

    showCheck("v2d", "v2dS", cutoff, 5, 0.001);


    // Calculate maximum time constant for 5% error at 100 Hz
    const maxFrequency = 100;

    const maxTau = Math.sqrt(
        (1 / Math.pow(0.95, 2)) - 1
    ) / (2 * Math.PI * maxFrequency);


    // Calculate phase at 50 Hz
    const phase50 = Math.atan(
        2 * Math.PI * 50 * maxTau
    ) * 180 / Math.PI;


    // Display additional results
    document.getElementById("maxTauResult").textContent =
        (maxTau * 1000).toFixed(3) + " ms";

    document.getElementById("phase50Result").textContent =
        phase50.toFixed(2) + "°";

}


// Set validation example values
function setValidationExample() {

    kSlider.value = 1;
    tauSlider.value = 0.2;

    // Set angular frequency to 2 rad/s
    omegaSlider.value = 2;

    // Convert angular frequency to Hz
    frequencySlider.value = (2 / (2 * Math.PI)).toFixed(3);

    amplitudeSlider.value = 1;

    update();

}


// Reset all controls
function resetControls() {

    kSlider.value = 1;
    tauSlider.value = 0.2;

    // Reset frequency to 0.5 Hz
    frequencySlider.value = 0.5;

    // Convert 0.5 Hz to angular frequency
    omegaSlider.value = (2 * Math.PI * 0.5).toFixed(3);

    amplitudeSlider.value = 1;

    update();

}


// Update when gain, time constant, or amplitude changes
kSlider.addEventListener("input", update);
tauSlider.addEventListener("input", update);
amplitudeSlider.addEventListener("input", update);


// When frequency in Hz changes, update angular frequency
frequencySlider.addEventListener("input", function () {

    const frequency = Number(frequencySlider.value);

    omegaSlider.value = (2 * Math.PI * frequency).toFixed(3);

    update();

});


// When angular frequency changes, update frequency in Hz
omegaSlider.addEventListener("input", function () {

    const omega = Number(omegaSlider.value);

    frequencySlider.value = (omega / (2 * Math.PI)).toFixed(3);

    update();

});


// Initialize the page
update();
runValidation();
