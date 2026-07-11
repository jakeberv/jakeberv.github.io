import assert from "node:assert/strict";
import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

async function source(filePath) {
  return readFile(path.join(repositoryRoot, filePath), "utf8");
}

function matchIndex(text, pattern, description) {
  const match = text.match(pattern);
  assert.ok(match, description);
  return match.index;
}

function yamlBlock(sourceText, key, indent = 0) {
  const lines = sourceText.split(/\r?\n/);
  const indentation = " ".repeat(indent);
  const start = lines.findIndex((line) => line === `${indentation}${key}:`);
  assert.notEqual(start, -1, `docker-compose.yaml must define ${key}`);

  const block = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line && !line.startsWith(" ".repeat(indent + 1))) break;
    block.push(line);
  }
  return block.join("\n");
}

function commandSegments(command) {
  return command
    .split(/\s*&&\s*/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function devContainerComposeFiles(devcontainer) {
  return Array.isArray(devcontainer.dockerComposeFile)
    ? devcontainer.dockerComposeFile
    : [devcontainer.dockerComposeFile];
}

function localDevContainerComposeOverride(devcontainer) {
  const override = devContainerComposeFiles(devcontainer).find((file) => (
    typeof file === "string" && !file.startsWith("../")
  ));

  assert.ok(
    override,
    "dockerComposeFile must include a Compose override stored in .devcontainer",
  );

  const overridePath = path.posix.normalize(path.posix.join(".devcontainer", override));
  assert.ok(
    overridePath.startsWith(".devcontainer/"),
    "the Dev Container Compose override must remain inside .devcontainer",
  );
  return overridePath;
}

test("the Docker image builds Node 20 into Ruby 3.3.4 and runs as vscode", async () => {
  const dockerfile = await source("Dockerfile");
  const nodeStage = dockerfile.match(/^FROM\s+node:20[^\s]*\s+AS\s+([a-z0-9_-]+)\s*$/im);
  const rubyStageIndex = matchIndex(
    dockerfile,
    /^FROM\s+ruby:3\.3\.4(?:[^\s]*)?(?:\s+AS\s+[a-z0-9_-]+)?\s*$/im,
    "Dockerfile must start its runtime stage from Ruby 3.3.4",
  );

  assert.ok(nodeStage, "Dockerfile must define a named Node 20 build stage");
  assert.ok(nodeStage.index < rubyStageIndex, "the Node 20 stage must precede the Ruby 3.3.4 runtime stage");
  assert.match(
    dockerfile.slice(rubyStageIndex),
    new RegExp(`COPY\\s+--from=${nodeStage[1]}\\s+`, "i"),
  );
  assert.match(dockerfile, /gem\s+install\s+bundler[^\n]*(?:--version|-v)(?:=|\s+)2\.5\.18\b/i);
  assert.match(
    dockerfile,
    /(?:test|\[)\s+["']?\$\(npm\s+--version\s*\|\s*(?:cut|awk|sed)[^)]*\)["']?\s*(?:=|==|-eq)\s*["']?10["']?/i,
  );
  assert.match(dockerfile, /\bpython3\b/);
  assert.match(dockerfile, /\bgit\b/);
  assert.match(dockerfile, /\bbuild-essential\b/);
  assert.match(dockerfile, /\bca-certificates\b/);
  assert.match(dockerfile, /(?:useradd|adduser)[^\n]*\bvscode\b/i);
  assert.match(dockerfile, /^\s*USER\s+vscode\s*$/m);
  assert.match(dockerfile, /^\s*WORKDIR\s+\/workspace\s*$/m);
  assert.match(dockerfile, /BUNDLE_PATH\s*(?:=|\s+)\/?usr\/local\/bundle/);
});

test("the Docker build context excludes generated, cached, and local artifacts", async () => {
  const dockerignore = await source(".dockerignore");
  const entries = new Set(
    dockerignore
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter((entry) => entry && !entry.startsWith("#")),
  );

  for (const expected of [
    ".git",
    "_site",
    "node_modules",
    ".bundle",
    "vendor/bundle",
    "vendor/cache",
    ".RData",
    "*_artifacts",
  ]) {
    assert.ok(entries.has(expected), `.dockerignore must exclude ${expected}`);
  }
});

test("container bootstrap validates the pinned runtime before installing local dependencies", async () => {
  const [bootstrap, rubyVersion, nodeVersion, gemfileLock] = await Promise.all([
    source("scripts/container_bootstrap.command"),
    source(".ruby-version"),
    source(".node-version"),
    source("Gemfile.lock"),
  ]);
  const dependencySetupIndex = Math.min(
    matchIndex(bootstrap, /bundle\s+_[^\s]+_\s+install/, "bootstrap must run bundle install"),
    matchIndex(bootstrap, /npm\s+ci/, "bootstrap must run npm ci"),
  );
  const versionSourceIndexes = [
    matchIndex(bootstrap, /(?:expected|required)_ruby\s*=\s*[\s\S]{0,160}\.ruby-version/i, "bootstrap must read .ruby-version into its expected Ruby version"),
    matchIndex(bootstrap, /(?:expected|required)_node(?:_major)?\s*=\s*[\s\S]{0,160}\.node-version/i, "bootstrap must read .node-version into its expected Node version"),
    matchIndex(bootstrap, /(?:expected|required)_bundler\s*=\s*[\s\S]{0,240}Gemfile\.lock/i, "bootstrap must read Gemfile.lock into its expected Bundler version"),
  ];
  const comparisonIndexes = [
    matchIndex(bootstrap, /(?:actual|current)_ruby[^\n]*(?:!=|-ne)[^\n]*(?:expected|required)_ruby/i, "bootstrap must compare the active Ruby version exactly"),
    matchIndex(bootstrap, /(?:actual|current)_node_major[^\n]*(?:!=|-ne)[^\n]*(?:expected|required)_node_major/i, "bootstrap must compare the active Node major exactly"),
    matchIndex(bootstrap, /(?:actual|current)_npm_major[^\n]*(?:!=|-ne)[^\n]*(?:expected|required)_npm_major/i, "bootstrap must compare the active npm major exactly"),
    matchIndex(bootstrap, /(?:actual|current)_bundler[^\n]*(?:!=|-ne)[^\n]*(?:expected|required)_bundler/i, "bootstrap must compare the active Bundler version exactly"),
  ];

  assert.equal(rubyVersion.trim(), "3.3.4");
  assert.equal(nodeVersion.trim(), "20");
  assert.match(gemfileLock, /^BUNDLED WITH\s*\n\s*2\.5\.18\s*$/m);
  assert.match(bootstrap, /ruby\s+-e\s+['"][^'"]*RUBY_VERSION/);
  assert.match(bootstrap, /node\s+--version/);
  assert.match(bootstrap, /npm\s+--version/);
  assert.match(bootstrap, /(?:expected|required)_npm_major\s*=\s*10/i);
  assert.match(bootstrap, /bundle\s+_[^\s]+_\s+--version/);
  assert.match(bootstrap, /bundle\s+_[^\s]+_\s+check/);
  for (const index of [...versionSourceIndexes, ...comparisonIndexes]) {
    assert.ok(index < dependencySetupIndex, "runtime sources and comparisons must precede dependency installation");
  }
  assert.doesNotMatch(bootstrap, /\bsudo\b/);
  assert.doesNotMatch(bootstrap, /\bgem\s+install\b/);
  assert.doesNotMatch(bootstrap, /\bnpm\s+(?:install|i)\s+(?:--global|-g)\b/);
  assert.doesNotMatch(bootstrap, /\bnpm\s+(?:install|i)\s+\S+\s+(?:--global|-g)\b/);
});

test("Compose isolates dependencies and delegates the portable preview", async () => {
  const compose = await source("docker-compose.yaml");
  const services = yamlBlock(compose, "services");
  const site = yamlBlock(services, "site", 2);
  const volumes = yamlBlock(compose, "volumes");
  const bundleVolume = site.match(/-\s*([a-z0-9_-]+):\/usr\/local\/bundle/i)?.[1];
  const nodeModulesVolume = site.match(/-\s*([a-z0-9_-]+):\/workspace\/node_modules/i)?.[1];

  assert.match(
    site,
    /(?:^|\n)\s{4}build:\s*\.(?:\s*(?:#.*)?)?$|(?:^|\n)\s{4}build:\s*\n(?:\s{6}[^\n]*\n)*?\s{6}context:\s*\.(?:\s*(?:#.*)?)?$/m,
  );
  assert.match(site, /-\s*["']?4001:4001(?:\/[a-z]+)?["']?/);
  assert.match(site, /-\s*\.\s*:\s*\/workspace/);
  assert.doesNotMatch(site, /^\s{4}user:\s*["']?(?:root|0)(?::[^"'\s#]+)?["']?\s*(?:#.*)?$/mi);
  assert.ok(bundleVolume, "services.site must mount a named Bundler volume");
  assert.ok(nodeModulesVolume, "services.site must mount a named node_modules volume");
  assert.match(volumes, new RegExp(`^  ${bundleVolume}:\\s*(?:\\{\\})?\\s*$`, "m"));
  assert.match(volumes, new RegExp(`^  ${nodeModulesVolume}:\\s*(?:\\{\\})?\\s*$`, "m"));
  assert.match(
    site,
    /container_bootstrap\.command[\s\S]*local_preview\.command\s+--full-build\s+--skip-data\s+--port\s+4001/,
  );
  const healthcheckMatch = site.match(
    /healthcheck:\s*\n\s+test:\s*\["CMD-SHELL", "((?:\\.|[^"])*)"\]/,
  );
  assert.ok(healthcheckMatch, "services.site must define a shell healthcheck command");
  const healthcheck = healthcheckMatch[1];

  assert.match(healthcheck, /\bpython3\s+-c\b/);
  assert.match(
    healthcheck,
    /urlopen\(\s*['"]http:\/\/127\.0\.0\.1:4001\/[^"]*['"][^)]*timeout\s*=\s*2\b/,
    "the healthcheck must target 127.0.0.1:4001 with a timeout",
  );
  assert.match(
    healthcheck,
    /\bresponse\.read\(\)/,
    "the healthcheck must consume the response body",
  );
  assert.ok(
    /with\s+urlopen\([^)]*\)\s+as\s+response\s*:/.test(healthcheck)
      || /\bresponse\s*=\s*urlopen\([^)]*\)[\s\S]*\bresponse\.close\(\)/.test(healthcheck),
    "the healthcheck must close the response via a context manager or response.close()",
  );
});

test("Compose passes host UID and GID defaults into the Docker build", async () => {
  const compose = await source("docker-compose.yaml");
  const services = yamlBlock(compose, "services");
  const site = yamlBlock(services, "site", 2);
  assert.match(
    site,
    /^\s{4}build:\s*$/m,
    "services.site.build must be a mapping so it can supply host UID/GID arguments",
  );
  const build = yamlBlock(site, "build", 4);
  const buildArgs = yamlBlock(build, "args", 6);

  assert.match(build, /^\s{6}context:\s*\.\s*$/m);
  for (const variable of ["USER_UID", "USER_GID"]) {
    assert.match(
      buildArgs,
      new RegExp(
        `^\\s{8}${variable}:\\s*["']?\\$\\{${variable}(?::-|-)1000\\}["']?\\s*$`,
        "m",
      ),
      `services.site.build.args.${variable} must use ${variable} with a 1000 default`,
    );
  }
});

test("the Dockerfile keeps Dev Container remap-safe write access to cache paths only", async () => {
  const dockerfile = await source("Dockerfile");
  const flattenedDockerfile = dockerfile.replace(/\\\s*\r?\n\s*/g, " ");
  const writableMode = /\bchmod\s+(?:-\S+\s+)*(?:0?777|[augo]*\+rwx)\b/i;
  const chmodCommands = flattenedDockerfile.match(/\bchmod\b[^;&\n]*/g) ?? [];
  const writableCommands = chmodCommands.filter((command) => writableMode.test(command));
  const cachePermissionCommand = writableCommands.find((command) => (
    /(?:^|\s)["']?(?:\/usr\/local\/bundle|\$\{BUNDLE_PATH\}|\$BUNDLE_PATH)["']?(?=\s|$)/.test(command)
    && /(?:^|\s)["']?\/workspace\/node_modules["']?(?=\s|$)/.test(command)
  ));

  assert.ok(
    cachePermissionCommand,
    "Dockerfile must grant chmod 0777 or equivalent to only /usr/local/bundle and /workspace/node_modules",
  );
  assert.ok(
    matchIndex(dockerfile, /(?:useradd|adduser)[^\n]*\bvscode\b/i, "Dockerfile must create vscode")
      < matchIndex(dockerfile, writableMode, "Dockerfile must set remap-safe cache permissions"),
    "cache permissions must be set after the Dev Container user is created",
  );
  assert.doesNotMatch(
    flattenedDockerfile,
    /\bchmod\s+(?:-\S+\s+)*(?:0?777|[augo]*\+rwx)\s+["']?(?:\/workspace\/?|\.\/?|(?:\.\/)?(?:repository|repo)|\/workspace\/(?:repository|repo))["']?(?=\s|$)/i,
    "Dockerfile must not recursively make the workspace or repository world writable",
  );
});

test("the Pages artifact excludes container tooling", async () => {
  const config = await source("_config.yml");
  const artifactExclusions = new Set(
    yamlBlock(config, "exclude")
      .split(/\r?\n/)
      .map((line) => line.trim().replace(/^-\s*/, ""))
      .filter(Boolean),
  );

  for (const path of ["Dockerfile", "docker-compose.yaml", ".devcontainer"]) {
    assert.ok(artifactExclusions.has(path), `_config.yml must exclude ${path} from the Pages artifact`);
  }
});

test("the Dev Container lifecycle cannot race the Compose service command", async () => {
  const devcontainer = JSON.parse(await source(".devcontainer/devcontainer.json"));
  const composeFiles = Array.isArray(devcontainer.dockerComposeFile)
    ? devcontainer.dockerComposeFile
    : [devcontainer.dockerComposeFile];

  assert.ok(composeFiles.includes("../docker-compose.yaml"));
  assert.equal(devcontainer.service, "site");
  assert.equal(devcontainer.workspaceFolder, "/workspace");
  assert.equal(devcontainer.remoteUser, "vscode");
  assert.ok(devcontainer.forwardPorts.includes(4001));
  assert.equal(devcontainer.overrideCommand, true);
  assert.equal(devcontainer.postCreateCommand, "./scripts/container_bootstrap.command");
});

test("the Dev Container composes the base service with a local lifecycle override", async () => {
  const devcontainer = JSON.parse(await source(".devcontainer/devcontainer.json"));
  const composeFiles = devContainerComposeFiles(devcontainer);

  assert.ok(composeFiles.includes("../docker-compose.yaml"));
  localDevContainerComposeOverride(devcontainer);
  assert.equal(devcontainer.service, "site");
  assert.equal(devcontainer.overrideCommand, true);
  assert.equal(devcontainer.remoteUser, "vscode");
  assert.equal(devcontainer.postCreateCommand, "./scripts/container_bootstrap.command");
});

test("the Dev Container override disables only the inherited site healthcheck", async () => {
  const [baseCompose, devcontainer] = await Promise.all([
    source("docker-compose.yaml"),
    source(".devcontainer/devcontainer.json").then(JSON.parse),
  ]);
  const override = await source(localDevContainerComposeOverride(devcontainer));
  const baseSite = yamlBlock(yamlBlock(baseCompose, "services"), "site", 2);
  const overrideSite = yamlBlock(yamlBlock(override, "services"), "site", 2);

  assert.match(baseSite, /^\s{4}healthcheck:\s*$/m, "base Compose must retain the site healthcheck");
  assert.doesNotMatch(baseSite, /^\s{6}disable:\s*true\s*$/m);
  assert.match(
    overrideSite,
    /^\s{4}healthcheck:\s*\n\s{6}disable:\s*true\s*$/m,
    "the local Dev Container override must disable the inherited site healthcheck",
  );
});

test("the container smoke wrapper rejects root before bootstrapping and validation", async () => {
  const wrapperPath = path.join(repositoryRoot, "scripts/container_test.command");
  await access(wrapperPath, constants.X_OK);
  const wrapper = await source("scripts/container_test.command");
  const bootstrapIndex = matchIndex(
    wrapper,
    /^\s*\.\/scripts\/container_bootstrap\.command\s*$/m,
    "container smoke wrapper must invoke bootstrap directly",
  );
  const uidCheckIndex = matchIndex(
    wrapper,
    /\bid\s+-u\b[\s\S]{0,160}(?:=|==|-eq)\s*["']?0["']?[\s\S]{0,160}\bexit\b/i,
    "container smoke wrapper must reject UID 0",
  );
  const npmTestIndex = matchIndex(wrapper, /^\s*npm\s+test\s*$/m, "container smoke wrapper must run npm test");
  const themeTestIndex = matchIndex(wrapper, /^\s*npm\s+run\s+test:themes\s*$/m, "container smoke wrapper must run npm run test:themes");
  const previewIndex = matchIndex(
    wrapper,
    /^\s*\.\/scripts\/local_preview\.command\s+--build-only\s+--full-build\s+--skip-data\s*$/m,
    "container smoke wrapper must run the full build-only preview path",
  );

  assert.ok(
    uidCheckIndex < bootstrapIndex
      && bootstrapIndex < npmTestIndex
      && npmTestIndex < themeTestIndex
      && themeTestIndex < previewIndex,
    "container smoke wrapper must reject root, bootstrap, then validate in order",
  );
});

test("npm exposes the container checks without adding dependencies", async () => {
  const [packageDefinition, packageLock] = await Promise.all([
    source("package.json").then(JSON.parse),
    source("package-lock.json").then(JSON.parse),
  ]);
  const lockRoot = packageLock.packages?.[""];

  assert.equal(
    packageDefinition.scripts["check:container"],
    "node --test scripts/qa/container-contract.test.mjs",
  );
  const testSegments = commandSegments(packageDefinition.scripts.test);
  assert.ok(
    testSegments.some((segment) => (
      segment === "npm run check:container"
      || (/^node\s+--test(?:\s|$)/.test(segment)
        && /\bscripts\/qa\/container-contract\.test\.mjs\b/.test(segment))
    )),
    "npm test must directly run check:container or the container contract test",
  );
  assert.doesNotMatch(packageDefinition.scripts["check:container"], /\bdocker\b/i);
  assert.equal(
    packageDefinition.scripts["test:container"],
    "npm run check:container && docker compose build && docker compose run --rm site ./scripts/container_test.command",
  );
  assert.deepEqual(packageDefinition.dependencies, { jquery: "3.7.1" });
  assert.deepEqual(packageDefinition.devDependencies, {
    onchange: "7.1.0",
    "uglify-js": "3.19.3",
  });
  assert.deepEqual(packageDefinition.engines, { node: "20.x", npm: ">=10 <11" });
  assert.ok(lockRoot, "package-lock.json must contain root package metadata");
  assert.equal(lockRoot.name, packageDefinition.name);
  assert.equal(lockRoot.version, packageDefinition.version);
  assert.deepEqual(lockRoot.dependencies, packageDefinition.dependencies);
  assert.deepEqual(lockRoot.devDependencies, packageDefinition.devDependencies);
  assert.deepEqual(lockRoot.engines, packageDefinition.engines);
});
