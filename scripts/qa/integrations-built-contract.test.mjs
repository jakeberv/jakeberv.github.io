import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const modulePath = path.join(repoRoot, "scripts/qa/integrations-built-contract.mjs");
let validateBuiltIntegrations;
let parseArguments;
let readConfiguredGa4Id;

try {
  ({ parseArguments, readConfiguredGa4Id, validateBuiltIntegrations } = await import(pathToFileURL(modulePath)));
} catch {
  parseArguments = undefined;
  readConfiguredGa4Id = undefined;
  validateBuiltIntegrations = undefined;
}

function sharedPage({ ga4Id = "", share = true } = {}) {
  const analytics = `
    <script data-goatcounter="https://jakeberv.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
    ${ga4Id ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${ga4Id}"></script><script>gtag('config', '${ga4Id}');</script>` : ""}
    <script type="module" src="/assets/js/main.min.js"></script>`;
  const sharing = share ? `
    <section class="page__share"><div class="page__share-links">
      <a href="https://bsky.app/intent/compose?text=Example%20https%3A%2F%2Fexample.test%2Fpage%2F">Bluesky</a>
      <a href="https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fexample.test%2Fpage%2F">Facebook</a>
      <a href="https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fexample.test%2Fpage%2F">LinkedIn</a>
      <a href="https://www.addtoany.com/add_to/mastodon?linkurl=https%3A%2F%2Fexample.test%2Fpage%2F&amp;linkname=Example">Mastodon</a>
      <a href="https://x.com/intent/post?text=Example&amp;url=https%3A%2F%2Fexample.test%2Fpage%2F">X</a>
    </div></section>` : "";

  return `<!doctype html><html><body><a href="https://x.com/jakeberv">X</a>${sharing}${analytics}</body></html>`;
}

async function withSite(files, callback) {
  const root = await mkdtemp(path.join(os.tmpdir(), "phase10-integrations-"));
  try {
    for (const [relativePath, source] of Object.entries(files)) {
      const target = path.join(root, relativePath);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, source, "utf8");
    }
    return await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("the rendered integration validator is importable", () => {
  assert.equal(typeof validateBuiltIntegrations, "function");
  assert.equal(typeof parseArguments, "function");
  assert.equal(typeof readConfiguredGa4Id, "function");
});

test("the production validator reads the configured GA4 ID by default", async () => {
  assert.equal(typeof readConfiguredGa4Id, "function");
  if (!readConfiguredGa4Id) return;

  assert.equal(await readConfiguredGa4Id(), "G-ST9SHH1H5R");
});

test("CLI arguments require explicit paths and valid-looking GA4 IDs", () => {
  assert.equal(typeof parseArguments, "function");
  if (!parseArguments) return;

  assert.throws(() => parseArguments(["--site-dir"]), /--site-dir requires a value/);
  assert.throws(() => parseArguments(["--ga4-id", "UA-LEGACY"]), /GA4 ID must match G-/);
  assert.throws(() => parseArguments(["--unknown"]), /Unknown argument/);
  assert.deepEqual(parseArguments(["--site-dir", "/tmp/site", "--ga4-id", "G-TEST123456"]), {
    siteDirectory: "/tmp/site",
    expectedGa4Id: "G-TEST123456",
  });
});

test("default production output requires GoatCounter and forbids GA4", async () => {
  assert.equal(typeof validateBuiltIntegrations, "function");
  if (!validateBuiltIntegrations) return;

  await withSite({ "index.html": sharedPage() }, async (siteDirectory) => {
    const result = await validateBuiltIntegrations({ siteDirectory });
    assert.deepEqual(result, { htmlFiles: 1, sharedPages: 1, sharePages: 1, ga4Pages: 0 });
  });
});

test("X profile validation accepts configured handles but not share intents", async () => {
  assert.equal(typeof validateBuiltIntegrations, "function");
  if (!validateBuiltIntegrations) return;

  const renamedProfile = sharedPage().replace("https://x.com/jakeberv", "https://x.com/renamed-profile");
  await withSite({ "index.html": renamedProfile }, async (siteDirectory) => {
    await validateBuiltIntegrations({ siteDirectory });
  });

  const shareIntentOnly = sharedPage().replace('<a href="https://x.com/jakeberv">X</a>', "");
  await withSite({ "index.html": shareIntentOnly }, async (siteDirectory) => {
    await assert.rejects(
      validateBuiltIntegrations({ siteDirectory }),
      /index\.html: shared footer\/profile X link is missing/,
    );
  });
});

test("a GA4 fixture requires one matching loader and configuration", async () => {
  assert.equal(typeof validateBuiltIntegrations, "function");
  if (!validateBuiltIntegrations) return;

  await withSite({ "index.html": sharedPage({ ga4Id: "G-TEST123456" }) }, async (siteDirectory) => {
    const result = await validateBuiltIntegrations({ siteDirectory, expectedGa4Id: "G-TEST123456" });
    assert.equal(result.ga4Pages, 1);
  });
});

test("analytics duplication and unexpected GA4 output fail with file diagnostics", async () => {
  assert.equal(typeof validateBuiltIntegrations, "function");
  if (!validateBuiltIntegrations) return;

  const duplicateGoat = sharedPage().replace("</body>", '<script data-goatcounter="duplicate"></script></body>');
  await withSite({ "nested/page.html": duplicateGoat }, async (siteDirectory) => {
    await assert.rejects(
      validateBuiltIntegrations({ siteDirectory }),
      /nested\/page\.html: expected exactly one GoatCounter loader, found 2/,
    );
  });

  await withSite({ "index.html": sharedPage({ ga4Id: "G-UNEXPECTED" }) }, async (siteDirectory) => {
    await assert.rejects(
      validateBuiltIntegrations({ siteDirectory }),
      /index\.html: GA4 output is disabled but a loader or configuration was rendered/,
    );
  });
});

test("share pages require all modern actions in stable order", async () => {
  assert.equal(typeof validateBuiltIntegrations, "function");
  if (!validateBuiltIntegrations) return;

  const missingMastodon = sharedPage().replace(/<a href="https:\/\/www\.addtoany\.com[\s\S]*?<\/a>/, "");
  await withSite({ "index.html": missingMastodon }, async (siteDirectory) => {
    await assert.rejects(
      validateBuiltIntegrations({ siteDirectory }),
      /index\.html: missing or out-of-order share action .*addtoany\.com\/add_to\/mastodon/,
    );
  });

  const relativeUrls = sharedPage().replaceAll("https%3A%2F%2Fexample.test%2Fpage%2F", "%2Fpage%2F");
  await withSite({ "index.html": relativeUrls }, async (siteDirectory) => {
    await assert.rejects(
      validateBuiltIntegrations({ siteDirectory }),
      /index\.html: share actions must use encoded absolute URLs/,
    );
  });
});
