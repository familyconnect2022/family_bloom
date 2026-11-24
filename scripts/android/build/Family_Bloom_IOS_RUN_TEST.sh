#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo '[ERROR] Native iOS builds require macOS and Xcode.' >&2
  exit 2
fi
if [[ ! -d node_modules/expo ]]; then
  echo '[ERROR] Install dependencies: npm install' >&2
  exit 1
fi
if [[ ! -f GoogleService-Info.plist ]]; then
  echo '[WARN] iOS Firebase configuration is absent; Family Bloom is Android-first.'
  echo '       Configure iOS credentials, GoogleService-Info.plist and native Firebase plugins first.'
  exit 2
fi
npx expo run:ios "$@"
