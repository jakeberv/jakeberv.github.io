import assert from "node:assert/strict";
import test from "node:test";

const contract = await import("./search-built-contract.mjs");

const expectedTypeCounts = {
  News: 171,
  Publications: 27,
  Research: 5,
  Software: 1,
  Talks: 2,
  Teaching: 1,
  Pages: 4,
};

function page(type, title = "Example") {
  return `<!doctype html><html><head>
    <meta data-pagefind-meta="title[content]" content="${title}">
    <meta data-pagefind-meta="description[content]" content="Search description">
    <meta data-pagefind-meta="canonical_url[content]" content="https://example.test/page/">
    <meta data-pagefind-meta="type[content]" data-pagefind-filter="type[content]" content="${type}">
  </head><body><main data-pagefind-body>Meaningful content</main></body></html>`;
}

test("the built-search validator accepts exact routes and content types", () => {
  const expectedRoutes = [];
  const pages = new Map();
  for (const [type, count] of Object.entries(expectedTypeCounts)) {
    for (let index = 0; index < count; index += 1) {
      const route = `${type.toLowerCase()}/${index}/index.html`;
      expectedRoutes.push(route);
      pages.set(route, page(type, `${type} ${index}`));
    }
  }

  const result = contract.validateSearchPages({ pages, expectedRoutes, expectedTypeCounts });
  assert.equal(result.pages, 211);
  assert.deepEqual(result.typeCounts, expectedTypeCounts);
});

test("the built-search validator rejects route, marker, metadata, and type drift", () => {
  assert.throws(
    () => contract.validateSearchPages({
      pages: new Map([["unexpected/index.html", page("Pages")]]),
      expectedRoutes: ["expected/index.html"],
      expectedTypeCounts: { Pages: 1 },
    }),
    /missing HTML route required by search: expected\/index\.html[\s\S]+unexpected searchable route/,
  );
  assert.throws(
    () => contract.validateSearchPages({
      pages: new Map([["index.html", "<html><body>No marker</body></html>"]]),
      expectedRoutes: ["index.html"],
      expectedTypeCounts: { Pages: 1 },
    }),
    /missing data-pagefind-body[\s\S]+missing Pagefind title metadata[\s\S]+missing Pagefind type metadata/,
  );
  assert.throws(
    () => contract.validateSearchPages({
      pages: new Map([["index.html", page("Unknown")]]),
      expectedRoutes: ["index.html"],
      expectedTypeCounts: { Pages: 1 },
    }),
    /unsupported search type "Unknown"[\s\S]+search type count Pages: expected 1, found 0/,
  );
});

test("the Pagefind bundle inventory requires component assets and forbids playground output", () => {
  const valid = [
    "pagefind/pagefind.js",
    "pagefind/pagefind-component-ui.js",
    "pagefind/pagefind-component-ui.css",
    "pagefind/pagefind-entry.json",
    "pagefind/pagefind.en_abc.pf_meta",
    "pagefind/pagefind.en_abc.pf_index",
    "pagefind/fragment/en/abc.pf_fragment",
    "pagefind/wasm.en.pagefind",
  ];
  const entrySource = JSON.stringify({
    version: "1.5.2",
    languages: { en: { page_count: 211 } },
  });
  assert.equal(contract.validatePagefindInventory(valid, { entrySource }).files, valid.length);
  assert.throws(
    () => contract.validatePagefindInventory(
      valid.filter((file) => !file.endsWith("component-ui.css")),
      { entrySource },
    ),
    /missing Pagefind component stylesheet/,
  );
  assert.throws(
    () => contract.validatePagefindInventory(
      [...valid, "pagefind/playground/index.html"],
      { entrySource },
    ),
    /Pagefind playground must not be deployed/,
  );
  assert.throws(
    () => contract.validatePagefindInventory(valid, {
      entrySource: JSON.stringify({
        version: "1.5.2",
        languages: { en: { page_count: 208 } },
      }),
    }),
    /Pagefind indexed-page count: expected 211, found 208/,
  );
});
