#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

expected_ruby="$(tr -d '[:space:]' < .ruby-version)"
expected_node_major="$(tr -d '[:space:]' < .node-version)"
expected_npm_major=10
expected_bundler="$(awk '/^BUNDLED WITH$/ { getline; gsub(/[[:space:]]/, ""); print; exit }' Gemfile.lock)"

if [[ -z "$expected_ruby" || -z "$expected_node_major" || -z "$expected_bundler" ]]; then
  echo "Could not read the pinned container runtime versions."
  exit 1
fi

if ! actual_ruby="$(ruby -e 'print RUBY_VERSION' 2>/dev/null)"; then
  echo "Ruby $expected_ruby is required, but ruby is not callable."
  exit 1
fi

if [[ "$actual_ruby" != "$expected_ruby" ]]; then
  echo "Ruby $expected_ruby is required; found $actual_ruby."
  exit 1
fi

if ! actual_node_major="$(node --version 2>/dev/null | sed 's/^v//' | cut -d. -f1)"; then
  echo "Node $expected_node_major is required, but node is not callable."
  exit 1
fi

if [[ "$actual_node_major" != "$expected_node_major" ]]; then
  echo "Node $expected_node_major is required; found $actual_node_major."
  exit 1
fi

if ! actual_npm_major="$(npm --version 2>/dev/null | cut -d. -f1)"; then
  echo "npm $expected_npm_major is required, but npm is not callable."
  exit 1
fi

if [[ "$actual_npm_major" != "$expected_npm_major" ]]; then
  echo "npm $expected_npm_major is required; found $actual_npm_major."
  exit 1
fi

available_bundler="$(ruby -rrubygems -e 'versions = Gem::Specification.find_all_by_name("bundler").map(&:version); print(versions.max || "none")' 2>/dev/null || true)"

if ! pinned_bundler_output="$(bundle _"${expected_bundler}"_ --version 2>/dev/null)"; then
  echo "Bundler $expected_bundler is required; found ${available_bundler:-none}, but the pinned version is not callable."
  exit 1
fi

actual_bundler="$(printf '%s\n' "$pinned_bundler_output" | awk '{ print $3 }')"

if [[ "$actual_bundler" != "$expected_bundler" ]]; then
  echo "Bundler $expected_bundler is required; found $actual_bundler."
  exit 1
fi

export BUNDLE_PATH="${BUNDLE_PATH:-/usr/local/bundle}"
mkdir -p "$BUNDLE_PATH" node_modules

make_cache_writable() {
  find "$BUNDLE_PATH" node_modules -user "$(id -u)" -exec chmod a+rwX {} +
}

if bundle _"${expected_bundler}"_ check; then
  echo "Ruby dependencies are already installed."
else
  bundle _"${expected_bundler}"_ install
  make_cache_writable
fi

npm_stamp="node_modules/.jakeberv-npm-inputs.sha256"
npm_tree_stamp="node_modules/.jakeberv-npm-tree.sha256"
npm_inputs_hash="$(sha256sum package.json package-lock.json | sha256sum | awk '{ print $1 }')"
installed_npm_inputs=""
installed_npm_tree=""

if [[ -r "$npm_stamp" ]]; then
  IFS= read -r installed_npm_inputs < "$npm_stamp" || installed_npm_inputs=""
fi

if [[ -r "$npm_tree_stamp" ]]; then
  IFS= read -r installed_npm_tree < "$npm_tree_stamp" || installed_npm_tree=""
fi

npm_tree_hash() {
  node - <<'NODE'
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = "node_modules";
const excluded = new Set([
  ".jakeberv-npm-inputs.sha256",
  ".jakeberv-npm-tree.sha256",
]);
const hash = createHash("sha256");

function record(value) {
  hash.update(value);
  hash.update("\0");
}

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0))) {
    const fullPath = path.join(directory, entry.name);
    const relativePath = path.relative(root, fullPath);

    if (excluded.has(relativePath)) continue;

    const stats = fs.lstatSync(fullPath);
    if (stats.isDirectory()) {
      record(`directory:${relativePath}`);
      visit(fullPath);
    } else if (stats.isSymbolicLink()) {
      record(`symlink:${relativePath}`);
      record(fs.readlinkSync(fullPath));
    } else if (stats.isFile()) {
      record(`file:${relativePath}`);
      hash.update(fs.readFileSync(fullPath));
      hash.update("\0");
    }
  }
}

visit(root);
process.stdout.write(hash.digest("hex"));
NODE
}

current_npm_tree=""
if ! current_npm_tree="$(npm_tree_hash 2>/dev/null)"; then
  current_npm_tree=""
fi

if [[ "$installed_npm_inputs" != "$npm_inputs_hash" ]] \
  || [[ "$installed_npm_tree" != "$current_npm_tree" ]] \
  || ! npm ls --all --ignore-scripts >/dev/null 2>&1; then
  npm ci
  current_npm_tree="$(npm_tree_hash)"
  printf '%s\n' "$npm_inputs_hash" > "$npm_stamp"
  printf '%s\n' "$current_npm_tree" > "$npm_tree_stamp"
  make_cache_writable
else
  echo "npm dependencies are already installed."
fi
