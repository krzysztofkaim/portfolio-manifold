#!/bin/bash
set -euo pipefail

RAW="raw-assets"
OUT="public"

mkdir -p "$OUT/models"

for f in "$RAW"/*.glb; do
  [ -f "$f" ] || continue
  name=$(basename "$f")
  bunx gltf-transform optimize "$f" "$OUT/models/$name" \
    --compress meshopt \
    --texture-compress ktx2 \
    --texture-size 1024 \
    --simplify-ratio 0.75 \
    --simplify-error 0.001
  echo "✅ $name → $(du -h "$OUT/models/$name" | cut -f1)"
done
