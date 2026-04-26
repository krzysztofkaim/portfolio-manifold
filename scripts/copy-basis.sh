#!/bin/bash
set -euo pipefail

SRC="node_modules/three/examples/jsm/libs/basis"
DEST="public/basis"

mkdir -p "$DEST"
cp "$SRC/basis_transcoder.js" "$DEST/"
cp "$SRC/basis_transcoder.wasm" "$DEST/"
echo "✅ Basis transcoder copied to public/basis/"
