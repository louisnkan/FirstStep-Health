/**
 * ProxiHealth Security Layer
 * - Right-click blocking
 * - Rate limiting (prevents API abuse)
 * - Basic XSS sanitization
 * - Keyboard shortcut blocking (dev tools deterrent)
 */

const ProxiSecurity = (() => {
  'use strict';

  // --- Right-click / context menu block ---
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  // --- Keyboard shortcut blocking (F12, Ctrl+U, Ctrl+Shift+I, etc.) ---
  document.addEventListener('keydown', (e) => {
    // F12
    if (e.key === 'F12') { e.preventDefault(); return false; }
    // Ctrl+U (view source)
    if (e.ctrlKey && e.key === 'u') { e.preventDefault(); return false; }
    // Ctrl+Shift+I / Ctrl+Shift+J (devtools)
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) {
      e.preventDefault(); return false;
    }
    // Ctrl+Shift+C (inspect)
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault(); return false;
    }
  });

  // --- Rate Limiter ---
  const rateLimiter = (() => {
    const limits = {};

    /**
     * Check if action is within rate limit.
     * @param {string} key   - Identifier (e.g. 'symptom-submit')
     * @param {number} max   - Max calls allowed
     * @param {number} windowMs - Window in milliseconds
     * @returns {boolean} true = allowed, false = blocked
     */
    function check(key, max = 10, windowMs = 60000) {
      const now = Date.now();
      if (!limits[key]) limits[key] = { count: 0, resetAt: now + windowMs };

      if (now > limits[key].resetAt) {
        limits[key] = { count: 0, resetAt: now + windowMs };
      }

      limits[key].count++;

      if (limits[key].count > max) {
        console.warn(`[ProxiSecurity] Rate limit hit: ${key}`);
        return false;
      }
      return true;
    }

    function reset(key) {
      delete limits[key];
    }

    return { check, reset };
  })();

  // --- XSS Sanitizer ---
  function sanitize(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // --- Safe innerHTML setter ---
  function safeSetHTML(element, html) {
    // Only allow a narrow subset of tags
    const allowed = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '');
    element.innerHTML = allowed;
  }

  // --- Expose public API ---
  return {
    rateLimiter,
    sanitize,
    safeSetHTML,
  };
})();

window.ProxiSecurity = ProxiSecurity;
