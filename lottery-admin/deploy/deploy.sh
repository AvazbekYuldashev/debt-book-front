#!/usr/bin/env bash
# ============================================================
#  Viktorina admin panelini VPS'ga chiqarish.
#
#  ISHLATISH (lokal mashinadan):  bash deploy/deploy.sh
#
#  MUHIM: scp papkalarni 700 huquq bilan yaratadi va xizmat 'lottery'
#  foydalanuvchisi nomidan ishlagani uchun kodni O'QIY OLMAY QOLADI
#  ("Cannot find module"). Shuning uchun ko'chirishdan keyin huquqlar
#  MAJBURAN to'g'rilanadi — shu skriptdan foydalaning, qo'lda scp qilmang.
# ============================================================
set -euo pipefail

HOST="${DEPLOY_HOST:-root@138.249.7.224}"
APP="${DEPLOY_PATH:-/home/Desktop/lottery-admin}"

cd "$(dirname "$0")/.."

echo "→ Fayllar ko'chirilmoqda ($HOST:$APP)"
scp -o BatchMode=yes -r src views public package.json "$HOST:$APP/"

echo "→ Egalik va huquqlar to'g'rilanmoqda"
ssh -n -o BatchMode=yes "$HOST" "
  set -e
  cd '$APP'
  chown -R root:root src views public package.json
  find src views public -type d -exec chmod 755 {} \;
  find src views public -type f -exec chmod 644 {} \;
  chmod 755 .
  # Baza faqat xizmat foydalanuvchisiniki
  chown -R lottery:lottery data
  chmod 750 data
  # Maxfiy sozlamalar
  chown root:lottery .env
  chmod 640 .env
"

echo "→ Xizmat qayta ishga tushirilmoqda"
ssh -n -o BatchMode=yes "$HOST" "systemctl restart lottery-admin && sleep 3 && systemctl is-active lottery-admin"

echo "→ Tekshiruv"
ssh -n -o BatchMode=yes "$HOST" "ss -tlnp | grep ':4000' || echo 'OGOHLANTIRISH: 4000 portda hech kim tinglamayapti'"
ssh -n -o BatchMode=yes "$HOST" "journalctl -u lottery-admin --since '1 min ago' --no-pager | tail -5"

echo "✓ Tayyor: https://pul-hisob.uz/lottery-admin/"
