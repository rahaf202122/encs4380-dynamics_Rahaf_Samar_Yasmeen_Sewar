
// ============================================================
// Predict, then Check - P2
// ============================================================

// Correct answers for the three prediction questions
const p2CorrectAnswers = {
    p2q1: "b",
    p2q2: "b",
    p2q3: "a"
};

// Check the student's predictions
function checkP2Predictions() {

    const result = document.getElementById("predictionResult");

    let score = 0;
    let feedback = "";

    // Read the selected answer for each question
    const answer1 = document.querySelector(
        'input[name="p2q1"]:checked'
    );

    const answer2 = document.querySelector(
        'input[name="p2q2"]:checked'
    );

    const answer3 = document.querySelector(
        'input[name="p2q3"]:checked'
    );

    // Make sure all questions are answered
    if (!answer1 || !answer2 || !answer3) {
        result.style.display = "block";
        result.textContent =
            "Please answer all three questions before checking.";
        return;
    }

    // Check Question 1
    if (answer1.value === p2CorrectAnswers.p2q1) {
        score++;
        feedback +=
            "Q1 Correct: A larger sensor time constant means a slower sensor, so its measurement takes longer to follow the true output. ";
    } else {
        feedback +=
            "Q1 Incorrect: Increasing τs makes the sensor slower, not faster. ";
    }

    // Check Question 2
    if (answer2.value === p2CorrectAnswers.p2q2) {
        score++;
        feedback +=
            "Q2 Correct: The PID controller calculates its error using the measured output: e = r - ym. ";
    } else {
        feedback +=
            "Q2 Incorrect: The controller uses the sensor measurement ym, not the true output y. ";
    }

    // Check Question 3
    if (answer3.value === p2CorrectAnswers.p2q3) {
        score++;
        feedback +=
            "Q3 Correct: Delayed feedback can make the controller react too late, increasing overshoot and possibly causing oscillations.";
    } else {
        feedback +=
            "Q3 Incorrect: A very slow sensor can delay feedback and make the closed-loop response less stable.";
    }

    // Display the final score and explanations
    result.style.display = "block";

    result.innerHTML =
        "<strong>Your Score: " + score + " / 3</strong><br><br>" +
        feedback;
}


// Allow the student to try the questions again
function resetP2Predictions() {

    document.querySelectorAll(
        'input[name="p2q1"], input[name="p2q2"], input[name="p2q3"]'
    ).forEach(function(input) {
        input.checked = false;
    });

    const result = document.getElementById("predictionResult");

    result.style.display = "none";
    result.textContent = "";
}


// Connect prediction buttons
document.getElementById("checkPredictionButton")
    .addEventListener("click", checkP2Predictions);

document.getElementById("resetPredictionButton")
    .addEventListener("click", resetP2Predictions);
