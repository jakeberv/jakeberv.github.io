import { readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { validateBuiltSearch } from "./qa/search-built-contract.mjs";
import { parseRouteManifest } from "./qa/site-artifact-contract.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteDirectory = path.join(repositoryRoot, "_site");
const outputDirectory = path.join(siteDirectory, "pagefind");
const temporaryDirectory = path.join(siteDirectory, `.pagefind-${process.pid}-${Date.now()}`);
const searchManifestPath = path.join(repositoryRoot, "scripts/qa/expected-search-routes.txt");

function requireNoErrors(errors, context) {
  if (!errors?.length) return;
  throw new Error(`${context}:\n${errors.map((error) => `- ${error}`).join("\n")}`);
}

async function loadPagefind() {
  try {
    return await import("pagefind");
  } catch (error) {
    if (error?.code === "ERR_MODULE_NOT_FOUND") {
      throw new Error("Pagefind 1.5.2 is not installed. Run `npm ci` with Node 24 and npm 11.");
    }
    throw error;
  }
}

export async function buildSearch() {
  const pagefind = await loadPagefind();
  let index;

  await Promise.all([
    rm(outputDirectory, { force: true, recursive: true }),
    rm(temporaryDirectory, { force: true, recursive: true }),
  ]);

  try {
    const created = await pagefind.createIndex({
      forceLanguage: "en",
      writePlayground: false,
    });
    requireNoErrors(created.errors, "Pagefind could not create the index");
    index = created.index;
    if (!index) throw new Error("Pagefind did not return an index instance.");

    const expectedRoutes = parseRouteManifest(await readFile(searchManifestPath, "utf8"));
    let indexedPages = 0;
    for (const route of expectedRoutes) {
      const content = await readFile(path.join(siteDirectory, route), "utf8");
      const url = route === "index.html"
        ? "/"
        : `/${route.replace(/index\.html$/, "")}`;
      const added = await index.addHTMLFile({ content, url });
      requireNoErrors(added.errors, `Pagefind could not index ${route}`);
      if (!added.file) throw new Error(`Pagefind did not return an indexed file for ${route}.`);
      indexedPages += 1;
    }
    if (indexedPages !== 211) {
      throw new Error(`Pagefind indexed ${indexedPages} documents; expected 211.`);
    }

    const written = await index.writeFiles({ outputPath: temporaryDirectory });
    requireNoErrors(written.errors, "Pagefind could not write the search bundle");
    await rename(temporaryDirectory, outputDirectory);

    const result = await validateBuiltSearch({ siteDirectory });
    console.log(
      `Pagefind search built atomically: ${result.pages} documents in ${result.bundleFiles} files.`,
    );
    return result;
  } catch (error) {
    await Promise.all([
      rm(temporaryDirectory, { force: true, recursive: true }),
      rm(outputDirectory, { force: true, recursive: true }),
    ]);
    throw error;
  } finally {
    if (index) await index.deleteIndex();
    await pagefind.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildSearch().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
