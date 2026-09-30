/* Shenhai B2X cookie consent: one banner for every app, loaded in <head> before the app bundle.
   - Holds back Google / Facebook / Telegram sign-in scripts until the user allows them.
   - Stores { level: "necessary" | "all", version, at } in localStorage "b2x_consent".
   - Reopen from any element with [data-cookie-settings] or window.b2xConsent.open().
   - Config on the <script> tag: data-policy="/legal/cookie" (cookie policy link). */
(function () {
  var KEY = 'b2x_consent', VERSION = '2026-09-30';
  var tag = document.currentScript;
  var POLICY = (tag && tag.getAttribute('data-policy')) || '/privacy';
  var GATED = /(^|\.)(accounts\.google\.com|connect\.facebook\.net|telegram\.org)$/i;
  var T = {
    en: ['We use only the cookies needed to keep you signed in. Google, Facebook and Telegram sign-in load their own scripts and cookies only if you allow them.', 'Necessary only', 'Allow all', 'Cookie policy'],
    sw: ['Tunatumia vidakuzi vinavyohitajika tu ili ubaki umeingia. Kuingia kwa Google, Facebook na Telegram hupakia hati na vidakuzi vyao ukiviruhusu tu.', 'Vinavyohitajika tu', 'Ruhusu vyote', 'Sera ya vidakuzi'],
    fr: ['Nous utilisons uniquement les cookies nécessaires pour vous garder connecté. La connexion Google, Facebook et Telegram charge ses propres scripts et cookies seulement si vous l\u2019autorisez.', 'Nécessaires uniquement', 'Tout autoriser', 'Politique de cookies'],
    ar: ['نستخدم فقط ملفات تعريف الارتباط اللازمة لإبقائك مسجلاً الدخول. تسجيل الدخول عبر Google وFacebook وTelegram يحمّل نصوصه وملفاته فقط إذا سمحت بذلك.', 'الضرورية فقط', 'السماح بالكل', 'سياسة ملفات تعريف الارتباط'],
    es: ['Solo usamos las cookies necesarias para mantener tu sesión. El acceso con Google, Facebook y Telegram carga sus propios scripts y cookies solo si lo permites.', 'Solo necesarias', 'Permitir todas', 'Política de cookies'],
    pt: ['Usamos apenas os cookies necessários para manter a sua sessão. O login com Google, Facebook e Telegram carrega os seus scripts e cookies apenas se permitir.', 'Apenas necessários', 'Permitir todos', 'Política de cookies'],
    de: ['Wir verwenden nur die Cookies, die für Ihre Anmeldung nötig sind. Die Anmeldung mit Google, Facebook und Telegram lädt eigene Skripte und Cookies nur, wenn Sie zustimmen.', 'Nur notwendige', 'Alle erlauben', 'Cookie-Richtlinie']
  };
  var S = { en: 'Cookie settings', sw: 'Mipangilio ya vidakuzi', fr: 'Paramètres des cookies', ar: 'إعدادات ملفات تعريف الارتباط', es: 'Configuración de cookies', pt: 'Definições de cookies', de: 'Cookie-Einstellungen' };
  var FLOAT = !!(tag && tag.hasAttribute('data-floating-settings'));
  function read() { try { var v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && v.version === VERSION ? v : null; } catch (e) { return null; } }
  var state = read(), held = [], seen = {};
  function allowAll() { return !!(state && state.level === 'all'); }
  function gated(el) { try { return el && el.tagName === 'SCRIPT' && el.src && GATED.test(new URL(el.src, location.href).hostname); } catch (e) { return false; } }
  var orig = { appendChild: Node.prototype.appendChild, insertBefore: Node.prototype.insertBefore };
  Node.prototype.appendChild = function (el) {
    if (gated(el) && !allowAll()) { if (!seen[el.src]) { seen[el.src] = 1; held.push([this, el]); } return el; }
    return orig.appendChild.apply(this, arguments);
  };
  Node.prototype.insertBefore = function (el) {
    if (gated(el) && !allowAll()) { if (!seen[el.src]) { seen[el.src] = 1; held.push([this, el]); } return el; }
    return orig.insertBefore.apply(this, arguments);
  };
  function flush() { var q = held; held = []; q.forEach(function (p) { try { orig.appendChild.call(p[0].isConnected ? p[0] : document.head, p[1]); } catch (e) { /* ignore */ } }); }
  function save(level) {
    state = { level: level, version: VERSION, at: new Date().toISOString() };
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
    close(); pill();
    if (level === 'all') flush(); else if (Object.keys(seen).length) location.reload();
    try { window.dispatchEvent(new CustomEvent('b2x-consent', { detail: state })); } catch (e) { /* old browser */ }
  }
  var box = null;
  function close() { if (box) { box.remove(); box = null; } }
  function open() {
    if (box || !document.body) return;
    var lang = (document.documentElement.lang || navigator.language || 'en').slice(0, 2).toLowerCase();
    var t = T[lang] || T.en, rtl = lang === 'ar';
    box = document.createElement('div');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Cookie consent'); box.dir = rtl ? 'rtl' : 'ltr';
    box.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;max-width:760px;margin:0 auto;display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:14px 16px;border-radius:12px;background:#111827;color:#f9fafb;font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35)';
    var p = document.createElement('p'); p.style.cssText = 'margin:0;flex:1 1 320px';
    p.appendChild(document.createTextNode(t[0] + ' '));
    var a = document.createElement('a'); a.href = POLICY; a.textContent = t[3]; a.style.cssText = 'color:#93c5fd;text-decoration:underline';
    p.appendChild(a); box.appendChild(p);
    var btn = 'flex:0 0 auto;padding:9px 14px;border-radius:8px;border:1px solid #f9fafb;font:inherit;font-weight:600;cursor:pointer;';
    var n = document.createElement('button'); n.type = 'button'; n.textContent = t[1]; n.style.cssText = btn + 'background:transparent;color:#f9fafb'; n.onclick = function () { save('necessary'); };
    var y = document.createElement('button'); y.type = 'button'; y.textContent = t[2]; y.style.cssText = btn + 'background:#f9fafb;color:#111827'; y.onclick = function () { save('all'); };
    box.appendChild(n); box.appendChild(y);
    orig.appendChild.call(document.body, box);
  }
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest && e.target.closest('[data-cookie-settings]');
    if (el) { e.preventDefault(); open(); }
  });
  // Small reopen button for apps without a footer link (data-floating-settings on the script tag).
  function pill() {
    if (!FLOAT || !document.body || document.getElementById('b2x-cookie-pill')) return;
    var lang = (document.documentElement.lang || navigator.language || 'en').slice(0, 2).toLowerCase();
    var b = document.createElement('button'); b.id = 'b2x-cookie-pill'; b.type = 'button'; b.setAttribute('data-cookie-settings', '');
    b.textContent = S[lang] || S.en;
    b.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:2147482000;padding:5px 10px;border-radius:999px;border:1px solid rgba(127,127,127,.4);background:rgba(17,24,39,.72);color:#f9fafb;font:12px system-ui,-apple-system,Segoe UI,sans-serif;cursor:pointer;opacity:.8';
    orig.appendChild.call(document.body, b);
  }
  // Terms notice under any form with a password field (sign-up / sign-in). Skips forms that already carry agreement text.
  var N = {
    en: ['By continuing, you agree to the', 'Terms', 'and acknowledge the', 'Privacy policy'],
    sw: ['Kwa kuendelea, unakubali', 'Masharti', 'na unatambua', 'Sera ya faragha'],
    fr: ['En continuant, vous acceptez les', 'Conditions', 'et reconnaissez la', 'Politique de confidentialité'],
    ar: ['بالمتابعة، فإنك توافق على', 'الشروط', 'وتقرّ بـ', 'سياسة الخصوصية'],
    es: ['Al continuar, aceptas los', 'Términos', 'y reconoces la', 'Política de privacidad'],
    pt: ['Ao continuar, você aceita os', 'Termos', 'e reconhece a', 'Política de privacidade'],
    de: ['Mit dem Fortfahren stimmen Sie den', 'Bedingungen', 'zu und bestätigen die', 'Datenschutzerklärung']
  };
  var NOTICE = !(tag && tag.hasAttribute('data-no-terms-notice'));
  function addNotices() {
    if (!NOTICE || !document.body) return;
    var inputs = document.querySelectorAll('input[type="password"]');
    for (var i = 0; i < inputs.length; i++) {
      var el = inputs[i], host = el.closest('form');
      for (var up = 0; !host && up < 6 && el.parentElement; up++) { el = el.parentElement; if (el.querySelector('button, [type="submit"]')) host = el; }
      if (!host || host.querySelector('[data-b2x-terms]')) continue;
      if (host.querySelector('a[href*="terms"]') || /agree to|I agree|accept the/i.test(host.textContent || '')) continue;
      var lang = (document.documentElement.lang || navigator.language || 'en').slice(0, 2).toLowerCase(), t = N[lang] || N.en;
      var p = document.createElement('p'); p.setAttribute('data-b2x-terms', '');
      p.style.cssText = 'margin:10px 0 0;font-size:12px;line-height:1.4;opacity:.75;text-align:center';
      p.appendChild(document.createTextNode(t[0] + ' '));
      var a1 = document.createElement('a'); a1.href = '/legal/terms'; a1.target = '_blank'; a1.rel = 'noopener'; a1.textContent = t[1]; p.appendChild(a1);
      p.appendChild(document.createTextNode(' ' + t[2] + ' '));
      var a2 = document.createElement('a'); a2.href = '/legal/privacy'; a2.target = '_blank'; a2.rel = 'noopener'; a2.textContent = t[3]; p.appendChild(a2);
      p.appendChild(document.createTextNode('.'));
      orig.appendChild.call(host, p);
    }
  }
  var pending = false;
  function schedule() { if (pending) return; pending = true; (window.requestAnimationFrame || setTimeout)(function () { pending = false; addNotices(); }); }
  function watch() { addNotices(); try { new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true }); } catch (e) { /* old browser */ } }
  window.b2xConsent = { get: function () { return state; }, open: open, allowAll: allowAll, version: VERSION };
  function start() { if (!state) open(); else pill(); watch(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
