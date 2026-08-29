#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
OUT="${1:-$ROOT/01-scan-qr-do-more.png}"
HTML="file://$ROOT/compose.html"
DATA="$ROOT/.chrome-profile"

mkdir -p "$DATA"
rm -f "$OUT"

# Chrome 148's --screenshot flag writes the PNG then keeps the process
# alive on GCM registration. Bound the whole run so it cannot hang.
timeout 25s google-chrome \
  --headless=new \
  --disable-gpu \
  --disable-extensions \
  --disable-sync \
  --disable-background-networking \
  --hide-scrollbars \
  --no-first-run \
  --force-device-scale-factor=1 \
  --window-size=1242,2688 \
  --user-data-dir="$DATA" \
  --default-background-color=FF14092A \
  --screenshot="$OUT" \
  "$HTML" \
  >/dev/null 2>&1 || true

if [[ ! -f "$OUT" ]]; then
  echo "render failed: $OUT was not written" >&2
  exit 1
fi

python3 - "$OUT" <<'PY'
import struct, sys
from pathlib import Path
path = Path(sys.argv[1])
data = path.read_bytes()
if data[:8] != b"\x89PNG\r\n\x1a\n":
    raise SystemExit(f"{path} is not a PNG")
width, height, _bit, color = struct.unpack(">IIBB", data[16:26])
if (width, height) != (1242, 2688):
    raise SystemExit(f"expected 1242x2688, got {width}x{height}")
if color != 2:
    raise SystemExit(f"expected opaque RGB (color type 2), got {color}")
print(f"wrote {path} ({width}x{height} RGB, {path.stat().st_size} bytes)")
PY
