/* script.js - Flowmodoro logic (work up, break down), progress ring, petals, localStorage, bell at 1/5 volume */

let timerInterval;
let startTime;
let elapsedTime = 0;
let isRunning = false;
let isWorkMode = true;
let totalWorkTime = 0;
let breakDuration = 0; // ms

// DOM handles (initialized on DOMContentLoaded)
let progressCircle, progressCircumference;
let bellEl;
const progressRadius = 55; // Adjusted to fit full circle in 120x120 SVG with stroke 10

// Particle spawning
let particleSpawner;
let spawnRate = 300; // ms, higher rate (lower number) for more particles
let currentParticleType = "petal"; // "petal" or "snow"

function initDOM() {
  progressCircle = document.getElementById("progress-circle");
  const radius = progressRadius;
  progressCircumference = 2 * Math.PI * radius;
  if (progressCircle) {
    progressCircle.style.strokeDasharray = progressCircumference;
    progressCircle.style.strokeDashoffset = progressCircumference;
  }

  bellEl = document.getElementById("bell-sound");
  if (bellEl) bellEl.volume = 0.2; // 1/5 volume

  // Enter to add task
  const newTaskInput = document.getElementById("new-task");
  if (newTaskInput) {
    newTaskInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        addTask();
      }
    });
  }

  // Initialize stop button state
  updateStopButtonState();
}

function toggleTimer() {
  if (isRunning) pauseTimer();
  else startTimer();
}

function startTimer() {
  // Start or resume timer
  startTime = Date.now() - elapsedTime;
  timerInterval = setInterval(updateTime, 250);
  document.getElementById("start-btn").textContent = "Pause";
  isRunning = true;
  updateHeaderText();
  updateModeClasses();
  updateStopButtonState();
}

function pauseTimer() {
  clearInterval(timerInterval);
  document.getElementById("start-btn").textContent = "Start";
  isRunning = false;
  updateHeaderText();
  updateModeClasses();
  updateStopButtonState();
}

function resetTimer() {
  clearInterval(timerInterval);
  elapsedTime = 0;
  document.getElementById("time").textContent = "00:00";
  document.getElementById("start-btn").textContent = "Start";
  isRunning = false;
  updateProgress(0);
  updateHeaderText();
  updateModeClasses();
  updateStopButtonState();
}

function updateStopButtonState() {
  const stopBtn = document.getElementById("stop-btn");
  if (isWorkMode && isRunning) {
    stopBtn.disabled = false;
  } else {
    stopBtn.disabled = true;
  }
}

function stopWork() {
  if (!isWorkMode || !isRunning) return; // Ignore if not in active work mode

  // Stop counting up and log work session
  clearInterval(timerInterval);
  isRunning = false;
  document.getElementById("start-btn").textContent = "Start";

  let workDuration = elapsedTime; // ms
  totalWorkTime += workDuration;
  document.getElementById("total-time").textContent = "Total Work Time: " + formatTime(totalWorkTime);

  logSession("work", workDuration);

  // Compute break duration (work / 5)
  breakDuration = Math.floor(workDuration / 5); // ms
  if (breakDuration < 1000) breakDuration = 1000;

  // Start break
  startBreak(breakDuration);

  // Reset work elapsed
  elapsedTime = 0;
  document.getElementById("time").textContent = "00:00";
  updateModeClasses();
  updateStopButtonState();
}

function startBreak(durationMs) {
  isWorkMode = false;
  document.getElementById("mode").textContent = "Break";
  updatePetalSpawnRate(100); // Faster rate for more petals in break
  updateHeaderText();
  updateModeClasses();

  startTime = Date.now();
  elapsedTime = 0;
  // Initialize progress to full (ratio = 1)
  updateProgress(1);
  timerInterval = setInterval(updateTime, 250);
  isRunning = true;
  document.getElementById("start-btn").textContent = "Pause";
  updateStopButtonState();
}

function updateTime() {
  elapsedTime = Date.now() - startTime;
  if (isWorkMode) {
    // work: count up
    document.getElementById("time").textContent = formatTime(elapsedTime);
  } else {
    // break: show remaining time and countdown
    let remaining = breakDuration - elapsedTime;
    if (remaining <= 0) {
      // break finished
      clearInterval(timerInterval);
      logSession("break", breakDuration);
      playBell(); // Only play at end of break
      isWorkMode = true;
      document.getElementById("mode").textContent = "Standby";
      isRunning = false;
      document.getElementById("start-btn").textContent = "Start";
      updatePetalSpawnRate(300); // Back to normal rate
      elapsedTime = 0;
      document.getElementById("time").textContent = "00:00";
      updateProgress(0);
      updateHeaderText();
      updateModeClasses();
      updateStopButtonState();
      return;
    }
    document.getElementById("time").textContent = formatTime(remaining);
    // ratio = remaining / breakDuration (1 => full, 0 => done)
    updateProgress(remaining / breakDuration);
  }
}

function updateProgress(ratio) {
  // ratio expected between 0 and 1 (1 = full circle, 0 = empty)
  if (!progressCircle) return;
  const offset = progressCircumference * (1 - Math.max(0, Math.min(1, ratio)));
  progressCircle.style.strokeDashoffset = offset;
}

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function logSession(type, durationMs) {
  const log = document.getElementById("session-log");
  const entry = document.createElement("li");
  entry.classList.add("session-entry", type === "work" ? "work" : "break");

  const label = document.createElement("div");
  label.classList.add("session-label");
  label.classList.add(type);
  label.textContent = type === "work" ? "Work Session" : "Break Session";

  const time = document.createElement("div");
  time.classList.add("session-time");
  time.classList.add(type);
  time.textContent = formatTime(durationMs);

  entry.appendChild(label);
  entry.appendChild(time);

  // newest at top: prepend
  if (log.firstChild) log.insertBefore(entry, log.firstChild);
  else log.appendChild(entry);

  saveSessions();
}

function addTask() {
  const taskInput = document.getElementById("new-task");
  const taskText = taskInput.value.trim();
  if (!taskText) return;

  const li = document.createElement("li");
  li.textContent = taskText;

  const removeBtn = document.createElement("button");
  removeBtn.textContent = "✖";
  removeBtn.onclick = function () {
    li.remove();
    saveTasks();
  };

  li.appendChild(removeBtn);
  document.getElementById("task-list").appendChild(li);
  taskInput.value = "";
  saveTasks();
}

/* localStorage: tasks */
function saveTasks() {
  const tasks = [];
  document.querySelectorAll("#task-list li").forEach((li) => {
    // li.childNodes[0] is the text node
    const text = li.childNodes[0] ? li.childNodes[0].nodeValue.trim() : "";
    if (text) tasks.push(text);
  });
  localStorage.setItem("flowmodoro_tasks", JSON.stringify(tasks));
}

function loadTasks() {
  const arr = JSON.parse(localStorage.getItem("flowmodoro_tasks") || "[]");
  arr.forEach((t) => {
    const li = document.createElement("li");
    li.textContent = t;
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "✖";
    removeBtn.onclick = function () {
      li.remove();
      saveTasks();
    };
    li.appendChild(removeBtn);
    document.getElementById("task-list").appendChild(li);
  });
}

/* localStorage: sessions */
function saveSessions() {
  const sessions = [];
  document.querySelectorAll("#session-log .session-entry").forEach((el) => {
    const type = el.classList.contains("work") ? "work" : "break";
    const time = el.querySelector(".session-time") ? el.querySelector(".session-time").textContent : "";
    sessions.push({ type, time });
  });
  localStorage.setItem("flowmodoro_sessions", JSON.stringify(sessions));
}

function loadSessions() {
  let arr = JSON.parse(localStorage.getItem("flowmodoro_sessions") || "[]");
  // Reverse to load oldest first for prepending to get newest on top
  arr.reverse().forEach((s) => {
    const entry = document.createElement("li");
    entry.classList.add("session-entry", s.type === "work" ? "work" : "break");
    const label = document.createElement("div");
    label.classList.add("session-label");
    label.classList.add(s.type);
    label.textContent = s.type === "work" ? "Work Session" : "Break Session";
    const time = document.createElement("div");
    time.classList.add("session-time");
    time.classList.add(s.type);
    time.textContent = s.time;
    entry.appendChild(label);
    entry.appendChild(time);
    const log = document.getElementById("session-log");
    if (log.firstChild) log.insertBefore(entry, log.firstChild);
    else log.appendChild(entry);
  });
}

function clearSessionLog() {
  document.getElementById("session-log").innerHTML = '';
  localStorage.removeItem("flowmodoro_sessions");
}

/* header text dynamic based on mode and running state */
function updateHeaderText() {
  const header = document.getElementById("header-text");
  if (!header) return;
  if (isWorkMode) {
    header.textContent = isRunning ? "Work in Progress" : "Flowmodoro";
  } else {
    header.textContent = isRunning ? "Break in Progress" : "On Break";
  }
}

/* Update mode classes and particles */
function updateModeClasses() {
  const timerSection = document.getElementById("timer-section");
  const body = document.body;
  timerSection.classList.remove("standby-mode", "work-mode", "break-mode");
  body.classList.remove("standby-mode", "work-mode", "break-mode");
  const modeElement = document.getElementById("mode");
  if (!isWorkMode) {
    timerSection.classList.add("break-mode");
    body.classList.add("break-mode");
    modeElement.textContent = isRunning ? "Break" : "Standby";
    currentParticleType = "petal";
  } else if (isRunning) {
    timerSection.classList.add("work-mode");
    body.classList.add("work-mode");
    modeElement.textContent = "Work";
    currentParticleType = "snow";
  } else {
    timerSection.classList.add("standby-mode");
    body.classList.add("standby-mode");
    modeElement.textContent = "Standby";
    currentParticleType = "petal";
  }
  // Restart particles on mode change
  clearInterval(particleSpawner);
  const container = document.getElementById("particles-container");
  container.innerHTML = '';
  spawnParticles();
}

/* bell playback helper */
function playBell() {
  if (!bellEl) return;
  try {
    bellEl.currentTime = 0;
    bellEl.volume = 0.2;
    bellEl.play();
  } catch (e) {
    // autoplay restrictions may block; still safe to ignore
    console.warn("Bell play failed:", e);
  }
}

/* Update particle spawn rate */
function updatePetalSpawnRate(newRate) {
  spawnRate = newRate;
  // Restart with new rate
  clearInterval(particleSpawner);
  const container = document.getElementById("particles-container");
  container.innerHTML = '';
  spawnParticles();
}

/* particles spawning */
function spawnParticles() {
  const container = document.getElementById("particles-container");
  if (!container) return;
  particleSpawner = setInterval(() => {
    const particle = document.createElement("div");
    if (currentParticleType === "snow") {
      particle.classList.add("snowflake");
      const driftTypes = ["snow-drift-left", "snow-drift-right"];
      particle.classList.add(driftTypes[Math.floor(Math.random() * driftTypes.length)]);
    } else {
      particle.classList.add("petal");
      const driftTypes = ["petal-drift-left", "petal-drift-right", "petal-spiral"];
      particle.classList.add(driftTypes[Math.floor(Math.random() * driftTypes.length)]);
    }
    // random horizontal start
    particle.style.left = (Math.random() * 100) + "vw";
    // random animation duration a bit
    const dur = 5 + Math.random() * 6; // 5s - 11s
    particle.style.animationDuration = dur + "s";
    container.appendChild(particle);
    // remove after animation finishes
    setTimeout(() => {
      if (particle.parentNode) particle.parentNode.removeChild(particle);
    }, (dur + 0.5) * 1000);
  }, spawnRate);
}

/* bootstrap on DOM ready */
document.addEventListener("DOMContentLoaded", () => {
  initDOM();
  loadTasks();
  loadSessions();
  spawnParticles();
  updateHeaderText();
  updateModeClasses();
});