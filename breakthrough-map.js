async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

function factionMarkup(faction) {
  if (!faction) return `<span class="bt-factions__flag bt-factions__flag--tbd">TBD</span>`;
  return `<img class="bt-factions__flag" src="${faction.flag}" alt="${faction.name}" />`;
}

function renderSections(data, map, factions) {
  const wrap = document.getElementById("bt-sections");
  wrap.innerHTML = "";

  const startSection = document.createElement("div");
  startSection.className = "bt-section bt-section--start";
  startSection.innerHTML = `
    <div class="bt-section__label">Starting Tickets</div>
    <div class="bt-section__value">${data.startingTickets}</div>
    <div class="bt-factions">
      <div class="bt-factions__side">
        <span class="bt-factions__label">Attacker</span>
        ${factionMarkup(factions[map && map.attacker])}
      </div>
      <div class="bt-factions__side">
        <span class="bt-factions__label">Defender</span>
        ${factionMarkup(factions[map && map.defender])}
      </div>
    </div>
  `;
  wrap.appendChild(startSection);

  data.stages.forEach((s) => {
    const section = document.createElement("div");
    section.className = "bt-section";
    section.innerHTML = `
      <div class="bt-section__label">Stage ${s.stage}</div>
      <div class="bt-section__value bt-section__value--bonus">+${s.tickets} Tickets</div>
    `;
    wrap.appendChild(section);
  });

  const sectionCount = 1 + data.stages.length;
  const perSectionHeight = wrap.clientHeight / sectionCount;
  const valueSize = Math.max(28, Math.min(perSectionHeight * 0.4, 150));
  const labelSize = Math.max(12, Math.min(perSectionHeight * 0.11, 26));
  const flagSize = Math.max(20, Math.min(perSectionHeight * 0.16, 56));

  wrap.querySelectorAll(".bt-section__value").forEach((el) => {
    el.style.fontSize = `${valueSize}px`;
  });
  wrap.querySelectorAll(".bt-section__label").forEach((el) => {
    el.style.fontSize = `${labelSize}px`;
    el.style.marginBottom = `${labelSize * 0.4}px`;
  });
  wrap.querySelectorAll(".bt-factions__flag").forEach((el) => {
    el.style.height = `${flagSize}px`;
  });
  wrap.querySelectorAll(".bt-factions__label").forEach((el) => {
    el.style.fontSize = `${Math.max(11, labelSize * 0.85)}px`;
  });

  const maxWidth = wrap.clientWidth - 32;
  wrap.querySelectorAll(".bt-section__value").forEach((el) => {
    let size = parseFloat(el.style.fontSize);
    while (el.scrollWidth > maxWidth && size > 14) {
      size -= 1;
      el.style.fontSize = `${size}px`;
    }
  });
}

async function init() {
  const title = document.getElementById("mp-title");
  const wrap = document.getElementById("bt-sections");

  const params = new URLSearchParams(window.location.search);
  const mapId = params.get("map");

  try {
    const [maps, stageData, factions] = await Promise.all([
      loadJSON("data/maps-breakthrough.json"),
      loadJSON("data/breakthrough-stages.json"),
      loadJSON("data/factions.json"),
    ]);

    const map = maps.find((m) => m.id === mapId);
    title.textContent = map ? map.name : "Unknown Map";

    const data = stageData[mapId];
    if (data) {
      renderSections(data, map, factions);
    } else {
      wrap.innerHTML = `<p class="data-error" style="padding:24px;">No ticket data yet for this map.</p>`;
    }
  } catch (err) {
    title.textContent = "Error";
    wrap.innerHTML = `<p class="data-error" style="padding:24px;">Could not load ticket data. If you opened this file directly, serve it from a local server instead. Details: ${err.message}</p>`;
  }
}

init();
