#!/usr/bin/env bash
# Starts the ssMarket backend for end-to-end tests: a throwaway database, its
# own Redis database and upload directory, and the development sign-in so
# tests can act as several people without Google.
set -euo pipefail

BACKEND_DIR="${E2E_BACKEND_DIR:-../ssMarket-be}"
cd "$BACKEND_DIR"

docker compose exec -T postgres psql -U ssmarket -d postgres -q \
  -c "DROP DATABASE IF EXISTS ssmarket_e2e WITH (FORCE)" \
  -c "CREATE DATABASE ssmarket_e2e OWNER ssmarket"
docker compose exec -T redis redis-cli -n 2 FLUSHDB >/dev/null

export NODE_ENV=development
export DEV_LOGIN_ENABLED=true
export PORT=4100
export WEB_URL=http://localhost:3100
export DATABASE_URL=postgres://ssmarket:ssmarket@localhost:5433/ssmarket_e2e
export REDIS_URL=redis://localhost:6380/2
export UPLOAD_DIR="${TMPDIR:-/tmp}/ssmarket-e2e-uploads"
export GOOGLE_CLIENT_ID=e2e-client-id
export GOOGLE_CLIENT_SECRET=e2e-client-secret
export ALLOWED_EMAIL_DOMAIN=example.com
# The development sign-in ?as=e2e-admin becomes this email, which gets the
# admin role at sign-in.
export ADMIN_EMAILS=e2e-admin@dev.invalid
export JWT_ACCESS_SECRET=e2e-secret-e2e-secret-e2e-secret-123456

rm -rf "$UPLOAD_DIR"
pnpm build
pnpm typeorm migration:run
exec node dist/main.js
