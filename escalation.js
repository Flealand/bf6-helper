async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

function renderMapTile(map) {
  const tile = document.createElement("a");
  tile.className = "map-tile map-tile--link";
  tile.href = `escalation-map.html?map=${encodeURIComponent(map.id)}`;

  tile.innerHTML = `
    <div class="map-tile__name">${map.name}</div>
    <div class="map-tile__hint">View Timeline &rarr;</div>
  `;

  return tile;
}

async function init() {
  const grid = document.getElementById("map-grid");

  try {
    const maps = await loadJSON("data/maps-escalation.json");
    grid.innerHTML = "";
    maps.forEach((map) => grid.appendChild(renderMapTile(map)));
  } catch (err) {
    grid.innerHTML = `<p class="data-error">Could not load map data. If you opened this file directly, serve it from a local server instead (e.g. VS Code "Live Server"). Details: ${err.message}</p>`;
  }
}

init();
