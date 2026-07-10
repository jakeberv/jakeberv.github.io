/* ==========================================================================
   Optional scientific content renderers
   ========================================================================== */

"use strict";

const MERMAID_RUNTIME_URL =
  "https://cdn.jsdelivr.net/npm/mermaid@11.15.0/dist/mermaid.esm.min.mjs";
const PLOTLY_RUNTIME_URL =
  "https://cdn.jsdelivr.net/npm/plotly.js@3.6.0/dist/plotly.min.js";

let mermaidRuntimePromise = null;
let plotlyRuntimePromise = null;
let scientificRenderCounter = 0;

function getTokenValue(property, fallback) {
  const value = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(property)
    .trim();

  return value || fallback;
}

function siteTokens() {
  return {
    background: getTokenValue("--global-bg-color", "#ffffff"),
    surface: getTokenValue("--viz-surface", "#ffffff"),
    raised: getTokenValue("--site-surface-raised", "#f6f8fa"),
    text: getTokenValue("--viz-text", "#111827"),
    mutedText: getTokenValue("--viz-text-muted", "#4b5563"),
    grid: getTokenValue("--viz-grid", "#e5e7eb"),
    outline: getTokenValue("--viz-outline", "#6b7280"),
    tooltipBackground: getTokenValue("--viz-tooltip-bg", "#111827"),
    tooltipText: getTokenValue("--viz-tooltip-text", "#ffffff"),
    selection: getTokenValue("--viz-selection-stroke", "#2979ab"),
  };
}

function defaultLoadMermaid() {
  if (!mermaidRuntimePromise) {
    mermaidRuntimePromise = import(MERMAID_RUNTIME_URL).then(function (module) {
      return module.default || module;
    });
  }

  return mermaidRuntimePromise;
}

function defaultLoadPlotly() {
  if (window.Plotly) return Promise.resolve(window.Plotly);

  if (!plotlyRuntimePromise) {
    plotlyRuntimePromise = new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      script.src = PLOTLY_RUNTIME_URL;
      script.async = true;
      script.defer = true;

      script.onload = function () {
        if (window.Plotly) resolve(window.Plotly);
        else reject(new Error("Plotly runtime did not initialize."));
      };
      script.onerror = function () {
        reject(new Error("Plotly runtime failed to load."));
      };

      document.head.appendChild(script);
    });
  }

  return plotlyRuntimePromise;
}

function createRenderState(codeBlock, type) {
  const pre = codeBlock.parentNode;
  const output = document.createElement("div");

  scientificRenderCounter += 1;
  output.className = `scientific-content scientific-content--${type}`;
  output.dataset.scientificRenderer = type;
  output.dataset.scientificRenderId = String(scientificRenderCounter);
  pre.insertAdjacentElement("afterend", output);

  return {
    codeBlock,
    output,
    pre,
    source: codeBlock.textContent,
    type,
  };
}

function markRendered(state) {
  state.pre.hidden = true;
  state.output.className = `scientific-content scientific-content--${state.type}`;
  state.output.removeAttribute("role");
  state.output.removeAttribute("aria-live");
}

function markFailed(state, label, error) {
  state.pre.hidden = false;
  state.output.className = `scientific-content scientific-content--${state.type} scientific-content--error`;
  state.output.setAttribute("role", "status");
  state.output.setAttribute("aria-live", "polite");
  state.output.textContent = `${label} could not render: ${error.message || error}`;
}

function mermaidThemeVariables() {
  const tokens = siteTokens();

  return {
    background: tokens.background,
    primaryColor: tokens.raised,
    primaryTextColor: tokens.text,
    primaryBorderColor: tokens.outline,
    lineColor: tokens.outline,
    secondaryColor: tokens.surface,
    tertiaryColor: tokens.background,
    textColor: tokens.text,
    edgeLabelBackground: tokens.surface,
    clusterBkg: tokens.surface,
    clusterBorder: tokens.outline,
    noteBkgColor: tokens.raised,
    noteTextColor: tokens.text,
    noteBorderColor: tokens.grid,
    actorBkg: tokens.raised,
    actorTextColor: tokens.text,
    actorBorder: tokens.outline,
  };
}

async function renderMermaidState(state, mermaid) {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    themeVariables: mermaidThemeVariables(),
  });

  const renderId = `scientific-mermaid-${state.output.dataset.scientificRenderId}`;
  const result = await mermaid.render(renderId, state.source);
  state.output.innerHTML = result.svg || String(result);
  if (result.bindFunctions) result.bindFunctions(state.output);
  markRendered(state);
}

function isPlainObject(value) {
  return Boolean(value) && Object.prototype.toString.call(value) === "[object Object]";
}

function mergePlainObjects(base, override) {
  const merged = Object.assign({}, base);

  if (!isPlainObject(override)) return merged;

  Object.keys(override).forEach(function (key) {
    if (isPlainObject(merged[key]) && isPlainObject(override[key])) {
      merged[key] = mergePlainObjects(merged[key], override[key]);
    } else {
      merged[key] = override[key];
    }
  });

  return merged;
}

function parsePlotlySource(source) {
  const parsed = JSON.parse(source);

  if (!isPlainObject(parsed)) {
    throw new Error("Plotly block must contain a JSON object.");
  }
  if (!Array.isArray(parsed.data)) {
    throw new Error("Plotly block requires a data array.");
  }
  if (parsed.layout !== undefined && !isPlainObject(parsed.layout)) {
    throw new Error("Plotly layout must be an object.");
  }
  if (parsed.config !== undefined && !isPlainObject(parsed.config)) {
    throw new Error("Plotly config must be an object.");
  }

  return {
    config: parsed.config || {},
    data: parsed.data,
    layout: parsed.layout || {},
  };
}

function plotlyTemplate() {
  const tokens = siteTokens();

  return {
    layout: {
      paper_bgcolor: tokens.surface,
      plot_bgcolor: tokens.surface,
      font: { color: tokens.text },
      title: { font: { color: tokens.text } },
      xaxis: {
        color: tokens.text,
        gridcolor: tokens.grid,
        linecolor: tokens.outline,
        zerolinecolor: tokens.outline,
      },
      yaxis: {
        color: tokens.text,
        gridcolor: tokens.grid,
        linecolor: tokens.outline,
        zerolinecolor: tokens.outline,
      },
      legend: {
        font: { color: tokens.text },
        bgcolor: "rgba(0,0,0,0)",
      },
      hoverlabel: {
        bgcolor: tokens.tooltipBackground,
        bordercolor: tokens.outline,
        font: { color: tokens.tooltipText },
      },
      dragmode: "zoom",
    },
  };
}

function themedPlotlyLayout(userLayout) {
  return mergePlainObjects(
    {
      autosize: true,
      paper_bgcolor: siteTokens().surface,
      plot_bgcolor: siteTokens().surface,
      template: plotlyTemplate(),
      uirevision: "site-theme",
    },
    userLayout,
  );
}

function themedPlotlyConfig(userConfig) {
  return Object.assign(
    {
      displaylogo: false,
      responsive: true,
    },
    userConfig,
  );
}

async function renderPlotlyState(state, plotly, parsed) {
  await plotly.react(
    state.output,
    parsed.data,
    themedPlotlyLayout(parsed.layout),
    themedPlotlyConfig(parsed.config),
  );
  markRendered(state);
}

function initializeScientificContent(options = {}) {
  const mermaidStates = Array.from(
    document.querySelectorAll("pre > code.language-mermaid"),
  ).map(function (codeBlock) {
    return createRenderState(codeBlock, "mermaid");
  });
  const plotlyStates = Array.from(
    document.querySelectorAll("pre > code.language-plotly"),
  ).map(function (codeBlock) {
    return createRenderState(codeBlock, "plotly");
  });

  if (mermaidStates.length === 0 && plotlyStates.length === 0) {
    return Promise.resolve();
  }

  const loadMermaid = options.loadMermaid || defaultLoadMermaid;
  const loadPlotly = options.loadPlotly || defaultLoadPlotly;
  let activeMermaidPromise = null;
  let activePlotlyPromise = null;
  const plotlyPayloads = new Map();

  function getMermaid() {
    if (!activeMermaidPromise) activeMermaidPromise = Promise.resolve(loadMermaid());
    return activeMermaidPromise;
  }

  function getPlotly() {
    if (!activePlotlyPromise) activePlotlyPromise = Promise.resolve(loadPlotly());
    return activePlotlyPromise;
  }

  async function renderMermaidBlocks() {
    if (mermaidStates.length === 0) return;

    let mermaid;
    try {
      mermaid = await getMermaid();
    } catch (error) {
      mermaidStates.forEach(function (state) {
        markFailed(state, "Mermaid", error);
      });
      return;
    }

    await Promise.all(
      mermaidStates.map(async function (state) {
        try {
          await renderMermaidState(state, mermaid);
        } catch (error) {
          markFailed(state, "Mermaid", error);
        }
      }),
    );
  }

  async function renderPlotlyBlocks() {
    const validStates = [];

    plotlyStates.forEach(function (state) {
      if (!plotlyPayloads.has(state)) {
        try {
          plotlyPayloads.set(state, parsePlotlySource(state.source));
        } catch (error) {
          markFailed(state, "Plotly", error);
          return;
        }
      }

      validStates.push(state);
    });

    if (validStates.length === 0) return;

    let plotly;
    try {
      plotly = await getPlotly();
    } catch (error) {
      validStates.forEach(function (state) {
        markFailed(state, "Plotly", error);
      });
      return;
    }

    await Promise.all(
      validStates.map(async function (state) {
        try {
          await renderPlotlyState(state, plotly, plotlyPayloads.get(state));
        } catch (error) {
          markFailed(state, "Plotly", error);
        }
      }),
    );
  }

  function renderAllScientificBlocks() {
    return Promise.all([renderMermaidBlocks(), renderPlotlyBlocks()]).then(
      function () {},
    );
  }

  window.addEventListener("site:themechange", function () {
    return renderAllScientificBlocks();
  });

  return renderAllScientificBlocks();
}
