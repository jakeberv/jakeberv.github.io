import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { constants } from "node:fs";
import {
  access,
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const canExecuteBash = process.platform !== "win32";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

async function source(filePath) {
  return readFile(path.join(repositoryRoot, filePath), "utf8");
}

async function createCommandStubs(t, commands) {
  const binDirectory = await mkdtemp(path.join(os.tmpdir(), "container-bootstrap-bin-"));
  t.after(() => rm(binDirectory, { force: true, recursive: true }));

  await Promise.all(Object.entries(commands).map(async ([name, body]) => {
    const commandPath = path.join(binDirectory, name);
    await writeFile(commandPath, `#!/usr/bin/env bash\nset -euo pipefail\n${body}`, "utf8");
    await chmod(commandPath, 0o755);
  }));

  return binDirectory;
}

function stubPath(binDirectory) {
  return `${binDirectory}${path.delimiter}${process.env.PATH ?? ""}`;
}

function validRuntimeCommands() {
  return {
    ruby: `
if [[ "$*" == *RUBY_VERSION* ]]; then
  printf '3.3.4'
else
  printf '2.5.18'
fi
`,
    node: "printf 'v20.20.2\\n'\n",
    npm: "printf '10.8.2\\n'\n",
    bundle: `
if [[ "\${1:-}" == "_2.5.18_" && "\${2:-}" == "--version" ]]; then
  printf 'Bundler version 2.5.18\\n'
  exit 0
fi
if [[ "\${1:-}" == "_2.5.18_" && "\${2:-}" == "check" ]]; then
  if [[ "\${BUNDLE_FROZEN:-}" != "true" ]]; then
    printf 'BUNDLE_FROZEN must be true\\n' >&2
    exit 98
  fi
  exit 0
fi
exit 99
`,
  };
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
  assert.notEqual(start, -1, `YAML source must define ${key}`);

  const block = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line && !line.startsWith(" ".repeat(indent + 1))) break;
    block.push(line);
  }
  return block.join("\n");
}

test("the YAML block helper reports source-neutral missing keys", () => {
  assert.throws(
    () => yamlBlock("site_theme: default\n", "exclude"),
    (error) => {
      assert.match(error.message, /YAML source must define exclude/);
      assert.doesNotMatch(error.message, /docker-compose\.yaml/);
      return true;
    },
  );
});

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
  const bundlerInstall = dockerfile.match(/gem\s+install\s+bundler[^\n]*/i)?.[0];
  assert.ok(bundlerInstall, "Dockerfile must install the pinned Bundler runtime");
  assert.match(bundlerInstall, /(?:--version|-v)(?:=|\s+)2\.5\.18\b/i);
  assert.match(
    bundlerInstall,
    /--no-document\b/,
    "Bundler installation must omit generated documentation",
  );
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

test("the Docker user tolerates occupied host UID and GID values", async () => {
  const dockerfile = await source("Dockerfile");
  const groupCreation = dockerfile.match(/groupadd[^\n]*\bvscode\b/i)?.[0];
  const userCreation = dockerfile.match(/useradd[^\n]*\bvscode\b/i)?.[0];

  assert.ok(groupCreation, "Dockerfile must create the vscode group");
  assert.ok(userCreation, "Dockerfile must create the vscode user");
  assert.match(
    groupCreation,
    /(?:--non-unique|-o)(?:\s|$)/,
    "vscode group creation must allow an existing numeric GID",
  );
  assert.match(
    userCreation,
    /(?:--non-unique|-o)(?:\s|$)/,
    "vscode user creation must allow an existing numeric UID",
  );
  assert.match(
    dockerfile,
    /if\s+getent\s+group\s+vscode[\s\S]*?groupmod[\s\S]*?else[\s\S]*?groupadd[\s\S]*?fi/,
    "Dockerfile must update an existing vscode group instead of recreating it",
  );
  assert.match(
    dockerfile,
    /if\s+id\s+-u\s+vscode[\s\S]*?usermod[\s\S]*?else[\s\S]*?useradd[\s\S]*?fi/,
    "Dockerfile must update an existing vscode user instead of recreating it",
  );
});

test("the Docker user rejects root and invalid numeric identities", async () => {
  const dockerfile = await source("Dockerfile");
  const validationIndex = matchIndex(
    dockerfile,
    /USER_UID and USER_GID must be positive integers/,
    "Dockerfile must explain invalid UID/GID build arguments",
  );
  const userCreationIndex = matchIndex(
    dockerfile,
    /useradd[^\n]*\bvscode\b/i,
    "Dockerfile must create the vscode user",
  );

  assert.match(
    dockerfile,
    /\^\[1-9\]\[0-9\]\*:\[1-9\]\[0-9\]\*\$/,
    "Dockerfile must accept only positive integer UID:GID pairs",
  );
  assert.ok(validationIndex < userCreationIndex, "UID/GID validation must precede user creation");
});

test("the Docker image keeps all dependency-cache contents remap writable", async () => {
  const [dockerfile, bootstrap] = await Promise.all([
    source("Dockerfile"),
    source("scripts/container_bootstrap.command"),
  ]);

  assert.match(
    dockerfile,
    /chmod\s+-R\s+a\+rwX\s+["']?(?:\$\{BUNDLE_PATH\}|\$BUNDLE_PATH)["']?\s+\/workspace\/node_modules/,
    "Dockerfile must recursively preserve remap-safe write access only in dependency caches",
  );
  assert.match(
    bootstrap,
    /find\s+["']?(?:\$\{BUNDLE_PATH\}|\$BUNDLE_PATH)["']?\s+node_modules\s+-user\s+["']?\$\(id\s+-u\)["']?\s+-exec\s+chmod\s+a\+rwX/,
    "bootstrap must repair only cache entries created by the active user",
  );
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
    ".Rhistory",
    ".Rproj.user",
    ".jekyll-metadata",
    ".playwright-cli",
    ".DS_Store",
    "**/.DS_Store",
    ".env",
    ".env.*",
    "*_artifacts",
  ]) {
    assert.ok(entries.has(expected), `.dockerignore must exclude ${expected}`);
  }
});

test("container command scripts retain Linux-compatible line endings", async () => {
  const { stdout: trackedOutput } = await execFileAsync("git", ["ls-files", "*.command"], {
    cwd: repositoryRoot,
  });
  const commandFiles = trackedOutput.trim().split(/\r?\n/).filter(Boolean);
  assert.ok(commandFiles.length > 0, "repository must track container command scripts");

  const { stdout: attributesOutput } = await execFileAsync(
    "git",
    ["check-attr", "eol", "--", ...commandFiles],
    { cwd: repositoryRoot },
  );
  for (const filePath of commandFiles) {
    assert.match(attributesOutput, new RegExp(`^${filePath}: eol: lf$`, "m"));
    const script = await source(filePath);
    assert.match(script, /^#!\/usr\/bin\/env bash$/m);
    assert.doesNotMatch(script, /\r\n/, `${filePath} must use LF line endings`);
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
  assert.match(bootstrap, /^export BUNDLE_FROZEN=true$/m);
  for (const index of [...versionSourceIndexes, ...comparisonIndexes]) {
    assert.ok(index < dependencySetupIndex, "runtime sources and comparisons must precede dependency installation");
  }
  assert.doesNotMatch(bootstrap, /\bsudo\b/);
  assert.doesNotMatch(bootstrap, /\bgem\s+install\b/);
  assert.doesNotMatch(bootstrap, /\bnpm\s+(?:install|i)\s+(?:--global|-g)\b/);
  assert.doesNotMatch(bootstrap, /\bnpm\s+(?:install|i)\s+\S+\s+(?:--global|-g)\b/);
});

test("container bootstrap defaults and prepares its isolated cache paths", async () => {
  const bootstrap = await source("scripts/container_bootstrap.command");
  const cacheDefaultIndex = matchIndex(
    bootstrap,
    /^export BUNDLE_PATH="\$\{BUNDLE_PATH:-\/usr\/local\/bundle\}"$/m,
    "bootstrap must default BUNDLE_PATH to the container-only gem cache",
  );
  const cacheDirectoriesIndex = matchIndex(
    bootstrap,
    /^mkdir -p "\$BUNDLE_PATH" node_modules$/m,
    "bootstrap must ensure its isolated dependency cache directories exist",
  );
  const bundleCheckIndex = matchIndex(
    bootstrap,
    /^if bundle _"\$\{expected_bundler\}"_ check; then$/m,
    "bootstrap must check the pinned Ruby dependencies after preparing cache paths",
  );

  assert.ok(
    cacheDefaultIndex < cacheDirectoriesIndex && cacheDirectoriesIndex < bundleCheckIndex,
    "bootstrap must default and prepare cache paths before checking dependencies",
  );
});

test("container bootstrap explains when the pinned Bundler is unavailable", {
  skip: !canExecuteBash && "container bootstrap is Bash-only and executes inside Docker on Windows",
}, async (t) => {
  const commands = {
    ...validRuntimeCommands(),
    ruby: validRuntimeCommands().ruby.replace("2.5.18", "4.0.9"),
    bundle: `
if [[ "\${1:-}" == "_2.5.18_" ]]; then
  exit 1
fi
exit 99
`,
  };
  const binDirectory = await createCommandStubs(t, commands);

  await assert.rejects(
    execFileAsync("bash", ["scripts/container_bootstrap.command"], {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        PATH: stubPath(binDirectory),
      },
    }),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(
        error.stdout,
        /Bundler 2\.5\.18 is required; found 4\.0\.9, but the pinned version is not callable\./,
      );
      return true;
    },
  );
});

test("container bootstrap explains missing runtime executables", {
  skip: !canExecuteBash && "container bootstrap is Bash-only and executes inside Docker on Windows",
}, async (t) => {
  const cases = [
    ["ruby", "Ruby 3.3.4 is required, but ruby is not callable."],
    ["node", "Node 20 is required, but node is not callable."],
    ["npm", "npm 10 is required, but npm is not callable."],
  ];

  for (const [runtime, message] of cases) {
    await t.test(runtime, async (subtest) => {
      const commands = {
        ...validRuntimeCommands(),
        [runtime]: "exit 127\n",
      };
      const binDirectory = await createCommandStubs(subtest, commands);

      await assert.rejects(
        execFileAsync("bash", ["scripts/container_bootstrap.command"], {
          cwd: repositoryRoot,
          env: {
            ...process.env,
            PATH: stubPath(binDirectory),
          },
        }),
        (error) => {
          assert.equal(error.code, 1);
          assert.match(error.stdout, new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
          return true;
        },
      );
    });
  }
});

test("container bootstrap replaces an empty npm cache stamp", {
  skip: !canExecuteBash && "container bootstrap is Bash-only and executes inside Docker on Windows",
}, async (t) => {
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "container-bootstrap-fixture-"));
  t.after(() => rm(fixtureRoot, { force: true, recursive: true }));
  await mkdir(path.join(fixtureRoot, "scripts"), { recursive: true });
  await mkdir(path.join(fixtureRoot, "node_modules"));
  await mkdir(path.join(fixtureRoot, "bundle"));
  await copyFile(
    path.join(repositoryRoot, "scripts/container_bootstrap.command"),
    path.join(fixtureRoot, "scripts/container_bootstrap.command"),
  );
  await Promise.all([
    writeFile(path.join(fixtureRoot, ".ruby-version"), "3.3.4\n"),
    writeFile(path.join(fixtureRoot, ".node-version"), "20\n"),
    writeFile(path.join(fixtureRoot, "Gemfile.lock"), "BUNDLED WITH\n   2.5.18\n"),
    writeFile(path.join(fixtureRoot, "package.json"), "{}\n"),
    writeFile(path.join(fixtureRoot, "package-lock.json"), "{}\n"),
    writeFile(path.join(fixtureRoot, "node_modules/.jakeberv-npm-inputs.sha256"), ""),
  ]);

  const commands = {
    ...validRuntimeCommands(),
    npm: `
case "\${1:-}" in
  --version) printf '10.8.2\\n' ;;
  ls) exit 1 ;;
  ci) printf 'npm-ci-ran\\n' ;;
  *) exit 99 ;;
esac
`,
    sha256sum: `
if [[ "$#" -eq 0 ]]; then
  cat >/dev/null
  printf 'fingerprint  -\\n'
else
  for file in "$@"; do
    printf 'input  %s\\n' "$file"
  done
fi
`,
  };
  const binDirectory = await createCommandStubs(t, commands);
  const { stdout } = await execFileAsync(
    "bash",
    [path.join(fixtureRoot, "scripts/container_bootstrap.command")],
    {
      env: {
        ...process.env,
        BUNDLE_PATH: path.join(fixtureRoot, "bundle"),
        PATH: stubPath(binDirectory),
      },
    },
  );

  assert.match(stdout, /npm-ci-ran/);
  assert.equal(
    await readFile(path.join(fixtureRoot, "node_modules/.jakeberv-npm-inputs.sha256"), "utf8"),
    "fingerprint\n",
  );
});

test("container bootstrap reuses complete npm dependencies until inputs change", async () => {
  const bootstrap = await source("scripts/container_bootstrap.command");
  const fingerprintIndex = matchIndex(
    bootstrap,
    /sha256sum\s+package\.json\s+package-lock\.json/,
    "bootstrap must fingerprint both npm dependency inputs",
  );
  const integrityCheckIndex = matchIndex(
    bootstrap,
    /npm\s+ls\s+--all\s+--ignore-scripts/,
    "bootstrap must validate cached npm dependencies before reusing them",
  );
  const npmCiIndex = matchIndex(
    bootstrap,
    /^\s*npm\s+ci\s*$/m,
    "bootstrap must retain deterministic npm installation",
  );
  const stampWriteIndex = matchIndex(
    bootstrap,
    /printf[^\n]*npm_inputs_hash[^\n]*npm_stamp/,
    "bootstrap must record the installed dependency fingerprint after npm ci",
  );

  assert.match(bootstrap, /npm_stamp=[^\n]*node_modules/);
  assert.match(
    bootstrap,
    /installed_npm_inputs[^\n]*!=[^\n]*npm_inputs_hash|npm_inputs_hash[^\n]*!=[^\n]*installed_npm_inputs/,
    "bootstrap must reinstall when package.json or package-lock.json changes",
  );
  assert.match(
    bootstrap,
    /npm dependencies are already installed/i,
    "bootstrap must explain when it reuses the named node_modules volume",
  );
  assert.ok(
    fingerprintIndex < integrityCheckIndex
      && integrityCheckIndex < npmCiIndex
      && npmCiIndex < stampWriteIndex,
    "bootstrap must fingerprint, validate, install when needed, then update its stamp",
  );
});

test("container bootstrap verifies cached npm package payloads and command links", async () => {
  const bootstrap = await source("scripts/container_bootstrap.command");
  const treeStampIndex = matchIndex(
    bootstrap,
    /npm_tree_stamp=[^\n]*node_modules/,
    "bootstrap must persist an npm package-tree fingerprint",
  );
  const treeHashIndex = matchIndex(
    bootstrap,
    /npm_tree_hash\(\)/,
    "bootstrap must calculate an npm package-tree fingerprint",
  );
  const npmCiIndex = matchIndex(bootstrap, /^\s*npm\s+ci\s*$/m, "bootstrap must run npm ci when cache checks fail");
  const treeStampWriteIndex = matchIndex(
    bootstrap,
    /printf[^\n]*current_npm_tree[^\n]*npm_tree_stamp/,
    "bootstrap must update the package-tree fingerprint after npm ci",
  );

  assert.match(
    bootstrap,
    /fs\.lstatSync[\s\S]*?stats\.isSymbolicLink[\s\S]*?fs\.readlinkSync/,
    "the package-tree fingerprint must include regular files and executable symlinks",
  );
  assert.match(
    bootstrap,
    /installed_npm_tree[^\n]*!=[^\n]*current_npm_tree|current_npm_tree[^\n]*!=[^\n]*installed_npm_tree/,
    "bootstrap must reinstall when cached package contents differ from the recorded tree",
  );
  assert.match(
    bootstrap,
    /if \[\[ "\$installed_npm_inputs" == "\$npm_inputs_hash" && -n "\$installed_npm_tree" \]\]; then[\s\S]{0,240}npm_tree_hash/,
    "bootstrap must hash the installed tree only when package inputs and a stored tree stamp are reusable",
  );
  assert.match(
    bootstrap,
    /\[\[ -z "\$installed_npm_tree" \]\]/,
    "bootstrap must reinstall when the stored tree stamp is missing or empty",
  );
  assert.ok(
    treeStampIndex < treeHashIndex
      && treeHashIndex < npmCiIndex
      && npmCiIndex < treeStampWriteIndex,
    "bootstrap must fingerprint the cache before deciding whether to repair it",
  );
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
  assert.match(
    site,
    /-\s*["']?127\.0\.0\.1:4001:4001(?:\/[a-z]+)?["']?/,
    "the host preview port must bind to loopback only",
  );
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
  const wrapper = await source("scripts/container_test.command");

  assert.match(wrapper, /^#!\/usr\/bin\/env bash$/m, "container smoke wrapper must declare Bash");
  if (canExecuteBash) {
    await access(wrapperPath, constants.X_OK);
  }

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
  assert.ok(lockRoot, "package-lock.json must contain root package metadata");
  for (const field of ["dependencies", "devDependencies", "engines"]) {
    assert.ok(
      packageDefinition[field]
        && typeof packageDefinition[field] === "object"
        && !Array.isArray(packageDefinition[field]),
      `package.json must define ${field} as an object`,
    );
  }
  assert.equal(lockRoot.name, packageDefinition.name);
  assert.equal(lockRoot.version, packageDefinition.version);
  assert.deepEqual(lockRoot.dependencies, packageDefinition.dependencies);
  assert.deepEqual(lockRoot.devDependencies, packageDefinition.devDependencies);
  assert.deepEqual(lockRoot.engines, packageDefinition.engines);
});
