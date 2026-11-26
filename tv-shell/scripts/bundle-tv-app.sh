#!/usr/bin/env bash
# Puts the IPTVnator TV app (dist/apps/tv of `pnpm nx build tv`) in the Android
# shell instead of the PWA, with the TV app's remote bridge as tvshell/tv.js.
#   tv-shell/scripts/bundle-tv-app.sh /path/to/iptvnator/dist/apps/tv
set -euo pipefail
SRC="${1:?usage: bundle-tv-app.sh <dist/apps/tv>}"
HERE="$(cd "$(dirname "$0")" && pwd)"
"$HERE/bundle-pwa.sh" "$SRC"
WWW="$HERE/../android/app/src/main/assets/www"
rm -f "$WWW/appinfo.json" "$WWW/large-icon.png" # LG metadata
cp "$HERE/../tvapp/tv.js" "$HERE/../android/app/src/main/assets/tvshell/tv.js"
# Live channels are HLS and the Android WebView has no native HLS: ship hls.js,
# loaded by the TV app only there (libs/tv/data-access/src/hls-fallback.ts).
mkdir -p "$WWW/vendor"
cp "$HERE/../../node_modules/hls.js/dist/hls.light.min.js" "$WWW/vendor/hls.light.min.js"
# The TV app's icon and banner (apps/tv/make-icons.mjs) instead of the PWA's.
cp -R "$HERE/../tvapp/res/." "$HERE/../android/app/src/main/res/"
# The shell injects tv.js as a deferred script after the app's own; load it
# first so the app sees the embedded backend from its very first render.
sed -i.bak 's#<head>#<head><script src="tvshell/tv.js"></script>#' "$WWW/index.html"
rm -f "$WWW/index.html.bak"
grep -q 'src="tvshell/tv.js"' "$WWW/index.html"
echo "TV app bundled into $WWW"
