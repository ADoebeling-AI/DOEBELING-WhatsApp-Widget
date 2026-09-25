/*!
 * WhatsApp Widget v0.2.0-draft
 * https://github.com/DOEBELING/WhatsApp-Widget
 * License: GPL-3.0-or-later
 *
 * Looks like a live chat, but only opens WhatsApp (app or web) with a
 * prefilled message. No backend, no cookies, no tracking, no external requests.
 *
 * WhatsApp icon: Font Awesome Free 6 by @fontawesome - https://fontawesome.com
 * License: CC BY 4.0 - https://fontawesome.com/license/free
 */
(() => {
  'use strict';

  const VERSION = '0.2.0-draft';
  const LOG_PREFIX = '[WhatsAppWidget]';
  const EVENT_PREFIX = 'whatsapp-widget:';
  const MAX_WELCOME_MESSAGES = 3;

  const DEFAULTS = {
    phone: '',            // required, international format, e.g. '+49 911 1234567'
    name: '',             // contact name in the header
    avatar: '',           // image URL; empty = initials
    status: '',           // text below the name, e.g. 'Usually replies within a day'
    welcome: [],          // 1-3 welcome messages
    placeholder: '',      // empty = localised default
    lang: '',             // 'de' | 'en'; empty = <html lang>, fallback 'en'
    position: 'right',    // 'right' | 'left'
    launcher: true,       // show the floating button
    badge: true,          // show unread badge on the launcher until first open
    autoOpen: false,      // false | seconds until the chat opens by itself
    target: 'auto',       // 'auto' (wa.me) | 'web' (WhatsApp Web) | 'app' (whatsapp://)
    theme: 'light',       // 'light' | 'dark' | 'auto'
    color: '',            // primary colour for header, launcher and send button
    privacyNotice: null,  // null = localised default, '' = hide
    privacyUrl: '',       // link to your privacy policy
    typing: true,         // "typing…" animation before welcome messages
  };

  const I18N = {
    en: {
      open: 'Open WhatsApp chat',
      close: 'Close chat',
      placeholder: 'Type a message',
      inputLabel: 'Your message',
      send: 'Send',
      typing: 'typing…',
      privacy: 'Nothing you type here is stored or transmitted. “Send” opens WhatsApp, where the privacy policy of WhatsApp (Meta) applies.',
      privacyLink: 'Privacy policy',
      opened: 'WhatsApp has been opened in a new tab. Please send your message there.',
      reopen: 'Open WhatsApp again',
      unread: (n) => `${n} unread message${n === 1 ? '' : 's'}`,
    },
    de: {
      open: 'WhatsApp-Chat öffnen',
      close: 'Chat schließen',
      placeholder: 'Nachricht schreiben',
      inputLabel: 'Deine Nachricht',
      send: 'Senden',
      typing: 'schreibt …',
      privacy: 'Hier wird nichts gespeichert oder übertragen. „Senden“ öffnet WhatsApp – dort gilt die Datenschutzerklärung von WhatsApp (Meta).',
      privacyLink: 'Datenschutzerklärung',
      opened: 'WhatsApp wurde in einem neuen Tab geöffnet. Bitte sende deine Nachricht dort ab.',
      reopen: 'WhatsApp erneut öffnen',
      unread: (n) => `${n} ungelesene Nachricht${n === 1 ? '' : 'en'}`,
    },
  };

  const ICONS = {
    whatsapp: '<svg viewBox="0 0 448 512" aria-hidden="true" focusable="false"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7a1 1 0 0 0-1.4 1.4l4.9 4.9-4.9 4.9a1 1 0 1 0 1.4 1.4l4.9-4.9 4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4z"/></svg>',
    send: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10.1 15 12 3.4 13.9z"/></svg>',
    ticks: '<svg viewBox="0 0 16 11" aria-hidden="true" focusable="false"><path d="M11.1.6 4.9 7.9 2.3 5.4l-.9.9 3.5 3.5L12 1.5zM15.1.6 8.9 7.9l-.6-.6-.9 1 1.5 1.5L16 1.5z"/></svg>',
  };

  const STYLES = `
    :host { all: initial; }
    *, *::before, *::after { box-sizing: border-box; }
    [hidden] { display: none !important; }

    .waw {
      --_primary: var(--waw-color, #075e54);
      --_launcher: var(--waw-launcher-color, var(--waw-color, #25d366));
      --_header-fg: var(--waw-header-text, #fff);
      --_chat-bg: var(--waw-chat-bg, #efeae2);
      --_panel-bg: var(--waw-panel-bg, #f0f2f5);
      --_bubble-in: var(--waw-bubble-in, #fff);
      --_bubble-out: var(--waw-bubble-out, #d9fdd3);
      --_input-bg: var(--waw-input-bg, #fff);
      --_notice-bg: var(--waw-notice-bg, #ffeecd);
      --_text: var(--waw-text, #111b21);
      --_muted: var(--waw-muted, #667781);
      --_offset: var(--waw-offset, 20px);
      position: fixed;
      bottom: var(--_offset);
      right: var(--_offset);
      z-index: var(--waw-z-index, 2147483000);
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 12px;
      font: 14px/1.4 var(--waw-font, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif);
      color: var(--_text);
      -webkit-font-smoothing: antialiased;
    }
    .waw[data-position="left"] { right: auto; left: var(--_offset); align-items: flex-start; }

    .waw[data-theme="dark"] {
      --_primary: var(--waw-color, #202c33);
      --_chat-bg: var(--waw-chat-bg, #0b141a);
      --_panel-bg: var(--waw-panel-bg, #202c33);
      --_bubble-in: var(--waw-bubble-in, #202c33);
      --_bubble-out: var(--waw-bubble-out, #005c4b);
      --_input-bg: var(--waw-input-bg, #2a3942);
      --_notice-bg: var(--waw-notice-bg, #182229);
      --_text: var(--waw-text, #e9edef);
      --_muted: var(--waw-muted, #8696a0);
    }
    @media (prefers-color-scheme: dark) {
      .waw[data-theme="auto"] {
        --_primary: var(--waw-color, #202c33);
        --_chat-bg: var(--waw-chat-bg, #0b141a);
        --_panel-bg: var(--waw-panel-bg, #202c33);
        --_bubble-in: var(--waw-bubble-in, #202c33);
        --_bubble-out: var(--waw-bubble-out, #005c4b);
      --_input-bg: var(--waw-input-bg, #2a3942);
        --_notice-bg: var(--waw-notice-bg, #182229);
        --_text: var(--waw-text, #e9edef);
        --_muted: var(--waw-muted, #8696a0);
      }
    }

    button { font: inherit; color: inherit; cursor: pointer; }
    button:focus-visible, textarea:focus-visible, a:focus-visible {
      outline: 2px solid var(--_launcher);
      outline-offset: 2px;
    }
    .waw-sr {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
    }

    /* Chat window */
    .waw-window {
      display: flex;
      flex-direction: column;
      width: min(360px, calc(100vw - 2 * var(--_offset)));
      height: min(520px, calc(100vh - 120px));
      height: min(520px, calc(100dvh - 120px));
      overflow: hidden;
      background: var(--_chat-bg);
      border-radius: 16px;
      box-shadow: 0 12px 40px rgba(11, 20, 26, .28), 0 2px 8px rgba(11, 20, 26, .16);
      opacity: 0;
      transform: translateY(16px) scale(.96);
      transform-origin: bottom right;
      transition: opacity .2s ease, transform .2s ease;
    }
    .waw[data-position="left"] .waw-window { transform-origin: bottom left; }
    .waw-window.is-open { opacity: 1; transform: none; }

    .waw-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 8px 12px 14px;
      background: var(--_primary);
      color: var(--_header-fg);
    }
    .waw-avatar {
      flex: 0 0 40px;
      width: 40px; height: 40px;
      border-radius: 50%;
      overflow: hidden;
      display: grid; place-items: center;
      background: rgba(255, 255, 255, .2);
      font-weight: 600;
      font-size: 15px;
      letter-spacing: .02em;
    }
    .waw-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .waw-avatar svg { width: 22px; height: 22px; fill: currentColor; }
    .waw-contact { flex: 1; min-width: 0; }
    .waw-name { font-weight: 600; font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .waw-status { font-size: 13px; opacity: .85; min-height: 1.4em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .waw-close {
      flex: 0 0 40px; width: 40px; height: 40px;
      display: grid; place-items: center;
      border: 0; border-radius: 50%;
      background: transparent;
      color: var(--_header-fg);
    }
    .waw-close:hover { background: rgba(255, 255, 255, .15); }
    .waw-close svg { width: 22px; height: 22px; fill: currentColor; }

    /* Messages */
    .waw-messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      overscroll-behavior: contain;
    }
    .waw-notice {
      align-self: center;
      max-width: 92%;
      margin: 0 0 8px;
      padding: 6px 10px;
      border-radius: 8px;
      background: var(--_notice-bg);
      color: var(--_muted);
      font-size: 12.5px;
      text-align: center;
      box-shadow: 0 1px .5px rgba(11, 20, 26, .13);
    }
    .waw-notice a { color: inherit; }
    .waw-bubble {
      position: relative;
      max-width: 85%;
      padding: 6px 8px 8px 10px;
      border-radius: 8px;
      background: var(--_bubble-in);
      box-shadow: 0 1px .5px rgba(11, 20, 26, .13);
      white-space: pre-line;
      overflow-wrap: anywhere;
      animation: waw-pop .18s ease-out;
    }
    .waw-bubble.in { align-self: flex-start; border-top-left-radius: 0; }
    .waw-bubble.out { align-self: flex-end; border-top-right-radius: 0; background: var(--_bubble-out); }
    .waw-bubble.in::before, .waw-bubble.out::before {
      content: "";
      position: absolute;
      top: 0;
      width: 8px; height: 12px;
      background: inherit;
    }
    .waw-bubble.in::before { left: -8px; clip-path: polygon(0 0, 100% 0, 100% 100%); }
    .waw-bubble.out::before { right: -8px; clip-path: polygon(0 0, 100% 0, 0 100%); }
    .waw-meta {
      float: right;
      margin: 6px 0 -4px 12px;
      font-size: 11px;
      color: var(--_muted);
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }
    .waw-meta svg { width: 16px; height: 11px; fill: #53bdeb; }
    .waw-bubble.info { align-self: center; background: var(--_notice-bg); color: var(--_muted); font-size: 12.5px; text-align: center; }
    .waw-bubble.info::before { display: none; }
    .waw-bubble.info a { color: inherit; font-weight: 600; }

    .waw-dots { display: inline-flex; gap: 4px; padding: 4px 2px; }
    .waw-dots span {
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--_muted);
      animation: waw-blink 1.2s infinite ease-in-out both;
    }
    .waw-dots span:nth-child(2) { animation-delay: .15s; }
    .waw-dots span:nth-child(3) { animation-delay: .3s; }

    /* Composer */
    .waw-composer {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      padding: 8px 10px 10px;
      background: var(--_panel-bg);
    }
    .waw-input {
      flex: 1;
      min-height: 42px;
      max-height: 120px;
      padding: 10px 14px;
      border: 0;
      border-radius: 21px;
      background: var(--_input-bg);
      color: var(--_text);
      font: inherit;
      font-size: 15px;
      line-height: 22px;
      resize: none;
      outline: none;
    }
    .waw-input::placeholder { color: var(--_muted); }
    .waw-send {
      flex: 0 0 42px; width: 42px; height: 42px;
      display: grid; place-items: center;
      border: 0; border-radius: 50%;
      background: var(--_launcher);
      color: #fff;
      transition: opacity .15s ease, transform .15s ease;
    }
    .waw-send svg { width: 20px; height: 20px; fill: currentColor; margin-left: 2px; }
    .waw-send:disabled { opacity: .45; cursor: default; }
    .waw-send:not(:disabled):hover { transform: scale(1.06); }

    /* Launcher */
    .waw-launcher {
      position: relative;
      width: 60px; height: 60px;
      display: grid; place-items: center;
      border: 0; border-radius: 50%;
      background: var(--_launcher);
      color: #fff;
      box-shadow: 0 6px 20px rgba(11, 20, 26, .3);
      transition: transform .2s ease;
    }
    .waw-launcher:hover { transform: scale(1.06); }
    .waw-launcher svg { width: 32px; height: 32px; fill: currentColor; }
    .waw-launcher .waw-icon-close { display: none; }
    .waw-launcher[aria-expanded="true"] .waw-icon-open { display: none; }
    .waw-launcher[aria-expanded="true"] .waw-icon-close { display: grid; }
    .waw-badge {
      position: absolute;
      top: -2px; right: -2px;
      min-width: 22px; height: 22px;
      padding: 0 6px;
      border-radius: 11px;
      background: #e53935;
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      line-height: 22px;
      text-align: center;
      box-shadow: 0 0 0 2px #fff;
    }

    @keyframes waw-pop { from { opacity: 0; transform: translateY(4px); } }
    @keyframes waw-blink { 0%, 80%, 100% { opacity: .3; } 40% { opacity: 1; } }

    @media (prefers-reduced-motion: reduce) {
      .waw-window, .waw-launcher, .waw-send { transition: none; }
      .waw-bubble { animation: none; }
      .waw-dots span { animation: none; opacity: .6; }
    }
  `;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const prefersReducedMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === false || value === null || value === undefined) continue;
      if (key === 'className') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'html') node.innerHTML = value; // only used for our own static icons
      else node.setAttribute(key, value === true ? '' : value);
    }
    for (const child of [].concat(children)) {
      if (child) node.append(child);
    }
    return node;
  }

  function toBoolean(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'boolean') return value;
    return !['false', '0', 'no', 'off'].includes(String(value).trim().toLowerCase());
  }

  function toSeconds(value) {
    if (value === undefined || value === null || value === false || value === '') return false;
    if (value === true) return 0;
    const seconds = Number(value);
    return Number.isFinite(seconds) && seconds >= 0 ? seconds : false;
  }

  /**
   * Normalises a phone number to the digits-only international format that
   * WhatsApp expects ("+49 (0) 911 12 34-5" -> "49911123345").
   */
  function normalizePhone(value) {
    let phone = String(value || '').replace(/\(0\)/g, '').replace(/[^\d+]/g, '');
    if (phone.startsWith('+')) phone = phone.slice(1);
    else if (phone.startsWith('00')) phone = phone.slice(2);
    else if (phone.startsWith('0')) {
      console.error(`${LOG_PREFIX} "phone" must be in international format, e.g. "+49 911 1234567" instead of "0911 1234567".`);
      return '';
    }
    phone = phone.replace(/\D/g, '');
    if (phone.length < 7 || phone.length > 15) {
      console.error(`${LOG_PREFIX} "phone" is missing or invalid: "${value}".`);
      return '';
    }
    return phone;
  }

  function buildUrl(phone, text, target) {
    const message = encodeURIComponent(text || '');
    switch (target) {
      case 'web':
        return `https://web.whatsapp.com/send?phone=${phone}&text=${message}`;
      case 'app':
        return `whatsapp://send?phone=${phone}&text=${message}`;
      default:
        return `https://wa.me/${phone}${message ? `?text=${message}` : ''}`;
    }
  }

  function detectLanguage(preferred) {
    const candidates = [preferred, document.documentElement.lang, navigator.language];
    for (const candidate of candidates) {
      const lang = String(candidate || '').slice(0, 2).toLowerCase();
      if (I18N[lang]) return lang;
    }
    return 'en';
  }

  function initials(name) {
    return String(name || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  }

  function readScriptConfig(script) {
    if (!script || !script.dataset) return null;
    const data = script.dataset;
    if (!data.phone) return null;
    return {
      phone: data.phone,
      name: data.name,
      avatar: data.avatar,
      status: data.status,
      welcome: data.welcome ? data.welcome.split('|') : undefined,
      placeholder: data.placeholder,
      lang: data.lang,
      position: data.position,
      launcher: data.launcher,
      badge: data.badge,
      autoOpen: data.autoOpen,
      target: data.target,
      theme: data.theme,
      color: data.color,
      privacyNotice: data.privacyNotice,
      privacyUrl: data.privacyUrl,
      typing: data.typing,
    };
  }

  function normalizeConfig(input) {
    const raw = {};
    for (const [key, value] of Object.entries(input || {})) {
      if (value !== undefined) raw[key] = value;
    }
    const config = { ...DEFAULTS, ...raw };

    config.phone = normalizePhone(config.phone);
    config.welcome = [].concat(config.welcome || [])
      .map((message) => String(message).trim())
      .filter(Boolean);
    if (config.welcome.length > MAX_WELCOME_MESSAGES) {
      console.warn(`${LOG_PREFIX} Only the first ${MAX_WELCOME_MESSAGES} welcome messages are shown.`);
      config.welcome = config.welcome.slice(0, MAX_WELCOME_MESSAGES);
    }
    config.lang = detectLanguage(config.lang);
    config.position = config.position === 'left' ? 'left' : 'right';
    config.launcher = toBoolean(config.launcher, true);
    config.badge = toBoolean(config.badge, true);
    config.typing = toBoolean(config.typing, true);
    config.autoOpen = toSeconds(config.autoOpen);
    config.target = ['web', 'app'].includes(config.target) ? config.target : 'auto';
    config.theme = ['dark', 'auto'].includes(config.theme) ? config.theme : 'light';
    return config;
  }

  // ---------------------------------------------------------------------------
  // Widget
  // ---------------------------------------------------------------------------

  class Widget {
    constructor(config) {
      this.config = config;
      this.t = I18N[config.lang];
      this.isOpen = false;
      this.welcomePlayed = false;
      this.timers = [];
      this.returnFocus = null;
      this.onDocumentClick = this.onDocumentClick.bind(this);
      this.render();
      document.addEventListener('click', this.onDocumentClick);
      if (config.autoOpen !== false) this.scheduleAutoOpen(config.autoOpen);
    }

    render() {
      const { config, t } = this;

      this.host = el('whatsapp-widget');
      if (config.color) this.host.style.setProperty('--waw-color', config.color);
      const root = this.host.attachShadow({ mode: 'open' });
      this.root = root;

      const avatar = el('div', { className: 'waw-avatar', 'aria-hidden': 'true' });
      if (config.avatar) avatar.append(el('img', { src: config.avatar, alt: '' }));
      else if (initials(config.name)) avatar.textContent = initials(config.name);
      else avatar.innerHTML = ICONS.whatsapp;

      this.statusEl = el('div', { className: 'waw-status', text: config.status });
      this.closeButton = el('button', {
        type: 'button', className: 'waw-close', 'aria-label': t.close, html: ICONS.close,
      });

      this.messagesEl = el('div', { className: 'waw-messages', role: 'log', 'aria-live': 'polite' });
      const notice = config.privacyNotice === null ? t.privacy : String(config.privacyNotice);
      if (notice) {
        const noticeEl = el('p', { className: 'waw-notice', text: `${notice} ` });
        if (config.privacyUrl) {
          noticeEl.append(el('a', {
            href: config.privacyUrl, target: '_blank', rel: 'noopener', text: t.privacyLink,
          }));
        }
        this.messagesEl.append(noticeEl);
      }

      this.input = el('textarea', {
        id: 'waw-input',
        className: 'waw-input',
        rows: '1',
        placeholder: config.placeholder || t.placeholder,
        enterkeyhint: 'send',
      });
      this.sendButton = el('button', {
        type: 'submit', className: 'waw-send', 'aria-label': t.send, disabled: true, html: ICONS.send,
      });
      this.form = el('form', { className: 'waw-composer' }, [
        el('label', { className: 'waw-sr', for: 'waw-input', text: t.inputLabel }),
        this.input,
        this.sendButton,
      ]);

      this.window = el('section', {
        className: 'waw-window',
        role: 'dialog',
        'aria-labelledby': 'waw-name',
        hidden: true,
      }, [
        el('header', { className: 'waw-header' }, [
          avatar,
          el('div', { className: 'waw-contact' }, [
            el('div', { className: 'waw-name', id: 'waw-name', text: config.name || 'WhatsApp' }),
            this.statusEl,
          ]),
          this.closeButton,
        ]),
        this.messagesEl,
        this.form,
      ]);

      const wrapper = el('div', {
        className: 'waw',
        'data-position': config.position,
        'data-theme': config.theme,
        lang: config.lang,
      }, [this.window]);

      if (config.launcher) {
        this.launcher = el('button', {
          type: 'button', className: 'waw-launcher', 'aria-label': t.open, 'aria-expanded': 'false',
        }, [
          el('span', { className: 'waw-icon-open', html: ICONS.whatsapp }),
          el('span', { className: 'waw-icon-close', html: ICONS.close }),
        ]);
        const unread = config.welcome.length;
        if (config.badge && unread) {
          this.badge = el('span', { className: 'waw-badge', text: String(unread) });
          this.badge.append(el('span', { className: 'waw-sr', text: `, ${t.unread(unread)}` }));
          this.launcher.append(this.badge);
        }
        this.launcher.addEventListener('click', () => this.toggle());
        wrapper.append(this.launcher);
      }

      root.append(el('style', { text: STYLES }), wrapper);

      this.closeButton.addEventListener('click', () => this.close());
      this.window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') this.close();
      });
      this.input.addEventListener('input', () => this.updateComposer());
      this.input.addEventListener('keydown', (event) => {
        const coarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && !coarsePointer) {
          event.preventDefault();
          this.send();
        }
      });
      this.form.addEventListener('submit', (event) => {
        event.preventDefault();
        this.send();
      });

      document.body.append(this.host);
    }

    // Public API ---------------------------------------------------------------

    open(options = {}) {
      if (typeof options.message === 'string') this.input.value = options.message;
      if (this.isOpen) {
        this.updateComposer();
        if (options.focus !== false) this.focusInput();
        return;
      }
      this.isOpen = true;
      this.returnFocus = document.activeElement;
      this.window.hidden = false;
      this.updateComposer(); // needs a visible textarea to measure its height
      void this.window.offsetWidth; // restart the CSS transition
      this.window.classList.add('is-open');
      if (this.launcher) this.launcher.setAttribute('aria-expanded', 'true');
      if (this.badge) {
        this.badge.remove();
        this.badge = null;
      }
      if (options.focus !== false) this.focusInput();
      if (!this.welcomePlayed) this.playWelcome();
      this.emit('open', { auto: Boolean(options.auto) });
    }

    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.window.classList.remove('is-open');
      if (this.launcher) this.launcher.setAttribute('aria-expanded', 'false');
      const hide = () => {
        if (!this.isOpen) this.window.hidden = true;
      };
      if (prefersReducedMotion()) hide();
      else this.later(hide, 200);
      if (this.root.activeElement) {
        const target = this.returnFocus && this.returnFocus !== document.body && this.returnFocus !== this.host
          ? this.returnFocus
          : this.launcher;
        if (target && typeof target.focus === 'function') target.focus();
      }
      this.emit('close');
    }

    toggle(options) {
      if (this.isOpen) this.close();
      else this.open(options);
    }

    destroy() {
      this.timers.forEach(clearTimeout);
      document.removeEventListener('click', this.onDocumentClick);
      this.host.remove();
    }

    // Internals ----------------------------------------------------------------

    send() {
      const message = this.input.value.trim();
      if (!message) return;

      const url = buildUrl(this.config.phone, message, this.config.target);
      const proceed = this.emit('send', { message, url }, true);
      if (!proceed) return;

      // Open WhatsApp synchronously inside the click/keypress handler,
      // otherwise browsers treat it as an unwanted popup.
      if (this.config.target === 'app') window.location.href = url;
      else window.open(url, '_blank', 'noopener');

      this.addBubble('out', message);
      this.input.value = '';
      this.updateComposer();

      const info = el('div', { className: 'waw-bubble info', text: `${this.t.opened} ` });
      info.append(el('a', { href: url, target: '_blank', rel: 'noopener', text: this.t.reopen }));
      this.messagesEl.append(info);
      this.scrollToBottom();
    }

    async playWelcome() {
      this.welcomePlayed = true;
      const animate = this.config.typing && !prefersReducedMotion();
      for (const message of this.config.welcome) {
        if (animate) {
          this.statusEl.textContent = this.t.typing;
          const typing = el('div', { className: 'waw-bubble in', 'aria-hidden': 'true' }, [
            el('span', { className: 'waw-dots' }, [el('span'), el('span'), el('span')]),
          ]);
          this.messagesEl.append(typing);
          this.scrollToBottom();
          await sleep(Math.min(2200, Math.max(900, message.length * 25)));
          typing.remove();
        }
        this.addBubble('in', message);
      }
      this.statusEl.textContent = this.config.status;
    }

    addBubble(direction, text) {
      const time = new Date().toLocaleTimeString(this.config.lang, { hour: '2-digit', minute: '2-digit' });
      const meta = el('span', { className: 'waw-meta' }, [el('span', { text: time })]);
      if (direction === 'out') meta.insertAdjacentHTML('beforeend', ICONS.ticks);
      const bubble = el('div', { className: `waw-bubble ${direction}` }, [
        el('span', { text }),
        meta,
      ]);
      this.messagesEl.append(bubble);
      this.scrollToBottom();
    }

    updateComposer() {
      this.sendButton.disabled = this.input.value.trim().length === 0;
      this.input.style.height = 'auto';
      this.input.style.height = `${Math.min(this.input.scrollHeight, 120)}px`;
    }

    focusInput() {
      this.input.focus({ preventScroll: true });
    }

    scrollToBottom() {
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    }

    scheduleAutoOpen(seconds) {
      // Auto-open is skipped on small screens, where the chat would cover the page.
      const smallScreen = window.matchMedia && window.matchMedia('(max-width: 600px)').matches;
      if (smallScreen) return;
      this.later(() => {
        if (!this.isOpen) this.open({ focus: false, auto: true });
      }, seconds * 1000);
    }

    onDocumentClick(event) {
      const trigger = event.target.closest && event.target.closest('[data-wa-open]');
      if (!trigger) return;
      event.preventDefault();
      const message = trigger.getAttribute('data-wa-open');
      this.open(message ? { message } : {});
    }

    later(callback, ms) {
      this.timers.push(setTimeout(callback, ms));
    }

    emit(name, detail = {}, cancelable = false) {
      const event = new CustomEvent(EVENT_PREFIX + name, { detail, cancelable });
      return document.dispatchEvent(event);
    }
  }

  // ---------------------------------------------------------------------------
  // Public API and auto-init
  // ---------------------------------------------------------------------------

  let instance = null;

  function whenReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  const api = {
    version: VERSION,
    init(options) {
      const config = normalizeConfig(options);
      if (!config.phone) return null;
      whenReady(() => {
        if (instance) instance.destroy();
        instance = new Widget(config);
      });
      return api;
    },
    open(options) { if (instance) instance.open(options); },
    close() { if (instance) instance.close(); },
    toggle(options) { if (instance) instance.toggle(options); },
    destroy() {
      if (instance) instance.destroy();
      instance = null;
    },
    buildUrl(phone, message, target) {
      const normalized = normalizePhone(phone);
      return normalized ? buildUrl(normalized, message, target) : '';
    },
  };

  window.WhatsAppWidget = api;

  const scriptConfig = readScriptConfig(document.currentScript);
  if (scriptConfig) api.init(scriptConfig);
})();
