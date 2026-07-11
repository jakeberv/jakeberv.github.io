FROM node:20-bookworm-slim AS node-runtime

FROM ruby:3.3.4-bookworm

ARG USER_UID=1000
ARG USER_GID=1000

ENV BUNDLE_PATH=/usr/local/bundle

RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
      build-essential \
      ca-certificates \
      git \
      python3 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
COPY --from=node-runtime /usr/local/lib/node_modules /usr/local/lib/node_modules

RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
    && ln -s ../lib/node_modules/corepack/dist/corepack.js /usr/local/bin/corepack \
    && test "$(npm --version | cut -d. -f1)" = "10" \
    && gem install bundler --version 2.5.18 \
    && groupadd --gid "${USER_GID}" vscode \
    && useradd --uid "${USER_UID}" --gid "${USER_GID}" --create-home --shell /bin/bash vscode \
    && mkdir -p /workspace/node_modules "${BUNDLE_PATH}" \
    && chown -R vscode:vscode /workspace "${BUNDLE_PATH}" \
    && chmod 0777 "${BUNDLE_PATH}" /workspace/node_modules

USER vscode
WORKDIR /workspace
