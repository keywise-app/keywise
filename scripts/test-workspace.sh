#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd "$(dirname "$0")/.." && pwd)"
workspace_test_build="$(mktemp -d)"
trap 'rm -rf "$workspace_test_build"' EXIT
cd "$project_root"
./node_modules/.bin/tsc --target ES2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck --outDir "$workspace_test_build" lib/workspace/records.ts lib/workspace/access.ts
WORKSPACE_TEST_BUILD="$workspace_test_build" NODE_PATH="$project_root/node_modules" node --test test/workspace.test.cjs
