async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

function parseTime(str) {
  const [m, s] = str.split(":").map(Number);
  return m * 60 + s;
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

let duration = 1800;
let events = [];
let elapsed = 0;
let running = false;
let startTs = null;
let intervalId = null;
let overlayQueue = [];
let overlayShowing = false;

const el = {};
const svgCache = {};

async function preloadIcon(path) {
  if (svgCache[path]) return svgCache[path];
  const res = await fetch(path);
  const text = await res.text();
  svgCache[path] = text;
  return text;
}

function computeElapsed() {
  if (!running) return elapsed;
  return Math.min(duration, Math.floor((Date.now() - startTs) / 1000));
}

function updateClockDisplay() {
  el.elapsedLabel.textContent = formatTime(elapsed);
  const pct = Math.min(100, (elapsed / duration) * 100);
  if (el.nowIndicator) el.nowIndicator.style.top = `${pct}%`;
}

function markRowDone(ev) {
  if (ev.rowEl) ev.rowEl.classList.add("is-done");
}

function showOverlay(type, ev) {
  el.overlay.classList.toggle("spawn-overlay--spawned", type === "spawn");
  el.overlayIcon.innerHTML = svgCache[ev.vehicle.icon] || "";
  el.overlayVehicle.textContent = ev.vehicle.name;
  el.overlayStatus.textContent = type === "warn" ? "Spawning in 30" : "Has Spawned";
  el.overlay.classList.add("is-visible");
}

function hideOverlay() {
  el.overlay.classList.remove("is-visible");
}

function processQueue() {
  if (overlayQueue.length === 0) {
    overlayShowing = false;
    return;
  }
  overlayShowing = true;
  const item = overlayQueue.shift();
  showOverlay(item.type, item.ev);
  setTimeout(() => {
    hideOverlay();
    setTimeout(processQueue, 300);
  }, 5000);
}

function queueOverlay(type, ev) {
  overlayQueue.push({ type, ev });
  if (!overlayShowing) processQueue();
}

function checkEvents(prevElapsed, newElapsed) {
  events.forEach((ev) => {
    const warnAt = Math.max(0, ev.time - 30);
    const crossedSpawn = !ev.spawned && ev.time > prevElapsed && ev.time <= newElapsed;
    const crossedWarn = !ev.warned && warnAt > prevElapsed && warnAt <= newElapsed;

    if (crossedSpawn) {
      ev.warned = true;
      ev.spawned = true;
      queueOverlay("spawn", ev);
      markRowDone(ev);
    } else if (crossedWarn) {
      ev.warned = true;
      queueOverlay("warn", ev);
    }
  });
}

function tick() {
  const prevElapsed = elapsed;
  const newElapsed = computeElapsed();
  if (newElapsed > prevElapsed) {
    checkEvents(prevElapsed, newElapsed);
    elapsed = newElapsed;
  }
  updateClockDisplay();
  if (elapsed >= duration && running) {
    pause();
  }
}

function play() {
  if (elapsed >= duration) {
    resetState();
  }
  running = true;
  startTs = Date.now() - elapsed * 1000;
  intervalId = setInterval(tick, 250);
  el.toggleBtn.textContent = "Pause";
}

function pause() {
  elapsed = computeElapsed();
  running = false;
  clearInterval(intervalId);
  el.toggleBtn.textContent = "Play";
}

function resetState() {
  clearInterval(intervalId);
  running = false;
  elapsed = 0;
  overlayQueue = [];
  overlayShowing = false;
  hideOverlay();
  events.forEach((ev) => {
    ev.warned = false;
    ev.spawned = false;
    if (ev.rowEl) ev.rowEl.classList.remove("is-done");
  });
}

function renderTimeline() {
  el.timeline.innerHTML = "";

  const track = document.createElement("div");
  track.className = "timeline__track";
  el.timeline.appendChild(track);

  for (let t = 0; t <= duration; t += 300) {
    const pct = (t / duration) * 100;
    const line = document.createElement("div");
    line.className = "timeline__grid-line";
    line.style.top = `${pct}%`;
    el.timeline.appendChild(line);
  }

  const now = document.createElement("div");
  now.className = "timeline__now";
  el.timeline.appendChild(now);
  el.nowIndicator = now;

  const pointsByTime = new Map();
  events.forEach((ev) => {
    if (!pointsByTime.has(ev.time)) pointsByTime.set(ev.time, []);
    pointsByTime.get(ev.time).push(ev);
  });

  [...pointsByTime.entries()]
    .sort((a, b) => a[0] - b[0])
    .forEach(([time, evs]) => {
      const pct = (time / duration) * 100;
      const point = document.createElement("div");
      point.className = "timeline__point";
      point.style.top = `${pct}%`;

      const iconsHtml = evs
        .map(
          (ev, i) => `
        <span class="timeline__point-icon-wrap" data-ev-index="${i}">
          <span class="timeline__point-icon">${svgCache[ev.vehicle.icon] || ""}</span>
          <span class="timeline__point-icon-label">${ev.vehicle.name}</span>
        </span>
      `
        )
        .join("");

      point.innerHTML = `
        <span class="timeline__point-time">${formatTime(time)}</span>
        <span class="timeline__point-dot"></span>
        <span class="timeline__point-branch"></span>
        <span class="timeline__point-icons">${iconsHtml}</span>
      `;

      el.timeline.appendChild(point);

      const wraps = point.querySelectorAll(".timeline__point-icon-wrap");
      evs.forEach((ev, i) => {
        ev.rowEl = wraps[i];
      });
    });

  if (events.length === 0) {
    const note = document.createElement("p");
    note.className = "timeline__empty-note";
    note.textContent = "No timeline data yet for this map.";
    el.timeline.appendChild(note);
  }
}

async function init() {
  el.title = document.getElementById("mp-title");
  el.timeline = document.getElementById("timeline");
  el.elapsedLabel = document.getElementById("timer-elapsed");
  el.durationLabel = document.getElementById("timer-duration");
  el.toggleBtn = document.getElementById("timer-toggle");
  el.resetBtn = document.getElementById("timer-reset");
  el.overlay = document.getElementById("spawn-overlay");
  el.overlayIcon = document.getElementById("spawn-overlay-icon");
  el.overlayVehicle = document.getElementById("spawn-overlay-vehicle");
  el.overlayStatus = document.getElementById("spawn-overlay-status");

  const params = new URLSearchParams(window.location.search);
  const mapId = params.get("map");

  try {
    const [maps, vehicles, timelines] = await Promise.all([
      loadJSON("data/maps-escalation.json"),
      loadJSON("data/vehicles.json"),
      loadJSON("data/escalation-timelines.json"),
    ]);

    const map = maps.find((m) => m.id === mapId);
    el.title.textContent = map ? map.name : "Unknown Map";

    await Promise.all(Object.values(vehicles).map((v) => preloadIcon(v.icon)));

    const timeline = timelines[mapId];
    if (timeline) {
      duration = parseTime(timeline.duration);
      events = timeline.events
        .map((e) => ({
          time: parseTime(e.time),
          vehicle: vehicles[e.vehicle],
          warned: false,
          spawned: false,
        }))
        .filter((e) => e.vehicle)
        .sort((a, b) => a.time - b.time);
    } else {
      duration = 1800;
      events = [];
    }
  } catch (err) {
    el.title.textContent = "Error";
    el.timeline.innerHTML = `<p class="data-error">Could not load timeline data. If you opened this file directly, serve it from a local server instead. Details: ${err.message}</p>`;
    return;
  }

  el.durationLabel.textContent = formatTime(duration);
  renderTimeline();
  updateClockDisplay();

  el.toggleBtn.addEventListener("click", () => {
    if (running) pause();
    else play();
  });

  el.resetBtn.addEventListener("click", () => {
    resetState();
    updateClockDisplay();
  });
}

init();
