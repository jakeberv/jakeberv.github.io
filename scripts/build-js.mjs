import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import UglifyJS from "uglify-js";

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), "..");
const outputPath = path.join(repositoryRoot, "assets/js/main.min.js");
const sourcePaths = [
  "node_modules/jquery/dist/jquery.min.js",
  "assets/js/plugins/jquery.greedy-navigation.js",
  "assets/js/_main.js",
];

export async function generateBundle() {
  const sources = {};

  for (const sourcePath of sourcePaths) {
    sources[sourcePath] = await readFile(
      path.join(repositoryRoot, sourcePath),
      "utf8",
    );
  }

  const result = UglifyJS.minify(sources, {
    compress: true,
    mangle: true,
    output: {
      comments: /^!/,
    },
  });

  if (result.error) {
    throw result.error;
  }

  return `${result.code}\n`;
}

export async function verifyBundle(candidatePath = outputPath) {
  const [generated, committed] = await Promise.all([
    generateBundle(),
    readFile(candidatePath, "utf8").catch(() => ""),
  ]);

  if (generated !== committed) {
    throw new Error(
      "JavaScript bundle is stale. Run `npm run build:js` and commit assets/js/main.min.js.",
    );
  }
}

async function main() {
  if (process.argv.includes("--check")) {
    await verifyBundle();
    console.log("JavaScript bundle is current.");
    return;
  }

  await writeFile(outputPath, await generateBundle(), "utf8");
  console.log("Built assets/js/main.min.js.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}
