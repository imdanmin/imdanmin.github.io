const timerDisplay = document.getElementById('timer');
const startWorkBtn = document.getElementById('start-work-btn');
const takeBreakBtn = document.getElementById('take-break-btn');
const resetBtn = document.getElementById('reset-btn');
const standbyIndicator = document.getElementById('standby-indicator');
const workIndicator = document.getElementById('work-indicator');
const breakIndicator = document.getElementById('break-indicator');

let mode = 'standby';
let timer = 0;
let interval = null;
let workTime = 0;
let bellSound = new Audio('bell.wav');

function formatTime(seconds) {
    if (seconds < 0) seconds = 0; // Prevent negative time
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
}

function updateTimerDisplay() {
    timerDisplay.textContent = formatTime(timer);
}

function playBellSound() {
    bellSound.play().catch(error => {
        console.error('Error playing bell sound:', error);
    });
}

function setMode(newMode) {
    console.log(`Switching to mode: ${newMode}`); // Debugging
    mode = newMode;

    // Update indicator styles
    standbyIndicator.classList.toggle('active', mode === 'standby');
    workIndicator.classList.toggle('active', mode === 'work');
    breakIndicator.classList.toggle('active', mode === 'break');

    // Update button states
    startWorkBtn.disabled = mode !== 'standby';
    takeBreakBtn.disabled = mode !== 'work';
    resetBtn.disabled = mode === 'standby';

    // Clear any existing interval
    if (interval) {
        clearInterval(interval);
        interval = null;
    }

    if (mode === 'standby') {
        timer = 0;
        workTime = 0;
        updateTimerDisplay();
    } else if (mode === 'work') {
        timer = 0;
        workTime = 0;
        interval = setInterval(() => {
            timer++;
            workTime++;
            updateTimerDisplay();
            console.log(`Work time: ${workTime}s`); // Debugging
        }, 1000);
    } else if (mode === 'break') {
        timer = Math.max(1, Math.floor(workTime / 5)); // Ensure at least 1s break
        updateTimerDisplay();
        interval = setInterval(() => {
            timer--;
            updateTimerDisplay();
            console.log(`Break time remaining: ${timer}s`); // Debugging
            if (timer <= 0) {
                playBellSound();
                setMode('standby');
            }
        }, 1000);
    }
}

// Event listeners
startWorkBtn.addEventListener('click', () => {
    console.log('Start Work clicked');
    setMode('work');
});

takeBreakBtn.addEventListener('click', () => {
    console.log('Take Break clicked');
    setMode('break');
});

resetBtn.addEventListener('click', () => {
    console.log('Reset clicked');
    setMode('standby');
});

// Initialize
try {
    setMode('standby');
    console.log('Timer initialized');
    // Preload audio to avoid delays
    bellSound.load();
} catch (error) {
    console.error('Initialization error:', error);
}