#!/usr/bin/env bash
set -euo pipefail

out="build-pages-extract.txt"
: > "$out"

for file in \
  "src/app/library/[game]/page.tsx" \
  "src/app/builds/[buildId]/page.tsx" \
  "src/app/community/page.tsx" \
  "src/app/community/community.css" \
  "src/lib/builds/types.ts"; do
  {
    printf '\n===== %s =====\n' "$file"
    cat "$file"
  } >> "$out"
done

printf 'Creato %s\n' "$out"
