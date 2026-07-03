#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# Load .env if present (keeps secrets out of the repo)
if [ -f "$ROOT/.env" ]; then
  export $(grep -v '^#' "$ROOT/.env" | xargs)
fi

echo "==> Building frontend..."
cd "$ROOT/frontend"
npm install --cache /tmp/npm-cache-75medium
npm run build

echo "==> Packaging backend (fat JAR)..."
cd "$ROOT/backend"
./mvnw package -q

echo ""
echo "Build complete. Run with:"
echo "  java -jar $ROOT/backend/target/app-0.0.1-SNAPSHOT.jar"
