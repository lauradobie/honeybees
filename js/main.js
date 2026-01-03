// ==========================
// Editorial pinned chart baseline (robust)
// ==========================

let metrics = [];

// DOM
const levelSelect = document.getElementById("levelSelect");
const metricSelect = document.getElementById("metricSelect");

// SVG setup
const container = d3.select("#viz");
const svg = container.append("svg");
const g = svg.append("g");

function setCaption(t) {
  document.getElementById("caption").textContent = t;
}

function size() {
  const w = container.node().clientWidth || 800;
  const h = container.node().clientHeight || 500;
  svg.attr("width", w).attr("height", h);
  return { w, h };
}

window.addEventListener("resize", () => {
  renderCurrent();
});

// Clean/normalize one row
function cleanRow(d) {
  return {
    level: (d.level ?? "").toString().trim().toLowerCase(),
    metric: (d.metric ?? "").toString().trim().toLowerCase(),
    region: (d.region ?? "").toString().trim(),
    period: (d.period ?? "").toString().trim(),
    period_index: Number(d.period_index),
    value: Number(d.value),
  };
}

function unique(arr) {
  return Array.from(new Set(arr)).filter(Boolean);
}

function getSeries(level, metric) {
  return metrics
    .filter(d => d.level === level && d.metric === metric)
    .filter(d => Number.isFinite(d.period_index) && Number.isFinite(d.value))
    .sort((a, b) => a.period_index - b.period_index);
}

function clearViz() {
  g.selectAll("*").remove();
}

// Nice label for metric strings
function prettyMetric(m) {
  // convert snake_case → Title Case-ish
  return (m || "")
    .toString()
    .replaceAll("_", " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Render a line chart
function renderLine(series, title) {
  const { w, h } = size();
  clearViz();

  if (!series || series.length === 0) {
    g.append("text")
      .attr("x", 16)
      .attr("y", 28)
      .attr("font-size", 14)
      .text("No data found for this view. (Metric/level mismatch)");
    return;
  }

  const margin = { top: 38, right: 18, bottom: 36, left: 60 };
  const iw = w - margin.left - margin.right;
  const ih = h - margin.top - margin.bottom;

  const gg = g.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain(d3.extent(series, d => d.period_index))
    .range([0, iw]);

  const y = d3.scaleLinear()
    .domain(d3.extent(series, d => d.value)).nice()
    .range([ih, 0]);

  gg.append("g")
    .attr("transform", `translate(0,${ih})`)
    .call(d3.axisBottom(x).ticks(6));

  gg.append("g")
    .call(d3.axisLeft(y).ticks(6));

  gg.append("path")
    .datum(series)
    .attr("fill", "none")
    .attr("stroke", "currentColor")
    .attr("stroke-width", 2)
    .attr("d", d3.line()
      .x(d => x(d.period_index))
      .y(d => y(d.value))
    );

  gg.append("text")
    .attr("x", 0)
    .attr("y", -14)
    .attr("font-weight", 700)
    .text(title);
}

// Populate selects based on data
function mountSelectors(levels) {
  // Level select
  levelSelect.innerHTML = "";
  levels.forEach(l => {
    const opt = document.createElement("option");
    opt.value = l;
    opt.textContent = l;
    levelSelect.appendChild(opt);
  });

  // default to national if present
  const defaultLevel = levels.includes("national") ? "national" : levels[0];
  levelSelect.value = defaultLevel;

  // Metric select will be populated based on level
  levelSelect.addEventListener("change", () => {
    populateMetricSelect(levelSelect.value);
    renderCurrent();
  });

  metricSelect.addEventListener("change", () => {
    renderCurrent();
  });

  populateMetricSelect(defaultLevel);
}

function populateMetricSelect(level) {
  const metricsForLevel = unique(
    metrics.filter(d => d.level === level).map(d => d.metric)
  ).sort();

  metricSelect.innerHTML = "";
  metricsForLevel.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = prettyMetric(m);
    metricSelect.appendChild(opt);
  });

  // pick a sensible default if present
  const preferred = ["quarter_start_colonies", "gross_turnover", "intervention_to_loss", "lost_per_100_start", "loss_pct"];
  const found = preferred.find(p => metricsForLevel.includes(p));
  metricSelect.value = found || metricsForLevel[0] || "";
}

function renderCurrent() {
  const level = (levelSelect.value || "").toLowerCase();
  const metric = (metricSelect.value || "").toLowerCase();

  const series = getSeries(level, metric);
  renderLine(series, `${level.toUpperCase()}: ${prettyMetric(metric)}`);
  setCaption(`Showing ${series.length} points for ${level} / ${prettyMetric(metric)}.`);
}

// Init
async function init() {
  const raw = await d3.json("data/metrics_long.json");
  metrics = raw.map(cleanRow);

  const levels = unique(metrics.map(d => d.level));
  if (!levels.length) {
    setCaption("No level values found in data.");
    return;
  }

  mountSelectors(levels);
  renderCurrent();

  setCaption(`Loaded ${metrics.length} rows. Use the dropdowns to explore.`);
}

init().catch(err => {
  console.error(err);
  d3.select("#viz").append("pre")
    .style("white-space", "pre-wrap")
    .style("padding", "12px")
    .style("border", "1px solid #f99")
    .text("Visualization error:\n\n" + (err?.stack || err));
  setCaption("A visualization error occurred. Open the console for details.");
});
