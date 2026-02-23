/**
 * ProxiHealth Triage.js
 * Symptom assessment decision tree
 */

const ProxiTriage = (() => {
  'use strict';

  let tree = null;
  let history = []; // Track navigation for back button
  let selectedSymptoms = new Set();

  const loadingEl  = document.getElementById('triage-loading');
  const fallbackEl = document.getElementById('triage-fallback');
  const container  = document.getElementById('triage-container');

  // --- Load decision tree ---
  function init() {
    if (!container) return;

    ProxiApp.showLoading(loadingEl, fallbackEl);

    ProxiApp.loadJSON(
      'data/offline-tree.json',
      (data) => {
        tree = data.triage;
        ProxiApp.hideLoading(loadingEl);
        renderNode('start');
      },
      () => {
        ProxiApp.showFallback(loadingEl, fallbackEl);
      },
      3000
    );
  }

  // --- Render a triage node ---
  function renderNode(nodeId) {
    if (!tree || !tree[nodeId]) return;

    const node = tree[nodeId];
    history.push(nodeId);
    updateProgress();

    if (node.type === 'question') {
      renderQuestion(node);
    } else if (node.type === 'result') {
      renderResult(node);
    }
  }

  // --- Render question ---
  function renderQuestion(node) {
    const stepNum = history.length;
    const totalEstimate = 4;

    const html = `
      <div class="question-card" role="main" aria-live="polite">
        <div class="question-card__step">Step ${stepNum}</div>
        <div class="question-card__text">${ProxiSecurity.sanitize(node.text)}</div>
        <div class="answer-list" role="listbox">
          ${node.options.map((opt, i) => `
            <button
              class="answer-btn"
              data-next="${opt.next}"
              role="option"
              aria-label="${opt.label}"
            >
              ${ProxiSecurity.sanitize(opt.label)}
            </button>
          `).join('')}
        </div>
      </div>
      ${renderBackBtn()}
    `;

    container.innerHTML = html;

    // Bind answers
    container.querySelectorAll('.answer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.add('answer-btn--selected');
        setTimeout(() => renderNode(btn.dataset.next), 200);
      });
    });

    bindBackBtn();
  }

  // --- Render result ---
  function renderResult(node) {
    const urgencyClass = node.urgency === 'critical' ? 'high' :
                         node.urgency === 'high'     ? 'medium' : 'low';

    const urgencyLabel = node.urgency === 'critical' ? '🔴 Emergency' :
                         node.urgency === 'high'     ? '🟡 Seek Care Today' : '🟢 Monitor at Home';

    const diseaseTags = node.diseases ? node.diseases.map(d =>
      `<span class="disease-tag disease-tag--match">${d}</span>`
    ).join('') : '';

    const protocolLink = node.protocol ?
      `<a href="emergency.html#${node.protocol}" class="btn btn--primary mt-md">
         View Full Protocol →
       </a>` : '';

    const html = `
      <div class="result-card result-card--${urgencyClass}" role="main" aria-live="polite">
        <div class="result-card__level">${urgencyLabel}</div>
        <h2 class="result-card__title">${ProxiSecurity.sanitize(node.title)}</h2>
        <p class="result-card__advice">${ProxiSecurity.sanitize(node.advice)}</p>
        ${diseaseTags ? `<div class="disease-tags">${diseaseTags}</div>` : ''}
        ${protocolLink}
      </div>
      <div class="disclaimer">
        <strong>Important:</strong> This assessment is a guide, not a diagnosis.
        Always seek professional medical care. ProxiHealth is testing AI-assisted
        triage to save lives where care is inaccessible.
      </div>
      <button class="btn btn--secondary mt-md" id="btn-restart">
        ↩ Start Over
      </button>
      ${renderBackBtn()}
    `;

    container.innerHTML = html;

    document.getElementById('btn-restart')?.addEventListener('click', restart);
    bindBackBtn();
  }

  // --- Back button ---
  function renderBackBtn() {
    if (history.length <= 1) return '';
    return `<div class="triage-nav mt-md">
      <button class="triage-nav__back" id="btn-back-triage">← Back</button>
    </div>`;
  }

  function bindBackBtn() {
    document.getElementById('btn-back-triage')?.addEventListener('click', goBack);
  }

  function goBack() {
    if (history.length <= 1) return;
    history.pop(); // Remove current
    const prevId = history.pop(); // Remove previous (will be re-added on renderNode)
    renderNode(prevId);
  }

  // --- Progress bar ---
  function updateProgress() {
    const bar = document.getElementById('triage-progress-fill');
    const label = document.getElementById('triage-progress-label');
    if (!bar) return;
    const pct = Math.min((history.length / 5) * 100, 100);
    bar.style.width = `${pct}%`;
    if (label) label.textContent = `Step ${history.length}`;
  }

  // --- Restart ---
  function restart() {
    history = [];
    selectedSymptoms.clear();
    updateProgress();
    renderNode('start');
  }

  document.addEventListener('DOMContentLoaded', init);

  return { init, restart };
})();

window.ProxiTriage = ProxiTriage;
