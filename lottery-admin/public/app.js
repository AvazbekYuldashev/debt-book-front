(function () {
  // ---------- Theme toggle ----------
  var root = document.documentElement;
  var toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var current = root.getAttribute('data-theme') || 'dark';
      var next = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
  }

  // ---------- Cursor spotlight on cards ----------
  var spotlightEls = document.querySelectorAll('.card, .login-card, .topbar');
  spotlightEls.forEach(function (el) {
    el.addEventListener('mousemove', function (e) {
      var rect = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
      el.style.setProperty('--my', (e.clientY - rect.top) + 'px');
    });
  });

  // ---------- Staggered entrance animation ----------
  var animatables = document.querySelectorAll('.card, .login-card, .page-header');
  animatables.forEach(function (el, i) {
    el.style.setProperty('--delay', (i * 60) + 'ms');
  });

  // ---------- Button press ripple-ish feedback handled purely in CSS via :active ----------

  // ---------- Loading state on form submit (buttons show a subtle pulse) ----------
  document.querySelectorAll('form').forEach(function (form) {
    form.addEventListener('submit', function () {
      var btn = form.querySelector('button[type="submit"]');
      if (btn && !btn.disabled) {
        btn.classList.add('is-loading');
      }
    });
  });

  // ---------- Viktorina natijasini sahnaviy ochish ----------
  // Tartib: o'rinlar soni e'lon qilinadi -> har bir g'olibning telefon raqami
  // raqamma-raqam ochiladi (998xxxxxxxxx -> 9989xxxxxxxx -> ...) -> raqam to'liq
  // shakllangach ismi ko'rinadi -> keyingi o'ringa o'tiladi.
  //
  // Server natijani to'liq chiqaradi; maskalashni shu yerda qilamiz, ya'ni JS
  // ishlamasa foydalanuvchi baribir hamma narsani ko'radi.
  (function initDrawReveal() {
    var card = document.getElementById('drawResult');
    if (!card) return;

    var rows = Array.prototype.slice.call(card.querySelectorAll('.reveal-row'));
    if (!rows.length) return;

    var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return; // animatsiyasiz — hammasi allaqachon ko'rinib turibdi

    // G'oliblar ko'p bo'lsa tezlashtiramiz (20 kishini 60 soniya kutmaslik uchun).
    var speed = rows.length > 8 ? 0.4 : rows.length > 4 ? 0.65 : 1;
    var VISIBLE_PREFIX = 3;              // "998" boshidan ko'rinib turadi
    var DIGIT_MS = Math.round(160 * speed);
    var FLICKER_MS = Math.round(45 * speed);
    var FLICKER_COUNT = 3;
    var NAME_DELAY_MS = Math.round(280 * speed);
    var ROW_GAP_MS = Math.round(520 * speed);
    var START_DELAY_MS = 700;

    function maskPhone(phone, shown) {
      var hidden = Math.max(0, phone.length - shown);
      return phone.slice(0, shown) + new Array(hidden + 1).join('x');
    }

    // 1-qadam: hammasini yashiramiz.
    // Ism uchun ALOHIDA element qo'shmaymiz — o'sha elementning matnini "• • •"
    // ga almashtiramiz. Aks holda ikkita inline element ikki qatorga tushib,
    // jadval ustunlari qiyshayib qoladi.
    rows.forEach(function (row) {
      var phone = row.getAttribute('data-phone') || '';
      var phoneEl = row.querySelector('.reveal-phone');
      var nameEl = row.querySelector('.reveal-name');
      row.classList.add('is-pending');
      if (phoneEl && phone) phoneEl.textContent = maskPhone(phone, VISIBLE_PREFIX);
      if (nameEl) {
        nameEl.setAttribute('data-name', row.getAttribute('data-name') || nameEl.textContent);
        nameEl.textContent = '• • •';
        nameEl.classList.add('is-masked');
      }
    });

    var announce = document.getElementById('revealAnnounce');
    if (announce) announce.classList.add('is-visible');

    function revealRow(row, onDone) {
      var phone = row.getAttribute('data-phone') || '';
      var phoneEl = row.querySelector('.reveal-phone');
      var nameEl = row.querySelector('.reveal-name');

      row.classList.remove('is-pending');
      row.classList.add('is-active');

      var shown = VISIBLE_PREFIX;

      function showName() {
        if (phoneEl && phone) {
          phoneEl.textContent = phone;
          phoneEl.classList.add('is-complete');
        }
        window.setTimeout(function () {
          if (nameEl) {
            nameEl.textContent = nameEl.getAttribute('data-name') || nameEl.textContent;
            nameEl.classList.remove('is-masked');
            // Bir zumlik boshlang'ich holat -> keyingi kadrda olib tashlanadi va
            // element transition bilan o'z joyiga "chiqadi". Animatsiya
            // ishlamasa ham element to'g'ri joyda qoladi.
            nameEl.classList.add('is-popping');
            void nameEl.offsetWidth;
            window.requestAnimationFrame(function () {
              nameEl.classList.remove('is-popping');
              nameEl.classList.add('is-revealed');
            });
          }
          row.classList.remove('is-active');
          row.classList.add('is-done', 'just-revealed');
          window.setTimeout(function () { row.classList.remove('just-revealed'); }, 1100);
          window.setTimeout(onDone, ROW_GAP_MS);
        }, NAME_DELAY_MS);
      }

      function nextDigit() {
        if (!phone || !phoneEl || shown >= phone.length) {
          showName();
          return;
        }
        // Ochilayotgan raqam bir necha marta "aylanadi", so'ng o'rniga tushadi.
        var flicks = FLICKER_COUNT;
        var timer = window.setInterval(function () {
          flicks -= 1;
          if (flicks > 0) {
            var random = String(Math.floor(Math.random() * 10));
            var rest = Math.max(0, phone.length - shown - 1);
            phoneEl.textContent = phone.slice(0, shown) + random + new Array(rest + 1).join('x');
            return;
          }
          window.clearInterval(timer);
          shown += 1;
          phoneEl.textContent = maskPhone(phone, shown);
          phoneEl.classList.add('is-ticking');
          window.setTimeout(function () { phoneEl.classList.remove('is-ticking'); }, DIGIT_MS / 2);
          window.setTimeout(nextDigit, DIGIT_MS);
        }, FLICKER_MS);
      }

      nextDigit();
    }

    function runQueue(index) {
      if (index >= rows.length) {
        card.classList.add('reveal-finished');
        return;
      }
      revealRow(rows[index], function () { runQueue(index + 1); });
    }

    window.setTimeout(function () { runQueue(0); }, START_DELAY_MS);
  })();
})();
