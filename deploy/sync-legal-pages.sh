#!/usr/bin/env bash
# ============================================================
#  web/ ichidagi statik fayllarni (privacy/terms/delete-account,
#  robots, sitemap, manifest, logo o'lchamlari) pul-hisob.uz
#  docroot'iga ko'chiradi.
#
#  NIMA UCHUN: bu fayllar `expo export` (dist/) ichiga KIRMAYDI.
#  Frontend qayta deploy qilingandan so'ng docroot tozalansa
#  yo'qolishi mumkin — shuning uchun har deploy'dan keyin shu
#  skriptni ishga tushiring.
#
#  ISHLATISH:  bash deploy/sync-legal-pages.sh
# ============================================================
set -euo pipefail

KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
HOST="${DEPLOY_HOST:-root@138.249.7.224}"
DOCROOT="${DOCROOT:-/var/www/debt-book-frontend}"

cd "$(dirname "$0")/.."

FILES="web/privacy.html web/terms.html web/delete-account.html
       web/robots.txt web/sitemap.xml web/manifest.webmanifest
       web/icon-192.png web/icon-512.png web/apple-touch-icon.png web/og-image.png
       web/.htaccess"

echo "→ Nusxalanmoqda:"
for f in $FILES; do echo "    $f"; done

# shellcheck disable=SC2086
scp -i "$KEY" -o BatchMode=yes $FILES "$HOST:$DOCROOT/"
ssh -i "$KEY" -o BatchMode=yes "$HOST" \
  "chown www-data:www-data $DOCROOT/* $DOCROOT/.htaccess && chmod 644 $DOCROOT/* $DOCROOT/.htaccess"

echo "✓ Tayyor -> $DOCROOT"
echo "  https://pul-hisob.uz/privacy.html"
echo "  https://pul-hisob.uz/terms.html"
echo "  https://pul-hisob.uz/delete-account.html"
echo "  https://pul-hisob.uz/robots.txt"
echo "  https://pul-hisob.uz/sitemap.xml"
