async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

function renderMapTile(map, factions) {
  const attacker = factions[map.attacker];

  const attackerMarkup = attacker
    ? `<img class="map-tile__flag" src="${attacker.flag}" alt="${attacker.name}" />`
    : `<span class="map-tile__flag map-tile__flag--tbd">TBD</span>`;

  const tile = document.createElement("a");
  tile.className = "map-tile map-tile--link";
  tile.href = `breakthrough-map.html?map=${encodeURIComponent(map.id)}`;

  tile.innerHTML = `
    <div class="map-tile__name">${map.name}</div>
    <div class="map-tile__attacker">
      <span class="map-tile__attacker-label">Attacker:</span>
      ${attackerMarkup}
    </div>
  `;

  return tile;
}

async function init() {
  const grid = document.getElementById("map-grid");

  try {
    const [maps, factions] = await Promise.all([
      loadJSON("data/maps-breakthrough.json"),
      loadJSON("data/factions.json"),
    ]);

    grid.innerHTML = "";
    maps.forEach((map) => grid.appendChild(renderMapTile(map, factions)));
  } catch (err) {
    grid.innerHTML = `<p class="data-error">Could not load map data. If you opened this file directly, serve it from a local server instead (e.g. VS Code "Live Server"). Details: ${err.message}</p>`;
  }
}

init();
