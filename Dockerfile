FROM node:20-bookworm-slim AS node-runtime

FROM ruby:3.3.4-bookworm

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

ARG USER_UID=1000
ARG USER_GID=1000

RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
    && ln -s ../lib/node_modules/corepack/dist/corepack.js /usr/local/bin/corepack \
    && test "$(npm --version | cut -d. -f1)" = "10" \
    && if ! printf '%s\n' "${USER_UID}:${USER_GID}" | grep -Eq '^[1-9][0-9]*:[1-9][0-9]*$'; then \
         echo "USER_UID and USER_GID must be positive integers." >&2; \
         exit 1; \
       fi \
    && gem install bundler --version 2.5.18 --no-document \
    && if getent group vscode >/dev/null 2>&1; then \
         groupmod --non-unique --gid "${USER_GID}" vscode; \
       else \
         groupadd --non-unique --gid "${USER_GID}" vscode; \
       fi \
    && if id -u vscode >/dev/null 2>&1; then \
         usermod --non-unique --uid "${USER_UID}" --gid "${USER_GID}" --home /home/vscode --shell /bin/bash vscode; \
       else \
         useradd --non-unique --uid "${USER_UID}" --gid "${USER_GID}" --create-home --shell /bin/bash vscode; \
       fi \
    && mkdir -p /home/vscode /workspace/node_modules "${BUNDLE_PATH}" \
    && chown -R vscode:vscode /home/vscode /workspace "${BUNDLE_PATH}" \
    && chmod 0777 "${BUNDLE_PATH}" /workspace/node_modules \
    && chmod -R a+rwX "${BUNDLE_PATH}" /workspace/node_modules

USER vscode
WORKDIR /workspace
