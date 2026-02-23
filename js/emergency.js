/**
 * ProxiHealth Emergency.js
 * Loads protocols from offline-tree.json with 3s timeout fallback
 * Single "Can't reach help" flow (no duplicate buttons)
 */

const ProxiEmergency = (() => {
  'use strict';

  let protocols = null;
  let currentProtocol = null;

  // --- DOM references ---
  const grid        = document.getElementById('protocol-grid');
  const viewer      = document.getElementById('protocol-viewer');
  const loadingEl   = document.getElementById('protocol-loading');
  const fallbackEl  = document.getElementById('protocol-fallback');
  const viewerTitle = document.getElementById('viewer-title');
  const viewerSteps = document.getElementById('viewer-steps');
  const backBtn     = document.getElementById('btn-back');

  // --- Inline fallback protocols (shown if JSON fails) ---
  const FALLBACK_PROTOCOLS = [
    {
      id: 'childbirth',
      title: 'Emergency Childbirth',
      icon: '🤱',
      severity: 'critical',
      steps: [
        { num: 1, text: 'Stay calm. Wash hands thoroughly.', note: '' },
        { num: 2, text: 'Lay mother down, knees bent. Do NOT pull the baby.', note: 'Let the baby come naturally.' },
        { num: 3, text: 'Support baby\'s head as it appears. Check for cord around neck.', note: 'Gently slip cord over head if present.' },
        { num: 4, text: 'After delivery, keep baby warm — skin-to-skin on chest.', note: 'Cover with blanket immediately.' },
        { num: 5, text: 'Do not cut cord until it stops pulsing. Get to a clinic as soon as possible.', note: '' }
      ]
    },
    {
      id: 'bleeding',
      title: 'Severe Bleeding',
      icon: '🩸',
      severity: 'critical',
      steps: [
        { num: 1, text: 'Press clean cloth HARD on wound. Do not lift to check.', note: 'Hold for 10-15 minutes.' },
        { num: 2, text: 'If blood soaks through, add more cloth on top — don\'t remove first layer.', note: '' },
        { num: 3, text: 'Lay person flat, raise legs 30cm if no spine injury.', note: '' },
        { num: 4, text: 'Get to emergency care immediately.', note: '' }
      ]
    },
    {
      id: 'cpr_adult',
      title: 'CPR — Adult',
      icon: '💓',
      severity: 'critical',
      steps: [
        { num: 1, text: 'Person unconscious and not breathing: begin CPR.', note: 'Send someone to call for help immediately.' },
        { num: 2, text: 'Push hard and fast on centre of chest — 100-120 times per minute.', note: 'Depth: 5-6cm. Release fully between compressions.' },
        { num: 3, text: 'After every 30 compressions: 2 rescue breaths.', note: 'Tilt head back, lift chin, pinch nose.' },
        { num: 4, text: 'Do not stop until help arrives or person breathes.', note: '' }
      ]
    }
  ];

  // --- Render protocol grid ---
  function renderGrid(data) {
    const protoData = data ? Object.values(data.protocols) : FALLBACK_PROTOCOLS;
    protocols = protoData;

    ProxiApp.hideLoading(loadingEl);

    const html = protoData.map(p => `
      <button
        class="protocol-card"
        data-id="${p.id}"
        aria-label="Open ${p.title} protocol"
      >
        <span class="protocol-card__icon">${p.icon}</span>
        <div class="protocol-card__title">${p.title}</div>
        <div class="protocol-card__desc">${p.description || ''}</div>
        <span class="protocol-card__severity severity--${p.severity}">
          ${p.severity === 'critical' ? '🔴 Critical' : p.severity === 'urgent' ? '🟡 Urgent' : '🟢 Moderate'}
        </span>
      </button>
    `).join('');

    grid.innerHTML = html;

    // Event delegation — one listener, not one per card
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.protocol-card');
      if (!card) return;
      openProtocol(card.dataset.id);
    });
  }

  // --- Open a specific protocol ---
  function openProtocol(id) {
    const p = protocols.find(pr => pr.id === id);
    if (!p) return;

    currentProtocol = p;

    // Update header
    viewerTitle.textContent = `${p.icon} ${p.title}`;

    // Build steps HTML
    const stepsHTML = p.steps.map(s => `
      <li class="emergency-step">
        <span class="emergency-step__num">${s.num}</span>
        <div class="emergency-step__text">
          ${ProxiSecurity.sanitize(s.text)}
          ${s.note ? `<div class="emergency-step__note">💡 ${ProxiSecurity.sanitize(s.note)}</div>` : ''}
        </div>
      </li>
    `).join('');

    viewerSteps.innerHTML = `<ul class="emergency-steps">${stepsHTML}</ul>`;

    // Show viewer, hide grid
    grid.parentElement.style.display = 'none';
    viewer.style.display = 'block';
    viewer.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Track for rate limit
    ProxiSecurity.rateLimiter.check('open-protocol', 30, 60000);
  }

  // --- Back button ---
  function goBack() {
    viewer.style.display = 'none';
    grid.parentElement.style.display = 'block';
    currentProtocol = null;
  }

  // --- "Can't reach help" — SINGLE button, one action ---
  function initNoHelpButton() {
    const btn = document.getElementById('btn-no-help');
    if (!btn) return;

    btn.addEventListener('click', () => {
      if (!ProxiSecurity.rateLimiter.check('no-help-click', 5, 60000)) {
        showNoHelpOverloaded();
        return;
      }
      showNoHelpGuidance();
    });
  }

  function showNoHelpGuidance() {
    const modal = document.getElementById('no-help-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function showNoHelpOverloaded() {
    const modal = document.getElementById('no-help-modal');
    if (modal) {
      modal.innerHTML = `
        <div class="no-help-section">
          <div class="no-help-section__title">⚠️ Too many requests</div>
          <div class="no-help-section__desc">Please wait a minute before trying again.</div>
        </div>`;
      modal.classList.remove('hidden');
    }
  }

  // --- Close modal ---
  function initModalClose() {
    const closeBtn = document.getElementById('btn-close-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        const modal = document.getElementById('no-help-modal');
        if (modal) modal.classList.add('hidden');
      });
    }
  }

  // --- Init ---
  function init() {
    if (!grid) return;

    // Show loading state
    ProxiApp.showLoading(loadingEl, fallbackEl);

    // Try to load from JSON — 3 second timeout
    ProxiApp.loadJSON(
      'data/offline-tree.json',
      (data) => renderGrid(data),
      () => {
        // Timeout or error — show inline fallback protocols
        console.warn('[ProxiEmergency] Using built-in fallback protocols');
        renderGrid(null);
        ProxiApp.showFallback(loadingEl, fallbackEl);
      },
      3000
    );

    // Back button
    if (backBtn) backBtn.addEventListener('click', goBack);

    // "Can't reach help" button
    initNoHelpButton();
    initModalClose();
  }

  document.addEventListener('DOMContentLoaded', init);

  return { openProtocol, goBack };
})();

window.ProxiEmergency = ProxiEmergency;
