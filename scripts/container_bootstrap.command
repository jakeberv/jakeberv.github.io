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

actual_ruby="$(ruby -e 'print RUBY_VERSION')"
actual_node_major="$(node --version | sed 's/^v//' | cut -d. -f1)"
actual_npm_major="$(npm --version | cut -d. -f1)"
actual_bundler="$(bundle _"${expected_bundler}"_ --version | awk '{ print $3 }')"

if [[ "$actual_ruby" != "$expected_ruby" ]]; then
  echo "Ruby $expected_ruby is required; found $actual_ruby."
  exit 1
fi

if [[ "$actual_node_major" != "$expected_node_major" ]]; then
  echo "Node $expected_node_major is required; found $actual_node_major."
  exit 1
fi

if [[ "$actual_npm_major" != "$expected_npm_major" ]]; then
  echo "npm $expected_npm_major is required; found $actual_npm_major."
  exit 1
fi

if [[ "$actual_bundler" != "$expected_bundler" ]]; then
  echo "Bundler $expected_bundler is required; found $actual_bundler."
  exit 1
fi

if bundle _"${expected_bundler}"_ check; then
  echo "Ruby dependencies are already installed."
else
  bundle _"${expected_bundler}"_ install
fi

npm ci
