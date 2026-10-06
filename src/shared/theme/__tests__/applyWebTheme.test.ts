/**
 * @jest-environment jsdom
 */
import { darkColors, lightColors } from '../colors';
import { applyWebTheme, buildWebThemeCss, KEYBOARD_ATTR } from '../applyWebTheme.web';

/**
 * Web'da brauzer o'zi chizadigan qismlar: fokus halqasi, autofill foni,
 * manzil satri rangi. Hammasi KO'RSATILAYOTGAN ko'rinishga bog'liq.
 */

const root = () => document.documentElement;
const press = (init: KeyboardEventInit) =>
  document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }));
// jsdom'da PointerEvent yo'q - tinglovchiga hodisa turi yetarli.
const touch = () => document.dispatchEvent(new Event('pointerdown', { bubbles: true }));

beforeEach(() => {
  document.head.innerHTML = `
    <meta name="theme-color" media="(prefers-color-scheme: light)" content="#F1F5F9" />
    <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0B1120" />
  `;
  document.body.removeAttribute('style');
  root().removeAttribute(KEYBOARD_ATTR);
});

describe('buildWebThemeCss', () => {
  it('halqa brand rangida va faqat Tab rejimida', () => {
    const css = buildWebThemeCss(lightColors);

    expect(css).toContain(`:where(html[${KEYBOARD_ATTR}] :focus-visible)`);
    expect(css).toContain(`outline: 2px solid ${lightColors.primary}`);
    expect(css).toContain(`:where(html:not([${KEYBOARD_ATTR}]) :focus-visible) { outline: none; }`);
  });

  it("kartadagi qator halqani ichkariga oladi, o'z chegarali maydon olmaydi", () => {
    const css = buildWebThemeCss(lightColors);

    expect(css).toMatch(/\[data-focus="inset"\]:focus-visible\) \{ outline-offset: -2px; \}/);
    expect(css).toMatch(/\[data-focus="self"\]:focus-visible[^{]*\) \{ outline: none; \}/);
    // "self" qoidasi halqa qoidasidan KEYIN - ustuvorlik nol, tartib hal qiladi.
    expect(css.indexOf('data-focus="self"')).toBeGreaterThan(css.indexOf('outline: 2px solid'));
  });

  /**
   * Karta burchagidagi qator: halqaning to'g'ri burchagini kartaning
   * radiusi kesmasin - qator radiusni otasidan oladi.
   */
  it('birinchi/oxirgi ichki qator radiusni kartadan oladi', () => {
    const css = buildWebThemeCss(lightColors);

    expect(css).toMatch(/\[data-focus="inset"\]:focus-visible:first-child\) \{\s*border-top-left-radius: inherit;\s*border-top-right-radius: inherit;/);
    expect(css).toMatch(/\[data-focus="inset"\]:focus-visible:last-child\) \{\s*border-bottom-left-radius: inherit;\s*border-bottom-right-radius: inherit;/);
  });

  /**
   * Ustuvorlik NOL: komponent halqani o'z uslubida ataylab o'chirgan
   * bo'lsa (AuthTextInput), uning sinfi ustun kelishi kerak.
   */
  it("fokus qoidalari :where() ichida", () => {
    const focusRules = buildWebThemeCss(lightColors)
      .split('\n')
      .filter((line) => line.includes('focus') && line.includes('{'));

    expect(focusRules.length).toBeGreaterThan(0);
    focusRules.forEach((line) => expect(line.startsWith(':where(')).toBe(true));
  });

  /**
   * Brauzer fonini transition ushlab turadi - inset soya maydon tusida,
   * yarim shaffof. To'liq qoplama shisha/kulrang maydonda to'rtburchak
   * bo'lib qolardi.
   */
  it("autofill foni maydon tusida, brauzer fonini transition ushlaydi", () => {
    const css = buildWebThemeCss(darkColors);

    expect(css).toContain(`0 0 0 1000px ${darkColors.surfaceMuted} inset`);
    expect(css).toContain('transition: background-color 9999s');
  });
});

describe('applyWebTheme', () => {
  it('bitta <style> yaratadi va keyingi chaqiruvda uni yangilaydi', () => {
    applyWebTheme(lightColors);
    applyWebTheme(darkColors);

    const styles = document.head.querySelectorAll('style#rn-web-theme');
    expect(styles).toHaveLength(1);
    expect(styles[0].textContent).toContain(darkColors.primary);
  });

  /** Yorug' rejim + to'q rasm: ilova to'q - brauzer paneli ham to'q bo'lsin. */
  it("manzil satri va sahifa foni ko'rsatilayotgan ko'rinishda", () => {
    applyWebTheme(darkColors);

    document.head.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      expect(meta.getAttribute('content')).toBe(darkColors.background);
    });
    // jsdom hex'ni rgb() ga aylantiradi - rangni o'zi bilan solishtiramiz.
    const probe = document.createElement('div');
    probe.style.backgroundColor = darkColors.background;
    expect(document.body.style.backgroundColor).toBe(probe.style.backgroundColor);
  });

  it("theme-color bo'lmasa yaratiladi", () => {
    document.head.innerHTML = '';
    applyWebTheme(lightColors);

    const metas = document.head.querySelectorAll('meta[name="theme-color"]');
    expect(metas).toHaveLength(1);
    expect(metas[0].getAttribute('content')).toBe(lightColors.background);
  });
});

describe('kirish usuli (halqa qachon chiziladi)', () => {
  beforeEach(() => applyWebTheme(lightColors));

  it('Tab klaviatura rejimini yoqadi, ekranga tegish o\'chiradi', () => {
    press({ key: 'Tab' });
    expect(root().hasAttribute(KEYBOARD_ATTR)).toBe(true);

    touch();
    expect(root().hasAttribute(KEYBOARD_ATTR)).toBe(false);
  });

  /**
   * Sichqoncha bilan bosib, keyin sahifani bo'sh joy/strelka bilan
   * aylantirgan odamda halqa chiqmasligi kerak.
   */
  it("bo'sh joy, strelka va Enter halqani yoqmaydi", () => {
    touch();
    press({ key: ' ' });
    press({ key: 'ArrowDown' });
    press({ key: 'Enter' });

    expect(root().hasAttribute(KEYBOARD_ATTR)).toBe(false);
  });

  it('Ctrl/Alt/Cmd+Tab - oyna almashtirish, sahifada yurish emas', () => {
    press({ key: 'Tab', ctrlKey: true });
    press({ key: 'Tab', altKey: true });
    press({ key: 'Tab', metaKey: true });
    expect(root().hasAttribute(KEYBOARD_ATTR)).toBe(false);

    press({ key: 'Tab', shiftKey: true });
    expect(root().hasAttribute(KEYBOARD_ATTR)).toBe(true);
  });

  /** Komponent hodisani to'xtatsa ham belgi to'g'ri qoladi (capture fazasi). */
  it("to'xtatilgan hodisani ham ko'radi", () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.addEventListener('keydown', (event) => event.stopPropagation());

    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(root().hasAttribute(KEYBOARD_ATTR)).toBe(true);

    button.remove();
  });

  it('tinglovchilar bir marta ulanadi', () => {
    const spy = jest.spyOn(document, 'addEventListener');
    applyWebTheme(darkColors);
    applyWebTheme(lightColors);

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
