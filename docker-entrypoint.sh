#!/bin/sh
# Hosting platforms mount the data disk owned by root. Fix ownership, then run the app as the unprivileged "node" user.
set -e
mkdir -p "${DATA_DIR:-/data}"
if [ "$(id -u)" = "0" ]; then
  chown -R node:node "${DATA_DIR:-/data}"
  exec su-exec node "$@"
fi
exec "$@"
