/**
 * ProxiHealth App.js
 * Shared utilities and helpers across all pages
 */

const ProxiApp = (() => {
  'use strict';

  // --- JSON Loader with 3-second timeout fallback ---
  /**
   * Fetches a JSON file with a configurable timeout.
   * On timeout or network failure, calls onFallback instead of hanging forever.
   *
   * @param {string}   url        - Path to JSON file
   * @param {Function} onSuccess  - Called with parsed JSON data
   * @param {Function} onFallback - Called after timeoutMs with no data
   * @param {number}   timeoutMs  - Default 3000ms
   */
  function loadJSON(url, onSuccess, onFallback, timeoutMs = 3000) {
    let settled = false;

    // Timeout fires after timeoutMs if fetch hasn't resolved
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        console.warn(`[ProxiApp] JSON load timeout (${timeoutMs}ms): ${url}`);
        onFallback && onFallback();
      }
    }, timeoutMs);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          onSuccess(data);
        }
      })
      .catch((err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          console.error(`[ProxiApp] JSON load error: ${err.message}`);
          onFallback && onFallback();
        }
      });
  }

  // --- Show / hide loading + fallback UI ---
  function showLoading(loadingEl, fallbackEl) {
    if (loadingEl) loadingEl.style.display = 'flex';
    if (fallbackEl) fallbackEl.classList.remove('visible');
  }

  function hideLoading(loadingEl) {
    if (loadingEl) loadingEl.style.display = 'none';
  }

  function showFallback(loadingEl, fallbackEl) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (fallbackEl) fallbackEl.classList.add('visible');
  }

  // --- DOM helpers ---
  function $(selector, parent = document) {
    return parent.querySelector(selector);
  }

  function $$(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
  }

  function createElement(tag, className, html = '') {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (html) el.innerHTML = html;
    return el;
  }

  // --- Detect offline status ---
  function isOffline() {
    return !navigator.onLine;
  }

  function onOfflineChange(callback) {
    window.addEventListener('online',  () => callback(false));
    window.addEventListener('offline', () => callback(true));
  }

  // --- Active nav link highlighter ---
  function highlightNavLink() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav__link').forEach((link) => {
      const href = link.getAttribute('href');
      if (href && href.includes(path)) {
        link.classList.add('nav__link--active');
      }
    });
  }

  // --- Init (runs on every page) ---
  function init() {
    highlightNavLink();

    // Offline banner
    const body = document.body;
    function updateOfflineBanner(offline) {
      let banner = document.getElementById('offline-banner');
      if (offline) {
        if (!banner) {
          banner = createElement('div', 'status-banner status-banner--warn', '📵 You\'re offline — protocols still available');
          banner.id = 'offline-banner';
          banner.style.cssText = 'margin: 0; border-radius: 0; position: sticky; top: 60px; z-index: 90; justify-content: center;';
          body.insertBefore(banner, body.firstChild.nextSibling);
        }
      } else {
        if (banner) banner.remove();
      }
    }

    updateOfflineBanner(isOffline());
    onOfflineChange(updateOfflineBanner);
  }

  return {
    loadJSON,
    showLoading,
    hideLoading,
    showFallback,
    $,
    $$,
    createElement,
    isOffline,
    onOfflineChange,
    init,
  };
})();

document.addEventListener('DOMContentLoaded', () => ProxiApp.init());
window.ProxiApp = ProxiApp;
