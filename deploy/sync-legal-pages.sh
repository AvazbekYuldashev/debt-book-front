#!/usr/bin/env bash
# ============================================================
#  web/*.html (privacy, terms, delete-account) ni pul-hisob.uz
#  docroot'iga ko'chiradi.
#
#  NIMA UCHUN: bu statik sahifalar `expo export` (dist/) ichiga
#  KIRMAYDI. Frontend qayta deploy qilingandan so'ng docroot
#  tozalansa yo'qolishi mumkin — shuning uchun har deploy'dan
#  keyin shu skriptni ishga tushiring.
#
#  ISHLATISH:  bash deploy/sync-legal-pages.sh
# ============================================================
set -euo pipefail

KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
HOST="${DEPLOY_HOST:-root@138.249.7.224}"
DOCROOT="${DOCROOT:-/var/www/debt-book-frontend}"

cd "$(dirname "$0")/.."

FILES="web/privacy.html web/terms.html web/delete-account.html"

echo "→ Nusxalanmoqda: $FILES"
scp -i "$KEY" -o BatchMode=yes $FILES "$HOST:$DOCROOT/"
ssh -i "$KEY" -o BatchMode=yes "$HOST" \
  "chmod 644 $DOCROOT/privacy.html $DOCROOT/terms.html $DOCROOT/delete-account.html"

echo "✓ Tayyor: privacy.html, terms.html, delete-account.html -> $DOCROOT"
echo "  https://pul-hisob.uz/privacy.html"
echo "  https://pul-hisob.uz/terms.html"
echo "  https://pul-hisob.uz/delete-account.html"
