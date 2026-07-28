#!/usr/bin/env bash
# Build and publish the site to the gh-pages branch.
#
#   npm --prefix frontend run deploy        (or: ./scripts/deploy.sh)
#   ./scripts/deploy.sh --dry-run           build + check, publish nothing
#
# Uses a git worktree rather than the `gh-pages` npm package: no extra
# dependency, and the branch keeps a normal, inspectable history.
#
# The checks before publishing are the point of this script. The flight is ~69MB
# of video across five files that are easy to forget to copy into public/, and a
# deploy that is missing them looks fine in the build log and then falls back to
# a static poster for every visitor.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND="$REPO/frontend"
BUILD="$FRONTEND/build"
BRANCH="gh-pages"
WORKTREE="$(mktemp -d)"
DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

cleanup() {
  git -C "$REPO" worktree remove --force "$WORKTREE" 2>/dev/null || true
  rm -rf "$WORKTREE"
}
trap cleanup EXIT

fail() { printf '\n\033[31mDEPLOY ANNULLATO:\033[0m %s\n' "$1" >&2; exit 1; }

# ---------------------------------------------------------------- build
echo "==> build"
( cd "$FRONTEND" && CI=false npx craco build )

# ---------------------------------------------------------------- checks
echo "==> verifica del build"

[ -s "$BUILD/index.html" ] || fail "index.html mancante o vuoto"

# The flight: every variant plus both posters, and none of them truncated.
FLIGHT_MIN_BYTES=50000
for f in flight-hidpi.mp4 flight-desktop.mp4 flight-mobile.mp4 \
         flight-mobile-portrait.mp4 flight-first.jpg flight-first-portrait.jpg \
         flight-poster.jpg; do
  p="$BUILD/assets/flight/$f"
  [ -f "$p" ] || fail "asset del volo mancante: assets/flight/$f"
  sz=$(stat -c%s "$p")
  [ "$sz" -ge "$FLIGHT_MIN_BYTES" ] || fail "assets/flight/$f è troppo piccolo ($sz byte): build troncato?"
done

# The section photos, with the minimum width each one is actually painted at.
check_image() {  # file  min_width
  local p="$BUILD/$1" min="$2"
  [ -f "$p" ] || fail "immagine mancante: $1"
  local w
  w=$(python3 -c "from PIL import Image;print(Image.open('$p').size[0])" 2>/dev/null || echo 0)
  [ "$w" -ge "$min" ] || fail "$1 è larga ${w}px, attese >= ${min}px (asset sbagliato o non rigenerato?)"
}
check_image casale.jpg 1100
check_image terrazza.jpg 2400
check_image valle.jpg 1900
check_image sprout.png 450
check_image logo.png 900

# Photos and article covers derived by scripts/prepare_media.py. The widths are
# what that script produces; a mismatch means public/ is holding an older cut.
check_image apiario.jpg 1200
check_image aiuole.jpg 1200
check_image foodforest.jpg 1050
check_image og-image.jpg 1200
check_image cover-permacultura.jpg 1200
check_image cover-mare.jpg 1060
check_image cover-orto.jpg 1440
check_image cover-sciame.jpg 576
check_image cover-arnie.jpg 464
check_image favo.jpg 464

# No section image or cover may be fetched from a third-party host: the site
# ships only the farm's own photography, and an external URL creeping back in
# would also hand every visitor's IP to that host.
if grep -rqE 'https?://(images\.)?(pexels|unsplash)' "$BUILD/static/js/"*.js; then
  fail "il build contiene ancora URL di foto stock (pexels/unsplash)"
fi

# The old 240-frame WebP sequence must be gone: 39MB of dead weight, and its
# presence means an outdated public/ got copied over the new one.
[ -d "$BUILD/assets/frames" ] && fail "assets/frames esiste ancora: public/ non è aggiornato"

# The base path has to match package.json's homepage or every asset 404s.
grep -q '/humus-sapiens-scrollworld/' "$BUILD/index.html" \
  || fail "index.html non contiene il base path /humus-sapiens-scrollworld/ (homepage sbagliata?)"

printf '    ok — %s\n' "$(du -sh "$BUILD" | cut -f1) di build, volo completo"

if [ "$DRY_RUN" = 1 ]; then
  echo "==> --dry-run: niente pubblicato"
  exit 0
fi

# ---------------------------------------------------------------- publish
echo "==> pubblicazione su $BRANCH"
git -C "$REPO" fetch origin "$BRANCH" 2>/dev/null || true
if git -C "$REPO" show-ref --verify --quiet "refs/remotes/origin/$BRANCH"; then
  git -C "$REPO" worktree add --force "$WORKTREE" -B "$BRANCH" "origin/$BRANCH"
else
  git -C "$REPO" worktree add --force "$WORKTREE" -B "$BRANCH"
  git -C "$REPO" -C "$WORKTREE" rm -rq --ignore-unmatch . || true
fi

# Replace the branch contents wholesale. Earlier deploys left frontend/ and
# memory/ sitting on gh-pages; a straight copy would keep them there forever.
find "$WORKTREE" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
cp -a "$BUILD/." "$WORKTREE/"

# Tell Pages not to run Jekyll: it would otherwise strip the YAML front matter
# out of public/articles/*.md, which the Blog section parses at runtime.
touch "$WORKTREE/.nojekyll"

cd "$WORKTREE"
git add -A
if git diff --cached --quiet; then
  echo "    nessuna modifica da pubblicare"
  exit 0
fi
git commit -q -m "Deploy: $(git -C "$REPO" rev-parse --short HEAD) $(date +%Y-%m-%d\ %H:%M)"
git push -q origin "$BRANCH"

echo "==> fatto"
echo "    https://1naturalecosistem.github.io/humus-sapiens-scrollworld/"
echo "    (GitHub Pages può metterci 1-2 minuti a servire la nuova versione)"
