import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const mathJaxUrl = "https://cdn.jsdelivr.net/npm/mathjax@4.0.0/tex-mml-chtml.js";
const mermaidUrl =
  "https://cdn.jsdelivr.net/npm/mermaid@11.15.0/dist/mermaid.esm.min.mjs";
const plotlyUrl =
  "https://cdn.jsdelivr.net/npm/plotly.js@3.6.0/dist/plotly.min.js";

async function source(filePath) {
  return readFile(path.join(repositoryRoot, filePath), "utf8");
}

class FakeClassList {
  constructor(initial = []) {
    this.classes = new Set(initial);
  }

  add(className) {
    this.classes.add(className);
  }

  contains(className) {
    return this.classes.has(className);
  }

  remove(className) {
    this.classes.delete(className);
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    this.children = [];
    this.classList = new FakeClassList();
    this.dataset = {};
    this.hidden = false;
    this.innerHTML = "";
    this.parentNode = null;
    this.textContent = "";
  }

  addEventListener(name, handler) {
    this[`on${name}`] = handler;
  }

  append(...children) {
    for (const child of children) {
      child.parentNode = this;
      this.children.push(child);
    }
  }

  appendChild(child) {
    this.append(child);
    return child;
  }

  getAttribute(name) {
    return this.attributes.get(name) || null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  insertAdjacentElement(position, element) {
    assert.equal(position, "afterend");
    this.afterElement = element;
    element.parentNode = this.parentNode;
    if (this.parentNode) this.parentNode.insertedAfter = element;
  }

  querySelector(selector) {
    if (selector === "[role=\"status\"]") {
      return this.children.find((child) => child.getAttribute("role") === "status") || null;
    }

    return null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
}

function createScientificContext(blocks) {
  const handlers = {};
  const headScripts = [];
  const documentElement = new FakeElement("html");
  const document = {
    documentElement,
    createElement(tagName) {
      return new FakeElement(tagName);
    },
    head: {
      appendChild(script) {
        headScripts.push(script);
        if (script.onload) script.onload();
        return script;
      },
    },
    querySelectorAll(selector) {
      if (selector === "pre > code.language-mermaid") return blocks.mermaid || [];
      if (selector === "pre > code.language-plotly") return blocks.plotly || [];
      return [];
    },
  };
  const windowObject = {
    Plotly: null,
    addEventListener(name, handler) {
      handlers[name] = handler;
    },
    getComputedStyle() {
      const tokens = {
        "--global-bg-color": "#ffffff",
        "--site-surface-raised": "#f6f8fa",
        "--site-text-strong": "#111827",
        "--site-text-muted": "#4b5563",
        "--site-border-subtle": "#d1d5db",
        "--site-link-contrast": "#ffffff",
        "--viz-surface": "#ffffff",
        "--viz-text": "#111827",
        "--viz-text-muted": "#4b5563",
        "--viz-grid": "#e5e7eb",
        "--viz-outline": "#6b7280",
        "--viz-tooltip-bg": "#111827",
        "--viz-tooltip-text": "#ffffff",
        "--viz-selection-stroke": "#2979ab",
      };

      return {
        getPropertyValue(property) {
          return tokens[property] || "";
        },
      };
    },
  };
  const context = {
    console: { error() {} },
    document,
    setTimeout,
    window: windowObject,
  };

  vm.createContext(context);
  return { context, document, handlers, headScripts, windowObject };
}

async function loadScientificRuntime(blocks = {}) {
  const runtime = createScientificContext(blocks);
  vm.runInContext(await source("assets/js/_scientific-content.js"), runtime.context);
  return runtime;
}

function createCodeBlock(language, sourceText) {
  const pre = new FakeElement("pre");
  const code = new FakeElement("code");

  code.classList = new FakeClassList([`language-${language}`]);
  code.textContent = sourceText;
  code.parentNode = pre;
  pre.append(code);

  return { code, pre };
}

test("MathJax 4 is opt-in and MathJax 2 is removed from the global head", async () => {
  const [headCustom, scriptsInclude, scientificInclude, notFoundPage] =
    await Promise.all([
      source("_includes/head/custom.html"),
      source("_includes/scripts.html"),
      source("_includes/scientific-content.html"),
      source("_pages/404.md"),
    ]);

  assert.doesNotMatch(headCustom, /MathJax\.Hub|mathjax\/2\.7\.4|cdnjs/);
  assert.match(
    scriptsInclude,
    /\{% include scientific-content\.html %\}[\s\S]*<script type="module" src="\{\{ base_path \}\}\/assets\/js\/main\.min\.js"><\/script>/,
  );
  assert.match(scientificInclude, /\{% if page\.mathjax %\}/);
  assert.match(scientificInclude, new RegExp(mathJaxUrl.replaceAll(".", "\\.")));
  assert.match(scientificInclude, /window\.MathJax\s*=/);
  assert.match(scientificInclude, /inlineMath:[\s\S]*\["\\\\\(",\s*"\\\\\)"\][\s\S]*\["\$",\s*"\$"\]/);
  assert.match(scientificInclude, /displayMath:[\s\S]*\["\$\$",\s*"\$\$"\][\s\S]*\["\\\\\[",\s*"\\\\\]"\]/);
  assert.match(scientificInclude, /processEscapes:\s*true/);
  assert.match(scientificInclude, /tags:\s*"ams"/);
  assert.match(scientificInclude, /skipHtmlTags:[\s\S]*"pre"[\s\S]*"code"/);
  assert.match(notFoundPage, /^mathjax:\s*true$/m);
});

test("the scientific runtime is wired into the deterministic bundle contract", async () => {
  const [packageDefinition, builder, config] = await Promise.all([
    source("package.json").then(JSON.parse),
    source("scripts/build-js.mjs"),
    source("_config.yml"),
  ]);

  assert.equal(
    packageDefinition.scripts["check:scientific"],
    "node --test scripts/qa/scientific-content.test.mjs",
  );
  assert.match(packageDefinition.scripts.test, /scientific-content\.test\.mjs/);
  assert.match(packageDefinition.scripts["watch:js"], /assets\/js\/_scientific-content\.js/);
  assert.match(
    builder,
    /"assets\/js\/_scientific-content\.js",\n\s+"assets\/js\/_main\.js"/,
  );
  assert.match(config, /^\s+- assets\/js\/_scientific-content\.js$/m);
});

test("the runtime declares exact pinned CDN URLs and public initializer", async () => {
  const runtime = await source("assets/js/_scientific-content.js");

  assert.match(runtime, new RegExp(mermaidUrl.replaceAll(".", "\\.")));
  assert.match(runtime, new RegExp(plotlyUrl.replaceAll(".", "\\.")));
  assert.match(runtime, /function initializeScientificContent\(/);
  assert.match(runtime, /site:themechange/);
  assert.match(runtime, /securityLevel:\s*"strict"/);
  assert.match(runtime, /startOnLoad:\s*false/);
});

test("no scientific library loads when matching fenced blocks are absent", async () => {
  const { context, headScripts } = await loadScientificRuntime();
  let mermaidLoads = 0;
  let plotlyLoads = 0;

  await context.initializeScientificContent({
    loadMermaid() {
      mermaidLoads += 1;
      throw new Error("Mermaid should not load");
    },
    loadPlotly() {
      plotlyLoads += 1;
      throw new Error("Plotly should not load");
    },
  });

  assert.equal(mermaidLoads, 0);
  assert.equal(plotlyLoads, 0);
  assert.equal(headScripts.length, 0);
});

test("Mermaid blocks render with one loader and rerender on theme changes", async () => {
  const first = createCodeBlock("mermaid", "graph TD; A-->B;");
  const second = createCodeBlock("mermaid", "sequenceDiagram\nA->>B: hi");
  const { context, handlers } = await loadScientificRuntime({
    mermaid: [first.code, second.code],
  });
  let loadCount = 0;
  let renderCount = 0;

  const mermaid = {
    initialize(options) {
      assert.equal(options.startOnLoad, false);
      assert.equal(options.securityLevel, "strict");
      assert.equal(options.theme, "base");
    },
    async render(id, definition) {
      renderCount += 1;
      return { svg: `<svg data-id="${id}">${definition}</svg>` };
    },
  };

  await context.initializeScientificContent({
    async loadMermaid() {
      loadCount += 1;
      return mermaid;
    },
  });

  assert.equal(loadCount, 1);
  assert.equal(renderCount, 2);
  assert.equal(first.pre.hidden, true);
  assert.match(first.pre.afterElement.innerHTML, /graph TD/);

  await handlers["site:themechange"]({ detail: { theme: "dark" } });
  assert.equal(loadCount, 1);
  assert.equal(renderCount, 4);
});

test("Plotly blocks render token defaults while preserving user config", async () => {
  const block = createCodeBlock(
    "plotly",
    JSON.stringify({
      data: [{ x: [1, 2], y: [2, 3], type: "scatter" }],
      layout: { title: "Custom", paper_bgcolor: "#abc123" },
      config: { scrollZoom: true },
    }),
  );
  const { context, handlers } = await loadScientificRuntime({ plotly: [block.code] });
  let loadCount = 0;
  let lastCall = null;

  const plotly = {
    async react(element, data, layout, config) {
      lastCall = { element, data, layout, config };
    },
  };

  await context.initializeScientificContent({
    async loadPlotly() {
      loadCount += 1;
      return plotly;
    },
  });

  assert.equal(loadCount, 1);
  assert.equal(block.pre.hidden, true);
  assert.equal(lastCall.layout.title, "Custom");
  assert.equal(lastCall.layout.paper_bgcolor, "#abc123");
  assert.equal(lastCall.layout.uirevision, "site-theme");
  assert.equal(lastCall.layout.template.layout.font.color, "#111827");
  assert.equal(lastCall.config.displaylogo, false);
  assert.equal(lastCall.config.responsive, true);
  assert.equal(lastCall.config.scrollZoom, true);

  await handlers["site:themechange"]({ detail: { theme: "dark" } });
  assert.equal(loadCount, 1);
});

test("failed scientific rendering keeps source visible and adds an accessible status", async () => {
  const badPlotly = createCodeBlock("plotly", "{\"data\": \"not an array\"}");
  const badMermaid = createCodeBlock("mermaid", "graph TD; A-->B;");
  const { context } = await loadScientificRuntime({
    mermaid: [badMermaid.code],
    plotly: [badPlotly.code],
  });

  await context.initializeScientificContent({
    async loadMermaid() {
      throw new Error("CDN unavailable");
    },
    async loadPlotly() {
      throw new Error("Plotly should not load for invalid JSON");
    },
  });

  assert.equal(badPlotly.pre.hidden, false);
  assert.equal(badMermaid.pre.hidden, false);
  assert.equal(badPlotly.pre.afterElement.getAttribute("role"), "status");
  assert.equal(badMermaid.pre.afterElement.getAttribute("role"), "status");
  assert.match(badPlotly.pre.afterElement.textContent, /Plotly/);
  assert.match(badMermaid.pre.afterElement.textContent, /Mermaid/);
});

test("successful rerenders clear prior scientific error state", async () => {
  const block = createCodeBlock("mermaid", "graph TD; A-->B;");
  const { context, handlers } = await loadScientificRuntime({ mermaid: [block.code] });
  let renderCount = 0;

  const mermaid = {
    initialize() {},
    async render(id, definition) {
      renderCount += 1;
      if (renderCount === 1) throw new Error("temporary render failure");
      return { svg: `<svg data-id="${id}">${definition}</svg>` };
    },
  };

  await context.initializeScientificContent({
    async loadMermaid() {
      return mermaid;
    },
  });

  assert.equal(block.pre.hidden, false);
  assert.equal(block.pre.afterElement.className, "scientific-content scientific-content--mermaid scientific-content--error");
  assert.equal(block.pre.afterElement.getAttribute("role"), "status");
  assert.equal(block.pre.afterElement.getAttribute("aria-live"), "polite");

  await handlers["site:themechange"]({ detail: { theme: "dark" } });

  assert.equal(block.pre.hidden, true);
  assert.equal(block.pre.afterElement.className, "scientific-content scientific-content--mermaid");
  assert.equal(block.pre.afterElement.getAttribute("role"), null);
  assert.equal(block.pre.afterElement.getAttribute("aria-live"), null);
  assert.match(block.pre.afterElement.innerHTML, /graph TD/);
});

test("the uncompiled scientific source remains outside the Pages artifact", async () => {
  await assert.rejects(access(path.join(repositoryRoot, "_site/assets/js/_scientific-content.js")));
});
