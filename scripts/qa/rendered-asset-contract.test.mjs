import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const contract = await import("./rendered-asset-contract.mjs");

async function fixture(t) {
  const siteDirectory = await mkdtemp(path.join(os.tmpdir(), "rendered-assets-"));
  t.after(() => rm(siteDirectory, { recursive: true, force: true }));
  await Promise.all([
    mkdir(path.join(siteDirectory, "assets/css"), { recursive: true }),
    mkdir(path.join(siteDirectory, "assets/fonts"), { recursive: true }),
    mkdir(path.join(siteDirectory, "images/research"), { recursive: true }),
    mkdir(path.join(siteDirectory, "images"), { recursive: true }),
    mkdir(path.join(siteDirectory, "about"), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(path.join(siteDirectory, "about/index.html"), "<!doctype html>\n", "utf8"),
    writeFile(path.join(siteDirectory, "assets/fonts/site.woff2"), "font", "utf8"),
    writeFile(
      path.join(siteDirectory, "assets/css/main.css"),
      "@font-face{src:url('../fonts/site.woff2?v=1')}\n",
      "utf8",
    ),
    writeFile(path.join(siteDirectory, "images/research/Darwin's tree.png"), "image", "utf8"),
    writeFile(path.join(siteDirectory, "images/icon-192.png"), "icon", "utf8"),
    writeFile(path.join(siteDirectory, "images/tile-150.png"), "tile", "utf8"),
    writeFile(
      path.join(siteDirectory, "images/browserconfig.xml"),
      '<browserconfig><square150x150logo src="/images/tile-150.png"/></browserconfig>\n',
      "utf8",
    ),
    writeFile(
      path.join(siteDirectory, "images/manifest.json"),
      JSON.stringify({ icons: [{ src: "/images/icon-192.png", sizes: "192x192" }] }),
      "utf8",
    ),
  ]);
  return siteDirectory;
}

test("rendered assets resolve relative, pretty, encoded, and same-origin references", async (t) => {
  const siteDirectory = await fixture(t);
  await writeFile(
    path.join(siteDirectory, "index.html"),
    `<!doctype html>
<link rel="stylesheet" href="/assets/css/main.css?v=1">
<link rel="manifest" href="/images/manifest.json">
<meta name="msapplication-TileImage" content="/images/tile-150.png">
<meta name="msapplication-config" content="/images/browserconfig.xml">
<img src="/images/research/Darwin's%20tree.png" alt="">
<a href="/about/#team">About</a>
<a href="https://example.test/about/">Canonical about</a>
<script type="text/pagefind-template"><a href="{{ result.url | safeUrl }}">Result</a></script>
`,
    "utf8",
  );

  const result = await contract.validateRenderedAssets({
    siteDirectory,
    siteUrl: "https://example.test",
  });
  assert.equal(result.htmlFiles, 2);
  assert.ok(result.references >= 7);
});

test("rendered assets reject missing, case-mismatched, and escaping paths", async (t) => {
  const siteDirectory = await fixture(t);
  await writeFile(
    path.join(siteDirectory, "index.html"),
    `<!doctype html>
<img src="/images/Icon-192.png" alt="">
<script src="/missing.js"></script>
<a href="../outside.html">Outside</a>
`,
    "utf8",
  );

  await assert.rejects(
    contract.validateRenderedAssets({ siteDirectory, siteUrl: "https://example.test" }),
    (error) => {
      assert.match(error.message, /case mismatch.*Icon-192\.png/i);
      assert.match(error.message, /missing local resource.*missing\.js/i);
      assert.match(error.message, /escapes site root.*outside\.html/i);
      return true;
    },
  );
});

test("rendered assets reject insecure active resources but allow ordinary HTTP links", async (t) => {
  const siteDirectory = await fixture(t);
  await writeFile(
    path.join(siteDirectory, "index.html"),
    `<!doctype html>
<script src="http://cdn.example.test/library.js"></script>
<a href="http://legacy.example.test/paper">Legacy paper</a>
`,
    "utf8",
  );

  await assert.rejects(
    contract.validateRenderedAssets({ siteDirectory, siteUrl: "https://example.test" }),
    /insecure active resource.*library\.js/i,
  );
});

test("rendered assets aggregate malformed absolute URLs with other violations", async (t) => {
  const siteDirectory = await fixture(t);
  await writeFile(
    path.join(siteDirectory, "index.html"),
    `<!doctype html>
<script src="https://[invalid.example/script.js"></script>
<script src="/missing.js"></script>
`,
    "utf8",
  );

  await assert.rejects(
    contract.validateRenderedAssets({ siteDirectory, siteUrl: "https://example.test" }),
    (error) => {
      assert.match(error.message, /malformed absolute URL.*invalid\.example/i);
      assert.match(error.message, /missing local resource.*missing\.js/i);
      return true;
    },
  );
});

test("rendered assets validate Microsoft tile metadata and browser configuration", async (t) => {
  const siteDirectory = await fixture(t);
  await writeFile(
    path.join(siteDirectory, "index.html"),
    '<meta name="msapplication-config" content="/images/missing-browserconfig.xml">\n',
    "utf8",
  );
  await writeFile(
    path.join(siteDirectory, "images/browserconfig.xml"),
    '<browserconfig><square150x150logo src="/images/missing-tile.png"/></browserconfig>\n',
    "utf8",
  );

  await assert.rejects(
    contract.validateRenderedAssets({ siteDirectory, siteUrl: "https://example.test" }),
    (error) => {
      assert.match(error.message, /missing-browserconfig\.xml/);
      assert.match(error.message, /missing-tile\.png/);
      return true;
    },
  );
});
