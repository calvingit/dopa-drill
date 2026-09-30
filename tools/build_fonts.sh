#!/usr/bin/env bash
# 从 Google Fonts（OFL）源文件重建游戏用的子集 WOFF2。
# 需要：curl、uv。用法：bash tools/build_fonts.sh
#
# 简体中文：
#   站酷庆科黄油体 — 标题（chunky）
#   Noto Sans SC   — 正文（round）
# 原有日文字体保留，给标志和未覆盖字形做回退：
#   Dela Gothic One、Zen Maru Gothic
# 源码扫描会带上中文汉字；下面的全角标点是额外保留的排版字符。
set -euo pipefail
GAME="$(cd "$(dirname "$0")/../app" && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
BASE=https://raw.githubusercontent.com/google/fonts/main/ofl

curl -fsSL -o "$WORK/zcool.ttf" "$BASE/zcoolqingkehuangyou/ZCOOLQingKeHuangYou-Regular.ttf"
curl -fsSL -o "$WORK/noto.ttf" "$BASE/notosanssc/NotoSansSC%5Bwght%5D.ttf"
curl -fsSL -o "$WORK/dela.ttf" "$BASE/delagothicone/DelaGothicOne-Regular.ttf"
curl -fsSL -o "$WORK/zen-bold.ttf" "$BASE/zenmarugothic/ZenMaruGothic-Bold.ttf"
curl -fsSL -o "$WORK/zen-black.ttf" "$BASE/zenmarugothic/ZenMaruGothic-Black.ttf"

python3 - "$GAME" "$WORK/chars.txt" <<'PY'
import sys, pathlib
game = pathlib.Path(sys.argv[1])
chars = {chr(c) for c in range(0x20, 0x7f)}
for f in [*game.glob('*.html'), *game.glob('*.css'), *game.glob('js/*.js')]:
    chars |= set(f.read_text(encoding='utf-8'))
chars |= set('０１２３４５６７８９＋−×÷＝、。・！？「」（）ー〜…')
pathlib.Path(sys.argv[2]).write_text(''.join(sorted(c for c in chars if ord(c) >= 0x20)), encoding='utf-8')
print(f"subset chars: {sum(1 for c in chars if ord(c) >= 0x20)}", file=sys.stderr)
PY

# 可变字体先按用字裁小，再固定到正文用的字重 700，最后压成 WOFF2。
uv run --no-project --with fonttools --with brotli pyftsubset \
  "$WORK/noto.ttf" \
  --text-file="$WORK/chars.txt" \
  --layout-features='*' \
  --output-file="$WORK/noto-sub.ttf"
uv run --no-project --with fonttools --with brotli fonttools varLib.instancer \
  "$WORK/noto-sub.ttf" wght=700 --static -o "$WORK/noto-700.ttf"
uv run --no-project --with fonttools --with brotli pyftsubset \
  "$WORK/noto-700.ttf" \
  --text-file="$WORK/chars.txt" \
  --flavor=woff2 \
  --layout-features='*' \
  --output-file="$GAME/fonts/noto-sans-sc.woff2"

for pair in \
  "zcool zcool-qingke-huangyou" \
  "dela dela-gothic-one" \
  "zen-bold zen-maru-gothic-bold" \
  "zen-black zen-maru-gothic-black"
do
  set -- $pair
  uv run --no-project --with fonttools --with brotli pyftsubset \
    "$WORK/$1.ttf" \
    --text-file="$WORK/chars.txt" \
    --flavor=woff2 \
    --layout-features='*' \
    --output-file="$GAME/fonts/$2.woff2"
done

echo "fonts rebuilt in $GAME/fonts"
