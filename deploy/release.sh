#!/usr/bin/env bash
#
# Saytga FAQAT GitHub'dagi kod chiqadi.
#
# Bundle nomidagi hash faqat MAZMUN o'zgarganini bildiradi, qaysi commitdan
# qurilganini emas. Shuning uchun yoniga version.txt qo'yiladi: serverdagi
# saytni GitHub bilan solishtirish uchun yagona ishonchli belgi shu.
#
# Ishlatilishi:
#   deploy/release.sh          - tekshir, qur, chiqar, tasdiqla
#   deploy/release.sh --check  - hech narsa o'zgartirmay, faqat holatni ayt
#
set -euo pipefail

SERVER="${DEBTBOOK_SERVER:-root@138.249.7.224}"
WEB_ROOT=/var/www/debt-book-frontend

cd "$(dirname "$0")/.."

red()  { printf '\033[31m%s\033[0m\n' "$*"; }
green(){ printf '\033[32m%s\033[0m\n' "$*"; }
die()  { red "TO'XTADI: $*"; exit 1; }

server_commit() {
    ssh -o ConnectTimeout=20 "$SERVER" "cat $WEB_ROOT/version.txt 2>/dev/null" || true
}

git fetch -q origin master

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/master)
RUNNING=$(server_commit)

if [ "${1:-}" = "--check" ]; then
    echo "GitHub master : $REMOTE"
    echo "Ish nusxasi   : $LOCAL"
    SHOWN="$RUNNING"
    [ -n "$SHOWN" ] || SHOWN="tamgasiz - eski build"
    echo "Saytda        : $SHOWN"
    if [ "$RUNNING" = "$REMOTE" ]; then
        green "Bir xil - saytda GitHub'dagi kod turibdi."
    else
        red "FARQ BOR - sayt GitHub'dan orqada yoki boshqa koddan qurilgan."
    fi
    exit 0
fi

# ---------- 1. Qurishdan oldingi qulf ----------

[ -z "$(git status --porcelain)" ] || die "ish nusxasi toza emas - avval commit qiling"
[ "$LOCAL" = "$REMOTE" ] || die "HEAD origin/master bilan bir xil emas - avval push qiling"

echo "Commit: $LOCAL"

# ---------- 2. Qurish ----------

# build:web SEO bosqichini ham yuritadi - uni o'tkazib yuborilsa index.html
# yarim qolib, qidiruv tizimlari uchun meta teglar yo'qoladi.
npm run --silent build:web
[ -f dist/index.html ] || die "dist qurilmadi"

echo "$LOCAL" > dist/version.txt

# ---------- 3. Chiqarish ----------

TARBALL=$(mktemp -t debtbook-web-XXXXXX.tgz)
trap 'rm -f "$TARBALL"' EXIT
tar -czf "$TARBALL" -C dist .

echo "Yuborilyapti..."
scp -o ConnectTimeout=25 "$TARBALL" "$SERVER:/tmp/web.tgz"

ssh -o ConnectTimeout=25 "$SERVER" bash -s <<REMOTE_SCRIPT
set -e
# Papka O'CHIRILMAYDI: huquqiy sahifalar (delete-account.html, privacy.html,
# terms.html) Play Store talabi va ular alohida turadi. Faqat ustiga yoziladi.
find $WEB_ROOT/_expo/static/js/web -name 'AppEntry-*.js' -mmin +2880 -delete 2>/dev/null || true
tar -xzf /tmp/web.tgz -C $WEB_ROOT
chown -R www-data:www-data $WEB_ROOT
rm -f /tmp/web.tgz
REMOTE_SCRIPT

# ---------- 4. Tasdiqlash ----------

RUNNING=$(server_commit)
[ "$RUNNING" = "$LOCAL" ] || die "saytdagi tamga boshqa commitni aytyapti: [$RUNNING]"

CODE=$(curl -s -o /dev/null -w '%{http_code}' https://pul-hisob.uz/)
[ "$CODE" = "200" ] || die "sayt javob bermadi (HTTP $CODE)"

green "Tayyor. GitHub va sayt bitta kodda: $LOCAL"
