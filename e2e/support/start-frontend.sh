#!/usr/bin/env bash
# Builds the app and serves the production build on port 3100, pointing at
# the end-to-end backend. A production build is used so the suite does not
# collide with a `pnpm dev` server already running in this directory.
set -euo pipefail

pnpm build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

export PORT=3100
export HOSTNAME=localhost
export API_URL=http://localhost:4100
exec node .next/standalone/server.js
