async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function renderUpdate(update) {
  const entry = document.createElement("article");
  entry.className = "update-entry";

  const highlightsHtml = update.highlights.map((h) => `<li>${h}</li>`).join("");

  entry.innerHTML = `
    <div class="update-entry__header">
      <span class="update-entry__version">v${update.version}</span>
      <span class="update-entry__date">${formatDate(update.date)}</span>
    </div>
    <h3 class="update-entry__title">${update.title}</h3>
    <p class="update-entry__summary">${update.summary}</p>
    <ul class="update-entry__highlights">${highlightsHtml}</ul>
  `;

  return entry;
}

async function init() {
  const log = document.getElementById("update-log");

  try {
    const updates = await loadJSON("data/updates.json");
    const sorted = [...updates].sort((a, b) => (a.date < b.date ? 1 : -1));

    log.innerHTML = "";
    sorted.forEach((update) => log.appendChild(renderUpdate(update)));
  } catch (err) {
    log.innerHTML = `<p class="data-error">Could not load update data. If you opened this file directly, serve it from a local server instead. Details: ${err.message}</p>`;
  }
}

init();
