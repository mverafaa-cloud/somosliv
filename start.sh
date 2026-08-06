#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
command -v netlify >/dev/null 2>&1 || npm install -g netlify-cli
[ -d node_modules ] || npm install
echo "Levantando en http://localhost:8888"
netlify dev
