const DEFAULT_CITY = "mumbai";
const DEFAULT_LANG = "en";
const FALLBACK_PARTY_KEY = "No result";

const CITY_CONFIG = {
  mumbai: {
    key: "mumbai",
    label: { en: "Mumbai", mr: "मुंबई" },
    title: {
      en: "Brihanmumbai Municipal Corporation Election Results",
      mr: "बृहन्मुंबई महानगरपालिका निवडणूक निकाल",
    },
    mapFile: "mumbai.js.txt",
    csvFile: "mumbai.csv",
    hasSubWards: false,
  },
  pune: {
    key: "pune",
    label: { en: "Pune", mr: "पुणे" },
    title: {
      en: "Pune Municipal Corporation Election Results",
      mr: "पुणे महानगरपालिका निवडणूक निकाल",
    },
    mapFile: "pune.js.txt",
    csvFile: "pune.csv",
    hasSubWards: true,
  },
  pcmc: {
    key: "pcmc",
    label: { en: "PCMC", mr: "पिंपरी-चिंचवड" },
    title: {
      en: "Pimpri Chinchwad Muncipal Corporation Election Results",
      mr: "पिंपरी चिंचवड महानगरपालिका निवडणूक निकाल",
    },
    mapFile: "pcmc.js.txt",
    csvFile: "pcmc.csv",
    hasSubWards: true,
  },
  thane: {
    key: "thane",
    label: { en: "Thane", mr: "ठाणे" },
    title: {
      en: "Thane Municipal Corporation Election Results",
      mr: "ठाणे महानगरपालिका निवडणूक निकाल",
    },
    mapFile: "thane.js.txt",
    csvFile: "thane.csv",
    hasSubWards: true,
  },
  nagpur: {
    key: "nagpur",
    label: { en: "Nagpur", mr: "नागपूर" },
    title: {
      en: "Nagpur Municipal Corporation Election Results",
      mr: "नागपूर महानगरपालिका निवडणूक निकाल",
    },
    mapFile: "nagpur.js.txt",
    csvFile: "nagpur.csv",
    hasSubWards: true,
  },
};

const LANGUAGE_LABELS = {
  en: { en: "English", mr: "इंग्रजी" },
  mr: { en: "Marathi", mr: "मराठी" },
};

const elements = {
  pageTitle: document.getElementById("page-title"),
  pageSubtitle: document.getElementById("page-subtitle"),
  eyebrow: document.getElementById("eyebrow"),
  citySelect: document.getElementById("city-select"),
  languageSelect: document.getElementById("language-select"),
  cityLabel: document.getElementById("city-label"),
  languageLabel: document.getElementById("language-label"),
  wardsLabel: document.getElementById("wards-label"),
  partiesLabel: document.getElementById("parties-label"),
  totalWards: document.getElementById("total-wards"),
  partyCount: document.getElementById("party-count"),
  legend: document.getElementById("legend"),
  legendTitle: document.getElementById("legend-title"),
  detailsTitle: document.getElementById("details-title"),
  wardDetails: document.getElementById("ward-details"),
  dataSources: document.getElementById("data-sources"),
  pieToggle: document.getElementById("pie-toggle"),
  pieToggleLabel: document.getElementById("pie-toggle-label"),
  mapLabelsToggle: document.getElementById("map-labels-toggle"),
  mapLabelsToggleLabel: document.getElementById("map-labels-toggle-label"),
  mapTitle: document.getElementById("map-title"),
  mapLegend: document.getElementById("map-legend"),
};

let map;
let wardLayer;
let pieLayer;
let currentCity = DEFAULT_CITY;
let currentLang = DEFAULT_LANG;
let i18n = {};
let partyColors = {};
let partyColorMap = new Map();
let fallbackPartyColor = "#c7c7c7";
let wardDataByNo = new Map();
let legendCounts = new Map();
let partyDisplayMap = new Map();
let selectedWardNo = null;
let showPieCharts = true;
let showMapLabels = false;
let currentGeoJson = null;
let pieToggleLastChecked = true;

function normalize(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function t(keyPath) {
  const keys = keyPath.split(".");
  let cursor = i18n[currentLang] || {};
  for (const key of keys) {
    cursor = cursor?.[key];
  }
  return cursor ?? keyPath;
}

function formatTemplate(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.json();
}

function applyTheme(theme) {
  const root = document.documentElement;
  const colors = theme?.colors || {};
  const fonts = theme?.fonts || {};

  Object.entries(colors).forEach(([key, value]) => {
    const cssName = key === "shadow" ? "--shadow" : `--color-${key}`;
    root.style.setProperty(cssName, value);
  });

  if (fonts.sans) {
    root.style.setProperty("--font-sans", fonts.sans);
  }
  if (fonts.mono) {
    root.style.setProperty("--font-mono", fonts.mono);
  }
}

function buildPartyColorMap(config) {
  const map = new Map();
  fallbackPartyColor = config?.fallback?.color || fallbackPartyColor;
  (config?.parties || []).forEach((party) => {
    if (!party?.key) {
      return;
    }
    map.set(party.key, party.color);
    (party.aliases || []).forEach((alias) => {
      map.set(alias, party.color);
    });
  });
  return map;
}

function colorForParty(partyKey) {
  return partyColorMap.get(partyKey) || fallbackPartyColor;
}

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === "\"" && next === "\"") {
        current += "\"";
        i += 1;
      } else if (char === "\"") {
        inQuotes = false;
      } else {
        current += char;
      }
      continue;
    }

    if (char === "\"") {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(current);
      current = "";
      continue;
    }

    if (char === "\n") {
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    current += char;
  }

  if (current.length || row.length) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

function rowsToObjects(rows) {
  const header = rows[0]?.map((value) => normalize(value)) || [];
  const indexFor = (name) => header.indexOf(name);

  return rows.slice(1).map((row) => {
    const value = (name) => {
      const idx = indexFor(name);
      return idx >= 0 ? normalize(row[idx]) : "";
    };

    return {
      area: value("Area"),
      areaMr: value("Area_mr"),
      wardNo: value("Ward No"),
      wardNoMr: value("Ward No_mr"),
      subWard: value("Sub Ward"),
      subWardMr: value("Sub Ward_mr"),
      wardName: value("Ward Name"),
      wardNameMr: value("Ward Name_mr"),
      winner: value("Winner"),
      winnerMr: value("Winner_mr"),
      party: value("Party"),
      partyMr: value("Party_mr"),
    };
  });
}

function computeMajority(entry) {
  let maxCount = -1;
  let winners = [];
  entry.seatCounts.forEach((count, party) => {
    if (count > maxCount) {
      maxCount = count;
      winners = [party];
    } else if (count === maxCount) {
      winners.push(party);
    }
  });

  if (winners.length <= 1) {
    return winners[0] || FALLBACK_PARTY_KEY;
  }

  const wardA = entry.subWards.find(
    (row) => normalize(row.subWard).toUpperCase() === "A",
  );
  return wardA?.party || winners[0] || FALLBACK_PARTY_KEY;
}

function buildWardData(rows, config) {
  const byWard = new Map();
  const partyNames = new Map();
  const seatTally = new Map();

  rows.forEach((row) => {
    const wardNo = normalize(row.wardNo);
    if (!wardNo) {
      return;
    }

    const entry = byWard.get(wardNo) || {
      wardNo,
      wardNoMr: row.wardNoMr,
      wardName: row.wardName,
      wardNameMr: row.wardNameMr,
      area: row.area,
      areaMr: row.areaMr,
      subWards: [],
      seatCounts: new Map(),
      majorityParty: FALLBACK_PARTY_KEY,
    };

    if (!entry.wardName && row.wardName) {
      entry.wardName = row.wardName;
    }
    if (!entry.wardNameMr && row.wardNameMr) {
      entry.wardNameMr = row.wardNameMr;
    }
    if (!entry.area && row.area) {
      entry.area = row.area;
    }
    if (!entry.areaMr && row.areaMr) {
      entry.areaMr = row.areaMr;
    }
    if (!entry.wardNoMr && row.wardNoMr) {
      entry.wardNoMr = row.wardNoMr;
    }

    entry.subWards.push(row);

    const partyKey = row.party || FALLBACK_PARTY_KEY;
    entry.seatCounts.set(partyKey, (entry.seatCounts.get(partyKey) || 0) + 1);
    seatTally.set(partyKey, (seatTally.get(partyKey) || 0) + 1);

    if (row.partyMr && !partyNames.has(partyKey)) {
      partyNames.set(partyKey, row.partyMr);
    }

    byWard.set(wardNo, entry);
  });

  const wardTally = new Map();
  byWard.forEach((entry) => {
    if (config.hasSubWards) {
      entry.majorityParty = computeMajority(entry);
    } else {
      const row = entry.subWards[0] || {};
      entry.majorityParty = row.party || FALLBACK_PARTY_KEY;
      entry.winner = row.winner || "";
      entry.winnerMr = row.winnerMr || "";
      entry.party = row.party || FALLBACK_PARTY_KEY;
      entry.partyMr = row.partyMr || "";
    }

    wardTally.set(
      entry.majorityParty,
      (wardTally.get(entry.majorityParty) || 0) + 1,
    );
  });

  const counts = config.hasSubWards ? seatTally : wardTally;
  return { byWard, counts, partyNames };
}

async function loadGeoJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  const text = await response.text();
  const cleaned = text
    .replace(/^\s*var\s+statesData\s*=\s*/i, "")
    .replace(/;\s*$/, "")
    .trim();
  return JSON.parse(cleaned);
}

function displayValue(row, key, keyMr) {
  if (currentLang === "mr") {
    return row[keyMr] || row[key] || "";
  }
  return row[key] || row[keyMr] || "";
}

function getPartyLabel(partyKey) {
  if (partyKey === FALLBACK_PARTY_KEY) {
    return t("noResult");
  }
  if (currentLang === "mr") {
    return partyDisplayMap.get(partyKey) || partyKey;
  }
  return partyKey;
}

function getWardNoLabel(entry, wardNo) {
  if (currentLang === "mr" && entry?.wardNoMr) {
    return entry.wardNoMr;
  }
  return wardNo;
}

function getHoverText(entry, wardNo) {
  if (!wardNo) {
    return "";
  }
  const displayWard = getWardNoLabel(entry, wardNo);
  const wardName =
    (currentLang === "mr" ? entry?.wardNameMr : entry?.wardName) ||
    entry?.wardName ||
    entry?.wardNameMr ||
    "";
  return wardName ? `${t("wardLabel")} ${displayWard} - ${wardName}` : `${t("wardLabel")} ${displayWard}`;
}

function updateUiStrings() {
  elements.eyebrow.textContent = t("eyebrow");
  elements.pageSubtitle.textContent = t("subtitle");
  elements.cityLabel.textContent = t("controls.city");
  elements.languageLabel.textContent = t("controls.language");
  elements.pieToggleLabel.textContent = t("controls.pieCharts");
  elements.mapLabelsToggleLabel.textContent = t("controls.mapLabels");
  elements.wardsLabel.textContent = t("stats.wards");
  elements.partiesLabel.textContent = t("stats.parties");
  elements.legendTitle.textContent = t("legendTitle");
  elements.detailsTitle.textContent = t("detailsTitle");
  document.documentElement.lang = currentLang;

  const config = CITY_CONFIG[currentCity];
  const title = config.title[currentLang] || config.title.en;
  elements.pageTitle.textContent = title;
  if (elements.mapTitle) {
    elements.mapTitle.textContent = title;
  }
  elements.dataSources.textContent = formatTemplate(t("dataSources"), {
    map: config.mapFile,
    csv: config.csvFile,
  });
}

function updatePieToggleVisibility() {
  const config = CITY_CONFIG[currentCity];
  const toggleWrapper = elements.pieToggle?.closest(".toggle");
  if (!toggleWrapper || !elements.pieToggle) {
    return;
  }

  if (config?.hasSubWards) {
    toggleWrapper.style.display = "";
    elements.pieToggle.checked = pieToggleLastChecked;
    showPieCharts = elements.pieToggle.checked;
    return;
  }

  pieToggleLastChecked = elements.pieToggle.checked;
  elements.pieToggle.checked = false;
  showPieCharts = false;
  toggleWrapper.style.display = "none";
  if (pieLayer) {
    pieLayer.remove();
  }
}

function renderPlaceholder() {
  elements.wardDetails.innerHTML = `<p class=\"muted\">${t("detailsPlaceholder")}</p>`;
}

function showStatusMessage(message) {
  if (!elements.wardDetails) {
    return;
  }
  elements.wardDetails.innerHTML = `<p class=\"muted\">${message}</p>`;
}

function populateControls() {
  elements.citySelect.innerHTML = "";
  Object.values(CITY_CONFIG).forEach((city) => {
    const option = document.createElement("option");
    option.value = city.key;
    option.textContent = city.label[currentLang] || city.label.en;
    elements.citySelect.appendChild(option);
  });
  elements.citySelect.value = currentCity;

  elements.languageSelect.innerHTML = "";
  Object.keys(LANGUAGE_LABELS).forEach((langKey) => {
    const option = document.createElement("option");
    option.value = langKey;
    option.textContent = LANGUAGE_LABELS[langKey][currentLang] || langKey;
    elements.languageSelect.appendChild(option);
  });
  elements.languageSelect.value = currentLang;
}

function renderLegendList(container, entries) {
  if (!container) {
    return;
  }
  container.innerHTML = "";
  entries.forEach(([party, count]) => {
    const item = document.createElement("li");
    item.className = "legend-item";
    item.innerHTML = `
      <span class="swatch" style="background:${colorForParty(party)}"></span>
      <span>${getPartyLabel(party)}</span>
      <span class="legend-count">${count}</span>
    `;
    container.appendChild(item);
  });
}

function renderLegend() {
  const entries = Array.from(legendCounts.entries()).sort((a, b) => b[1] - a[1]);
  renderLegendList(elements.legend, entries);
  renderLegendList(elements.mapLegend, entries);
}

function updateHover(entry, wardNo) {
  return;
}

function updateDetails(wardNo) {
  const entry = wardDataByNo.get(wardNo);
  if (!entry) {
    renderPlaceholder();
    selectedWardNo = null;
    return;
  }

  selectedWardNo = wardNo;
  const displayWard = getWardNoLabel(entry, wardNo);
  const title = `${t("wardLabel")} ${displayWard}`;
  const wardName =
    (currentLang === "mr" ? entry.wardNameMr : entry.wardName) ||
    entry.wardName ||
    entry.wardNameMr ||
    "";
  const area =
    (currentLang === "mr" ? entry.areaMr : entry.area) || entry.area || entry.areaMr || "";

  if (!CITY_CONFIG[currentCity].hasSubWards) {
    const partyKey = entry.party || entry.majorityParty || FALLBACK_PARTY_KEY;
    const partyLabel = getPartyLabel(partyKey);
    const partyColor = colorForParty(partyKey);
    const winner = displayValue(entry, "winner", "winnerMr");

    const details = [
      `<h3>${title}</h3>`,
      wardName ? `<p><span class=\"muted\">${t("wardNameLabel")}:</span> ${wardName}</p>` : "",
      area ? `<p><span class=\"muted\">${t("areaLabel")}:</span> ${area}</p>` : "",
      winner
        ? `<p><span class=\"muted\">${t("winnerLabel")}:</span> ${winner}</p>`
        : "",
      `<p class=\"tag\"><span class=\"swatch\" style=\"background:${partyColor}\"></span>${partyLabel}</p>`,
    ].filter(Boolean);

    elements.wardDetails.innerHTML = details.join("");
    return;
  }

  const majorityParty = entry.majorityParty || FALLBACK_PARTY_KEY;
  const majorityLabel = getPartyLabel(majorityParty);
  const majorityColor = colorForParty(majorityParty);
  const seatTotal = entry.subWards.length;
  const seatCount = entry.seatCounts.get(majorityParty) || 0;

  const tableRows = entry.subWards
    .slice()
    .sort((a, b) => normalize(a.subWard).localeCompare(normalize(b.subWard)))
    .map((row) => {
      const subWard = displayValue(row, "subWard", "subWardMr");
      const winner = displayValue(row, "winner", "winnerMr");
      const partyKey = row.party || FALLBACK_PARTY_KEY;
      const partyLabel = getPartyLabel(partyKey);
      const partyColor = colorForParty(partyKey);
      return `
        <tr>
          <td>${subWard || "--"}</td>
          <td>${winner || "--"}</td>
          <td>
            <span class=\"tag\">
              <span class=\"swatch\" style=\"background:${partyColor}\"></span>${partyLabel}
            </span>
          </td>
        </tr>
      `;
    })
    .join("");

  elements.wardDetails.innerHTML = `
    <h3>${title}</h3>
    ${wardName ? `<p><span class=\"muted\">${t("wardNameLabel")}:</span> ${wardName}</p>` : ""}
    ${area ? `<p><span class=\"muted\">${t("areaLabel")}:</span> ${area}</p>` : ""}
    <p class=\"tag\">
      <span class=\"swatch\" style=\"background:${majorityColor}\"></span>
      ${majorityLabel} (${seatCount}/${seatTotal} ${t("seatsLabel")})
    </p>
    <table class=\"ward-table\">
      <thead>
        <tr>
          <th>${t("subWardLabel")}</th>
          <th>${t("winnerLabel")}</th>
          <th>${t("partyLabel")}</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;
}

function createPieSvg(entry) {
  const size = 36;
  const radius = 14;
  const center = size / 2;
  const entries = Array.from(entry.seatCounts.entries()).filter(([, count]) => count > 0);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  if (!total) {
    return "";
  }

  if (entries.length === 1) {
    const color = colorForParty(entries[0][0]);
    return `<svg width=\"${size}\" height=\"${size}\" viewBox=\"0 0 ${size} ${size}\">
      <circle cx=\"${center}\" cy=\"${center}\" r=\"${radius}\" fill=\"${color}\" stroke=\"#ffffff\" stroke-width=\"1\"></circle>
    </svg>`;
  }

  let startAngle = 0;
  const slices = entries
    .sort((a, b) => b[1] - a[1])
    .map(([party, count]) => {
      const angle = (count / total) * Math.PI * 2;
      const endAngle = startAngle + angle;
      const x1 = center + radius * Math.cos(startAngle);
      const y1 = center + radius * Math.sin(startAngle);
      const x2 = center + radius * Math.cos(endAngle);
      const y2 = center + radius * Math.sin(endAngle);
      const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
      const path = [
        `M ${center} ${center}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        "Z",
      ].join(" ");
      startAngle = endAngle;
      return `<path d=\"${path}\" fill=\"${colorForParty(party)}\"></path>`;
    })
    .join("");

  return `<svg width=\"${size}\" height=\"${size}\" viewBox=\"0 0 ${size} ${size}\">
    ${slices}
    <circle cx=\"${center}\" cy=\"${center}\" r=\"${radius}\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\"1\"></circle>
  </svg>`;
}

function renderPieCharts(geojson) {
  if (pieLayer) {
    pieLayer.remove();
  }
  pieLayer = L.layerGroup().addTo(map);

  geojson.features.forEach((feature) => {
    const wardNo = normalize(feature?.properties?.ward_no);
    const entry = wardDataByNo.get(wardNo);
    if (!entry) {
      return;
    }
    const svg = createPieSvg(entry);
    if (!svg) {
      return;
    }
    const center = L.geoJSON(feature).getBounds().getCenter();
    const icon = L.divIcon({
      className: "map-pie",
      html: svg,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
    L.marker(center, { icon, interactive: false }).addTo(pieLayer);
  });
}

function styleFeature(feature) {
  const wardNo = normalize(feature?.properties?.ward_no);
  const entry = wardDataByNo.get(wardNo);
  const party = entry?.majorityParty || FALLBACK_PARTY_KEY;

  return {
    color: "#111111",
    weight: 0.8,
    fillColor: colorForParty(party),
    fillOpacity: 0.78,
  };
}

function buildMap(geojson, config) {
  if (!geojson) {
    showStatusMessage(t("mapLoadError"));
    return;
  }

  if (wardLayer) {
    wardLayer.remove();
  }

  wardLayer = L.geoJSON(geojson, {
    style: styleFeature,
    onEachFeature(feature, layer) {
      layer.on({
        mouseover: (event) => {
          event.target.setStyle({
            weight: 2,
            color: "#000000",
            fillOpacity: 0.9,
          });
          const wardNo = normalize(feature?.properties?.ward_no);
          const entry = wardDataByNo.get(wardNo);
          updateHover(entry, wardNo);
          const label = getHoverText(entry, wardNo);
          if (label) {
            if (layer.getTooltip()) {
              layer.setTooltipContent(label);
            } else {
              layer.bindTooltip(label, {
                sticky: true,
                direction: "top",
                opacity: 0.95,
                className: "ward-tooltip",
              });
            }
            layer.openTooltip();
          }
        },
        mouseout: (event) => {
          wardLayer.resetStyle(event.target);
          if (layer.getTooltip()) {
            layer.closeTooltip();
          }
        },
        click: () => {
          const wardNo = normalize(feature?.properties?.ward_no);
          updateDetails(wardNo);
        },
      });
    },
  }).addTo(map);

  map.fitBounds(wardLayer.getBounds(), { padding: [24, 24] });
  elements.totalWards.textContent = geojson.features.length;

  if (config.hasSubWards && showPieCharts) {
    renderPieCharts(geojson);
  } else if (pieLayer) {
    pieLayer.remove();
  }
}

async function loadCityData(cityKey) {
  const config = CITY_CONFIG[cityKey];
  if (!config) {
    return;
  }

  try {
    const [geojson, csvText] = await Promise.all([
      loadGeoJson(config.mapFile),
      fetch(config.csvFile).then((res) => res.text()),
    ]);

    const parsedRows = rowsToObjects(parseCsv(csvText));
    const { byWard, counts, partyNames } = buildWardData(parsedRows, config);
    wardDataByNo = byWard;
    legendCounts = counts;
    partyDisplayMap = partyNames;
    currentGeoJson = geojson;

    elements.partyCount.textContent = legendCounts.size;
    renderLegend();
    updateUiStrings();
    buildMap(geojson, config);
  } catch (error) {
    showStatusMessage(t("csvLoadError"));
  }
}

function initMap() {
  map = L.map("map", {
    zoomSnap: 0.5,
    attributionControl: true,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);
}

async function init() {
  try {
    const [theme, i18nData, partyData] = await Promise.all([
      loadJson("theme.json"),
      loadJson("i18n.json"),
      loadJson("party-colors.json"),
    ]);

    applyTheme(theme);
    i18n = i18nData;
    partyColors = partyData;
    partyColorMap = buildPartyColorMap(partyColors);
  } catch (error) {
    // Theme/i18n errors fall back to defaults.
  }

  populateControls();
  updateUiStrings();
  showMapLabels = elements.mapLabelsToggle?.checked ?? false;
  document.body.classList.toggle("labels-on-map", showMapLabels);
  pieToggleLastChecked = elements.pieToggle?.checked ?? true;
  updatePieToggleVisibility();
  initMap();
  await loadCityData(currentCity);
  renderPlaceholder();

  elements.mapLabelsToggle.addEventListener("change", (event) => {
    showMapLabels = event.target.checked;
    document.body.classList.toggle("labels-on-map", showMapLabels);
  });

  elements.pieToggle.addEventListener("change", (event) => {
    showPieCharts = event.target.checked;
    if (!showPieCharts) {
      if (pieLayer) {
        pieLayer.remove();
      }
      return;
    }
    const config = CITY_CONFIG[currentCity];
    if (config?.hasSubWards && currentGeoJson) {
      renderPieCharts(currentGeoJson);
    }
  });

  elements.citySelect.addEventListener("change", async (event) => {
    currentCity = event.target.value;
    selectedWardNo = null;
    updateUiStrings();
    populateControls();
    updatePieToggleVisibility();
    await loadCityData(currentCity);
    renderPlaceholder();
  });

  elements.languageSelect.addEventListener("change", (event) => {
    currentLang = event.target.value;
    populateControls();
    updateUiStrings();
    renderLegend();
    if (selectedWardNo) {
      updateDetails(selectedWardNo);
    } else {
      renderPlaceholder();
    }
  });
}

init();
