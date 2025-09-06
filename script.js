/* script.js - Flowmodoro logic (work up, break down), progress ring, petals, localStorage, bell at 1/5 volume */



let timerInterval;

let startTime;

let elapsedTime = 0;

let isRunning = false;

let isWorkMode = true;

let totalWorkTime = 0;

let breakDuration = 0; // ms

let pausedMode = null; // Track whether paused in work or break mode: "work", "break", or null



// DOM handles (initialized on DOMContentLoaded)

let progressCircle, progressCircumference;

let bellEl;

const progressRadius = 90; // Matches SVG circle radius in styles.css



// Particle spawning

let particleSpawner;

let spawnRate = 300; // ms, higher rate (lower number) for more particles

let currentParticleType = "petal"; // "petal", "snow", or "cherry"



// Session log and task list toggle state

let isLogVisible = true;

let isTasksVisible = true;



function initDOM() {

  progressCircle = document.getElementById("progress-circle");

  const radius = progressRadius;

  progressCircumference = 2 * Math.PI * radius;

  if (progressCircle) {

    progressCircle.style.strokeDasharray = `${progressCircumference} ${progressCircumference}`;

    progressCircle.style.strokeDashoffset = progressCircumference; // Full circle (no progress)

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



  // Initialize timer button event listeners

  const startBtn = document.getElementById("start-btn");

  const stopBtn = document.getElementById("stop-btn");

  const resetBtn = document.getElementById("reset-btn");

  const addTaskBtn = document.getElementById("add-task-btn");

  const toggleTasksBtn = document.getElementById("toggle-tasks-btn");

  const toggleLogBtn = document.getElementById("toggle-log-btn");

  const clearLogBtn = document.getElementById("clear-log-btn");



  if (startBtn) {

    startBtn.addEventListener("click", toggleTimer);

  }

  if (stopBtn) {

    stopBtn.addEventListener("click", stopWork);

  }

  if (resetBtn) {

    resetBtn.addEventListener("click", resetTimer);

  }

  if (addTaskBtn) {

    addTaskBtn.addEventListener("click", addTask);

  }

  if (toggleTasksBtn) {

    toggleTasksBtn.addEventListener("click", toggleTaskList);

  }

  if (toggleLogBtn) {

    toggleLogBtn.addEventListener("click", toggleSessionLog);

  }

  if (clearLogBtn) {

    clearLogBtn.addEventListener("click", clearSessionLog);

  }



  // Load and apply saved visibility states

  const savedTaskState = localStorage.getItem("flowmodoro_tasks_visible");

  const savedLogState = localStorage.getItem("flowmodoro_log_visible");

  if (savedTaskState !== null) {

    isTasksVisible = JSON.parse(savedTaskState);

    const taskList = document.getElementById("task-list");

    const toggleTasksBtn = document.getElementById("toggle-tasks-btn");

    taskList.style.display = isTasksVisible ? "block" : "none";

    toggleTasksBtn.textContent = isTasksVisible ? "Hide Tasks" : "Show Tasks";

  }

  if (savedLogState !== null) {

    isLogVisible = JSON.parse(savedLogState);

    const log = document.getElementById("session-log");

    const toggleLogBtn = document.getElementById("toggle-log-btn");

    log.style.display = isLogVisible ? "flex" : "none";

    toggleLogBtn.textContent = isLogVisible ? "Hide Log" : "Show Log";

  }



  // Initialize button states

  updateButtonStates();



  // Initialize counts

  updateTaskCount();

  updateSessionCount();



  // Drag-and-drop for task list

  const taskList = document.getElementById("task-list");

  let draggedItem = null;



  taskList.addEventListener("dragstart", (e) => {

    draggedItem = e.target.closest("li");

    e.dataTransfer.effectAllowed = "move";

    setTimeout(() => draggedItem.classList.add("dragging"), 0);

  });



  taskList.addEventListener("dragend", (e) => {

    draggedItem.classList.remove("dragging");

    draggedItem = null;

    saveTasks();

    updateTaskCount(); // Update count after reordering

  });



  taskList.addEventListener("dragover", (e) => {

    e.preventDefault();

    const afterElement = getDragAfterElement(taskList, e.clientY);

    if (afterElement == null) {

      taskList.appendChild(draggedItem);

    } else {

      taskList.insertBefore(draggedItem, afterElement);

    }

  });



  function getDragAfterElement(container, y) {

    const draggableElements = [...container.querySelectorAll("li:not(.dragging)")];

    return draggableElements.reduce((closest, child) => {

      const box = child.getBoundingClientRect();

      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {

        return { offset: offset, element: child };

      } else {

        return closest;

      }

    }, { offset: Number.NEGATIVE_INFINITY }).element;

  }

}



function toggleTimer() {

  if (isRunning) pauseTimer();

  else startTimer();

}



function startTimer() {

  // Start or resume timer

  startTime = Date.now() - elapsedTime;

  timerInterval = setInterval(updateTime, 250);

  isRunning = true;

  document.getElementById("start-btn").textContent = "Pause";

  if (pausedMode) {

    // Resuming from pause

    isWorkMode = pausedMode === "work";

  }

  updateHeaderText();

  updateModeClasses();

  updateButtonStates();

}



function pauseTimer() {

  clearInterval(timerInterval);

  isRunning = false;

  document.getElementById("start-btn").textContent = "Resume";

  pausedMode = isWorkMode ? "work" : "break"; // Track paused mode

  updateHeaderText();

  updateModeClasses();

  updateButtonStates();

}



function resetTimer() {

  clearInterval(timerInterval);

  elapsedTime = 0;

  breakDuration = 0; // Reset break duration

  document.getElementById("time").textContent = "00:00";

  isRunning = false;

  isWorkMode = true; // Reset to work mode for next start

  pausedMode = null; // Clear paused mode

  document.getElementById("start-btn").textContent = "Start";

  updateProgress(0);

  updateHeaderText();

  updateModeClasses();

  updateButtonStates();

}



function updateButtonStates() {

  const stopBtn = document.getElementById("stop-btn");

  const resetBtn = document.getElementById("reset-btn");

  const startBtn = document.getElementById("start-btn");



  if (isRunning) {

    startBtn.textContent = "Pause";

    if (isWorkMode) {

      stopBtn.disabled = false;

      resetBtn.disabled = false;

      resetBtn.textContent = "Reset";

    } else {

      stopBtn.disabled = true;

      resetBtn.disabled = false;

      resetBtn.textContent = "Skip Break";

    }

  } else {

    startBtn.textContent = pausedMode ? "Resume" : "Start";

    startBtn.disabled = false; // Ensure Start button is always enabled when not running

    stopBtn.disabled = true;

    resetBtn.disabled = pausedMode === null; // Disable reset in standby mode unless paused

    resetBtn.textContent = !isWorkMode || pausedMode === "break" ? "Skip Break" : "Reset";

  }

}



function stopWork() {

  if (!isWorkMode || !isRunning) return; // Ignore if not in active work mode



  // Stop counting up and log work session

  clearInterval(timerInterval);

  isRunning = false;



  let workDuration = elapsedTime; // ms

  totalWorkTime += workDuration;

  document.getElementById("total-time").textContent = "Total Work Time: " + formatTime(totalWorkTime);



  logSession("work", workDuration);



  // Compute break duration (work / 5)

  breakDuration = Math.floor(workDuration / 5); // ms

  if (breakDuration < 1000) breakDuration = 1000;



  // Reset work elapsed

  elapsedTime = 0;

  document.getElementById("time").textContent = formatTime(breakDuration);



  // Explicitly set break mode

  isWorkMode = false;

  isRunning = true; // Keep running for break

  startBreak(breakDuration);

}



function startBreak(durationMs) {

  isWorkMode = false;

  pausedMode = null; // Clear paused mode

  document.getElementById("mode").textContent = "Break";

  updatePetalSpawnRate(400); // Higher rate for fewer cherries

  updateHeaderText();

  updateModeClasses();

  startTime = Date.now();

  elapsedTime = 0;

  // Initialize progress to full (ratio = 1)

  updateProgress(1);

  timerInterval = setInterval(updateTime, 250);

  isRunning = true;

  document.getElementById("start-btn").textContent = "Pause";

  updateButtonStates();

}



function updateTime() {

  elapsedTime = Date.now() - startTime;

  if (isWorkMode) {

    // Work: count up

    document.getElementById("time").textContent = formatTime(elapsedTime);

  } else {

    // Break: show remaining time and countdown

    let remaining = breakDuration - elapsedTime;

    if (remaining <= 0) {

      // Break finished

      clearInterval(timerInterval);

      logSession("break", breakDuration);

      playBell(); // Only play at end of break

      isWorkMode = true;

      pausedMode = null; // Clear paused mode

      document.getElementById("mode").textContent = "Standby";

      isRunning = false;

      document.getElementById("start-btn").textContent = "Start";

      updatePetalSpawnRate(300); // Back to normal rate

      elapsedTime = 0;

      breakDuration = 0;

      document.getElementById("time").textContent = "00:00";

      updateProgress(0); // Ensure ring is fully depleted

      updateHeaderText();

      updateModeClasses();

      updateButtonStates();

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

  // Clamp ratio to [0, 1] to prevent overshooting

  ratio = Math.max(0, Math.min(1, ratio));

  const offset = progressCircumference * (1 - ratio);

  progressCircle.style.strokeDashoffset = offset;

}



function formatTime(ms) {

  const totalSeconds = Math.max(0, Math.floor(ms / 1000));

  const hours = Math.floor(totalSeconds / 3600);

  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const seconds = totalSeconds % 60;

  if (hours > 0) {

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  } else {

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  }

}



function updateTaskCount() {

  const taskCount = document.querySelectorAll("#task-list li").length;

  const tasksLabel = document.getElementById("tasks-label");

  if (tasksLabel) {

    tasksLabel.textContent = `Tasks (${taskCount})`;

  }

}



function updateSessionCount() {

  const sessions = document.querySelectorAll("#session-log .session-entry");

  let workCount = 0;

  let breakCount = 0;

  sessions.forEach((el) => {

    if (el.classList.contains("work")) workCount++;

    else if (el.classList.contains("break")) breakCount++;

  });

  const sessionLogLabel = document.getElementById("session-log-label");

  if (sessionLogLabel) {

    sessionLogLabel.textContent = `Session Log (${workCount} Work, ${breakCount} Break)`;

  }

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

  updateSessionCount(); // Update session count after adding

}



function addTask() {

  const taskInput = document.getElementById("new-task");

  const taskText = taskInput.value.trim();

  if (!taskText) return;



  const addButton = document.getElementById("add-task-btn");

  if (addButton) {

    addButton.classList.add("flash");

    setTimeout(() => {

      addButton.classList.remove("flash");

    }, 300); // Flash for 300ms

  }



  const li = document.createElement("li");

  li.textContent = taskText;

  li.draggable = true; // Enable drag

  const removeBtn = document.createElement("button");

  removeBtn.textContent = "✖";

  removeBtn.onclick = function () {

    li.remove();

    saveTasks();

    updateTaskCount(); // Update task count after removal

  };



  li.appendChild(removeBtn);

  document.getElementById("task-list").appendChild(li);

  taskInput.value = "";

  saveTasks();

  updateTaskCount(); // Update task count after adding

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

    li.draggable = true; // Enable drag

    const removeBtn = document.createElement("button");

    removeBtn.textContent = "✖";

    removeBtn.onclick = function () {

      li.remove();

      saveTasks();

      updateTaskCount(); // Update task count after removal

    };

    li.appendChild(removeBtn);

    document.getElementById("task-list").appendChild(li);

  });

  updateTaskCount(); // Update task count after loading

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

  updateSessionCount(); // Update session count after loading

}



function clearSessionLog() {

  document.getElementById("session-log").innerHTML = '';

  localStorage.removeItem("flowmodoro_sessions");

  updateSessionCount(); // Update session count after clearing

}



function toggleSessionLog() {

  const log = document.getElementById("session-log");

  const toggleBtn = document.getElementById("toggle-log-btn");

  isLogVisible = !isLogVisible;

  log.style.display = isLogVisible ? "flex" : "none";

  toggleBtn.textContent = isLogVisible ? "Hide Log" : "Show Log";

  localStorage.setItem("flowmodoro_log_visible", JSON.stringify(isLogVisible));

}



function toggleTaskList() {

  const taskList = document.getElementById("task-list");

  const toggleBtn = document.getElementById("toggle-tasks-btn");

  isTasksVisible = !isTasksVisible;

  taskList.style.display = isTasksVisible ? "block" : "none";

  toggleBtn.textContent = isTasksVisible ? "Hide Tasks" : "Show Tasks";

  localStorage.setItem("flowmodoro_tasks_visible", JSON.stringify(isTasksVisible));

}



/* header text dynamic based on mode and running state */

function updateHeaderText() {

  const header = document.getElementById("header-text");

  if (!header) return;

  if (isRunning) {

    header.textContent = isWorkMode ? "Work in Progress" : "Break in Progress";

  } else {

    if (pausedMode === "work") {

      header.textContent = "Work Paused";

    } else if (pausedMode === "break") {

      header.textContent = "Break Paused";

    } else {

      header.textContent = "Flowmodoro";

    }

  }

}



/* Update mode classes and particles */

function updateModeClasses() {

  const timerSection = document.getElementById("timer-section");

  const body = document.body;

  const taskSection = document.getElementById("task-section");

  const sessionLogSection = document.getElementById("session-log-section");

  const modeElement = document.getElementById("mode");



  // Remove all mode classes

  timerSection.classList.remove("standby-mode", "work-mode", "break-mode", "paused-work", "paused-break");

  body.classList.remove("standby-mode", "work-mode", "break-mode", "paused-work", "paused-break");

  taskSection.classList.remove("standby-mode", "work-mode", "break-mode", "paused-work", "paused-break");

  sessionLogSection.classList.remove("standby-mode", "work-mode", "break-mode", "paused-work", "paused-break");



  if (!isWorkMode && isRunning) {

    // Break mode

    timerSection.classList.add("break-mode");

    body.classList.add("break-mode");

    taskSection.classList.add("break-mode");

    sessionLogSection.classList.add("break-mode");

    modeElement.textContent = "Break";

    currentParticleType = "cherry";

  } else if (isWorkMode && isRunning) {

    // Work mode

    timerSection.classList.add("work-mode");

    body.classList.add("work-mode");

    taskSection.classList.add("work-mode");

    sessionLogSection.classList.add("work-mode");

    modeElement.textContent = "Work";

    currentParticleType = "snow";

  } else {

    // Standby or paused

    timerSection.classList.add("standby-mode");

    body.classList.add("standby-mode");

    taskSection.classList.add("standby-mode");

    sessionLogSection.classList.add("standby-mode");

    if (pausedMode === "work") {

      timerSection.classList.add("paused-work");

      body.classList.add("paused-work");

      taskSection.classList.add("paused-work");

      sessionLogSection.classList.add("paused-work");

      modeElement.textContent = "Paused (Work)";

    } else if (pausedMode === "break") {

      timerSection.classList.add("paused-break");

      body.classList.add("paused-break");

      taskSection.classList.add("paused-break");

      sessionLogSection.classList.add("paused-break");

      modeElement.textContent = "Paused (Break)";

    } else {

      modeElement.textContent = "Standby";

    }

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

    } else if (currentParticleType === "cherry") {

      particle.classList.add("cherry");

      const driftTypes = ["cherry-drift-left", "cherry-drift-right", "cherry-tumble"];

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

    // remove after animation finishes, increased buffer

    setTimeout(() => {

      if (particle.parentNode) particle.parentNode.removeChild(particle);

    }, (dur + 2) * 1000); // Increased buffer to 2s

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