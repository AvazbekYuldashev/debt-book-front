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
})();
