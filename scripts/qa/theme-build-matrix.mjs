import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const palettes = ["default", "air", "sunrise", "mint", "dirt", "contrast"];
const expectedBaseColors = {
  default: "#7a8288",
  air: "#007fae",
  sunrise: "#b62339",
  mint: "#0b7478",
  dirt: "#343434",
  contrast: "#b60000",
};
const expectedRouteManifest = (
  await readFile(path.join(repositoryRoot, "scripts/qa/expected-html-routes.txt"), "utf8")
)
  .trim()
  .split(/\r?\n/);
const contrastFailures = [];

async function run(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repositoryRoot,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code}`));
    });
  });
}

async function htmlRoutes(directory, root = directory) {
  const routes = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) routes.push(...(await htmlRoutes(entryPath, root)));
    else if (entry.name.endsWith(".html")) {
      routes.push(path.relative(root, entryPath).split(path.sep).join("/"));
    }
  }
  return routes.sort();
}

function parseDeclarations(block) {
  return new Map(
    [...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [
      match[1],
      match[2].trim(),
    ]),
  );
}

function parseColor(value) {
  const namedColors = {
    black: "#000",
    gainsboro: "#dcdcdc",
    gray: "#808080",
    grey: "#808080",
    white: "#fff",
  };
  if (namedColors[value.toLowerCase()]) {
    return parseColor(namedColors[value.toLowerCase()]);
  }
  const shortHex = value.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (shortHex) {
    return shortHex.slice(1).map((part) => Number.parseInt(part + part, 16));
  }
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    return [0, 2, 4].map((offset) => Number.parseInt(hex[1].slice(offset, offset + 2), 16));
  }
  throw new Error(`Unsupported compiled color: ${value}`);
}

function luminance(value) {
  return parseColor(value)
    .map((channel) => channel / 255)
    .map((channel) =>
      channel <= 0.03928
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4,
    )
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrastRatio(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function requireContrast(properties, foreground, background, minimum, context) {
  const foregroundValue = properties.get(foreground);
  const backgroundValue = properties.get(background);
  assert.ok(foregroundValue, `${context} is missing ${foreground}`);
  assert.ok(backgroundValue, `${context} is missing ${background}`);
  const ratio = contrastRatio(foregroundValue, backgroundValue);
  if (ratio < minimum) {
    contrastFailures.push(
      `${context} ${foreground} ${foregroundValue} on ${backgroundValue} is ${ratio.toFixed(2)}:1; expected ${minimum}:1`,
    );
  }
}

function verifyContrast(css, palette) {
  const lightMatch = css.match(/:root\s*\{([^}]+)\}/);
  const darkMatch = css.match(/html\[data-theme="?dark"?\]\s*\{([^}]+)\}/);
  assert.ok(lightMatch, `${palette} light properties were not compiled`);
  assert.ok(darkMatch, `${palette} dark properties were not compiled`);

  for (const [mode, block] of [["light", lightMatch[1]], ["dark", darkMatch[1]]]) {
    const properties = parseDeclarations(block);
    const context = `${palette} ${mode}`;
    for (const property of [
      "--global-text-color",
      "--global-text-color-light",
      "--global-fig-caption-color",
      "--global-link-color",
      "--global-link-color-hover",
      "--global-link-color-visited",
      "--global-masthead-link-color",
      "--global-masthead-link-color-hover",
    ]) {
      requireContrast(properties, property, "--global-bg-color", 4.5, context);
    }
    requireContrast(
      properties,
      "--global-code-text-color",
      "--global-code-background-color",
      4.5,
      context,
    );
    requireContrast(
      properties,
      "--global-selection-text-color",
      "--global-selection-bg-color",
      4.5,
      context,
    );
    requireContrast(properties, "--site-control-text", "--site-control-bg", 4.5, context);
    requireContrast(properties, "--site-control-text", "--site-control-bg-hover", 4.5, context);
    requireContrast(properties, "--site-control-text", "--site-control-bg-active", 4.5, context);
    requireContrast(properties, "--site-link-contrast", "--global-link-color", 4.5, context);
    requireContrast(properties, "--site-control-border", "--site-control-bg", 3, context);
    requireContrast(properties, "--site-focus-ring", "--site-control-bg", 3, context);
    requireContrast(properties, "--viz-text", "--viz-surface", 4.5, context);
    requireContrast(properties, "--viz-text-muted", "--viz-surface", 4.5, context);
    requireContrast(properties, "--viz-tooltip-text", "--viz-tooltip-bg", 4.5, context);
    requireContrast(properties, "--site-base-contrast", "--global-base-color", 4.5, context);
    for (const status of ["danger", "warning", "success", "info"]) {
      requireContrast(
        properties,
        `--site-${status}-contrast`,
        `--site-${status}-color`,
        4.5,
        context,
      );
    }
  }
}

for (const palette of palettes) {
  console.log(`\n=== Building ${palette} theme ===`);
  await run("./scripts/local_preview.command", [
    "--build-only",
    "--full-build",
    "--skip-data",
    "--theme",
    palette,
  ]);

  const siteDirectory = path.join(repositoryRoot, "_site");
  assert.deepEqual(await htmlRoutes(siteDirectory), expectedRouteManifest, `${palette} route manifest drifted`);
  await assert.rejects(
    access(path.join(siteDirectory, "markdown_generator")),
    (error) => error.code === "ENOENT",
    `${palette} published markdown_generator tooling`,
  );
  const css = await readFile(path.join(repositoryRoot, "_site/assets/css/main.css"), "utf8");
  assert.match(css, /html\[data-theme="?dark"?\]/);
  assert.match(css, new RegExp(`--global-base-color: ${expectedBaseColors[palette]}`));
  assert.doesNotMatch(css, /@include emit-theme-properties|map-get\(/);
  verifyContrast(css, palette);
}

assert.equal(
  contrastFailures.length,
  0,
  `Theme contrast failures:\n${contrastFailures.map((failure) => `- ${failure}`).join("\n")}`,
);

console.log(`\nAll ${palettes.length} themes built with ${expectedRouteManifest.length} routes.`);
