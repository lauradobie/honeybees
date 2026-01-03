console.log("main.js loaded ✅");

d3.select("#viz").append("div")
  .style("padding", "12px")
  .style("border", "1px dashed #999")
  .text("JS is running ✅ (if you see this, rendering is next)");


const scroller = scrollama();

let metrics = [];
let stressors = [];

// Basic SVG setup
const container = d3.select("#viz");
const width = () => container.node().clientWidth;
const height = () => container.node().clientHeight;

const svg = container.append("svg");
const g = svg.append("g");

function resize() {
  svg.attr("width", width()).attr("height", height());
}

window.addEventListener("resize", () => {
  resize();
  scroller.resize();
});

function setCaption(text) {
  d3.select("#caption").text(text);
}

// Helper: get national rows for a metric
function getNational(metricName) {
  return metrics
    .filter(d => d.level === "national" && d.metric === metricName)
    .filter(d => d.value !== null && d.value !== undefined && !Number.isNaN(+d.value))
    .sort((a,b) => a.period_index - b.period_index)
    .map(d => ({...d, value: +d.value}));
}

function clearViz() {
  g.selectAll("*").remove();
}

// Simple line chart renderer
function renderLine(series, title) {
  resize();
  clearViz();

  const W = width(), H = height();
  const margin = {top: 30, right: 20, bottom: 35, left: 55};
  const iw = W - margin.left - margin.right;
  const ih = H - margin.top - margin.bottom;

  const gg = g.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain(d3.extent(series, d => d.period_index))
    .range([0, iw]);

  const y = d3.scaleLinear()
    .domain(d3.extent(series, d => d.value)).nice()
    .range([ih, 0]);

  gg.append("g").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x).ticks(6));
  gg.append("g").call(d3.axisLeft(y).ticks(6));

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
    .attr("y", -10)
    .attr("font-weight", 700)
    .text(title);
}

async function init() {
  metrics = await d3.json("data/metrics_long.json");
  stressors = await d3.json("data/stressors_long.json");

// ---- DEBUG: show what we actually loaded ----
const levels = Array.from(new Set(metrics.map(d => (d.level ?? "").toString().trim()))).slice(0, 10);
const metricsNames = Array.from(new Set(metrics.map(d => (d.metric ?? "").toString().trim()))).slice(0, 15);

d3.select("#viz")
  .append("div")
  .attr("id", "data-debug")
  .style("padding", "10px")
  .style("margin", "10px 0")
  .style("border", "1px solid #ddd")
  .style("font-size", "12px")
  .style("line-height", "1.3")
  .html(
    `<strong>Data loaded ✅</strong><br/>
     rows: ${metrics.length}<br/>
     sample level values: ${levels.join(", ")}<br/>
     sample metric values: ${metricsNames.join(", ")}`
  );

  

  // Scrollama wiring
  scroller
    .setup({
      step: ".step",
      offset: 0.6,
    })
    .onStepEnter(response => {
      d3.selectAll(".step").classed("is-active", false);
      d3.select(response.element).classed("is-active", true);

      const step = +response.element.dataset.step;

      if (step === 0) {
        renderLine(getNational("quarter_start_colonies"), "National: Quarter start colonies (seasonal)");
        setCaption("Quarterly starting colony counts show seasonal rhythm across years.");
      }

      if (step === 1) {
        renderLine(getNational("gross_turnover"), "National: Gross turnover (lost + added + renovated)");
        setCaption("Turnover shows how much movement exists even when totals look stable.");
      }

      if (step === 2) {
        renderLine(getNational("intervention_to_loss"), "National: Intervention-to-loss ratio");
        setCaption("If this rises over time, it suggests more effort is required to offset losses.");
      }

      if (step === 3) {
        renderLine(getNational("ccd_share_of_loss"), "National: CCD share of losses");
        setCaption("CCD is tracked separately; this shows its share of total losses over time.");
      }
    });

  // render first view
  renderLine(getNational("quarter_start_colonies"), "National: Quarter start colonies (seasonal)");
  setCaption("Quarterly starting colony counts show seasonal rhythm across years.");
}

init();
