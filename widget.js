/**
 * Delivery Cost Calculator Widget
 * Embeddable vanilla JS widget for Shopify stores
 * Calls POST /api/widget-calculate on the Vercel API
 */
(function () {
  'use strict';

  var API_URL = 'https://delivery-cost-calc-by-eoin-lynch.vercel.app/api/widget-calculate';

  function formatCurrency(amount) {
    return '\u20ac' + amount.toFixed(2);
  }

  function injectStyles() {
    if (document.getElementById('dcw-styles')) return;
    var s = document.createElement('style');
    s.id = 'dcw-styles';
    s.textContent = [
      '#delivery-cost-widget *,',
      '#delivery-cost-widget *::before,',
      '#delivery-cost-widget *::after { box-sizing: border-box; margin: 0; padding: 0; }',

      '#delivery-cost-widget .dcw-container {',
      '  max-width: 520px; margin: 0 auto; padding: 2rem 1.5rem;',
      '  font-family: inherit; color: #333; text-align: center;',
      '}',

      '#delivery-cost-widget .dcw-input-row {',
      '  display: flex; gap: 0.5rem; margin-top: 1.25rem;',
      '}',

      '#delivery-cost-widget .dcw-input {',
      '  flex: 1; padding: 0.75rem 1rem; font-size: 1rem;',
      '  border: 2px solid #d1d5db; border-radius: 6px;',
      '  outline: none; transition: border-color 0.2s;',
      '}',

      '#delivery-cost-widget .dcw-input:focus {',
      '  border-color: #2c4a1e; box-shadow: 0 0 0 3px rgba(44,74,30,0.12);',
      '}',

      '#delivery-cost-widget .dcw-btn {',
      '  padding: 0.75rem 1.25rem; font-size: 1rem; font-weight: 600;',
      '  color: #fff; background: #2c4a1e; border: none; border-radius: 6px;',
      '  cursor: pointer; white-space: nowrap; transition: background 0.2s;',
      '}',

      '#delivery-cost-widget .dcw-btn:hover { background: #1f3515; }',
      '#delivery-cost-widget .dcw-btn:disabled { background: #6b7c63; cursor: not-allowed; }',

      '#delivery-cost-widget .dcw-hint {',
      '  margin-top: 0.4rem; font-size: 0.8rem; color: #888; text-align: left;',
      '}',

      '#delivery-cost-widget .dcw-result {',
      '  margin-top: 1.25rem; padding: 1.25rem; text-align: left;',
      '  background: #f4f9f0; border: 1px solid #c5dba8; border-radius: 8px;',
      '}',

      '#delivery-cost-widget .dcw-distance {',
      '  font-size: 0.9rem; color: #555; margin-bottom: 0.75rem;',
      '}',

      '#delivery-cost-widget .dcw-fees { display: flex; flex-direction: column; gap: 0.5rem; }',

      '#delivery-cost-widget .dcw-fee-row {',
      '  display: flex; justify-content: space-between; align-items: center;',
      '  padding: 0.6rem 0.75rem; background: #fff; border-radius: 6px;',
      '  border: 1px solid #e5e7eb;',
      '}',

      '#delivery-cost-widget .dcw-fee-label { font-size: 0.9rem; color: #555; }',

      '#delivery-cost-widget .dcw-fee-amount {',
      '  font-size: 1.1rem; font-weight: 700; color: #2c4a1e;',
      '}',

      '#delivery-cost-widget .dcw-not-deliverable {',
      '  margin-top: 1.25rem; padding: 1rem 1.25rem; text-align: left;',
      '  background: #fefce8; border: 1px solid #e5d68a; border-radius: 8px;',
      '  color: #713f12; font-size: 0.95rem; line-height: 1.5;',
      '}',

      '#delivery-cost-widget .dcw-error {',
      '  margin-top: 1rem; padding: 0.75rem 1rem;',
      '  background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px;',
      '  color: #b91c1c; font-size: 0.9rem;',
      '}',

      '@media (max-width: 480px) {',
      '  #delivery-cost-widget .dcw-container { padding: 1.5rem 1rem; }',
      '  #delivery-cost-widget .dcw-input-row { flex-direction: column; }',
      '  #delivery-cost-widget .dcw-fee-row { flex-direction: column; align-items: flex-start; gap: 0.2rem; }',
      '}',
    ].join('\n');
    document.head.appendChild(s);
  }

  function buildWidget(container) {
    container.innerHTML =
      '<div class="dcw-container">' +
        '<div class="dcw-input-row">' +
          '<input class="dcw-input" type="text" placeholder="e.g. Athlone, N37 X5P2" />' +
          '<button class="dcw-btn" type="button">Check</button>' +
        '</div>' +
        '<p class="dcw-hint">Eircode gives the most accurate result</p>' +
        '<div class="dcw-result" style="display:none;"></div>' +
        '<div class="dcw-not-deliverable" style="display:none;"></div>' +
        '<div class="dcw-error" style="display:none;"></div>' +
      '</div>';

    var btn = container.querySelector('.dcw-btn');
    var input = container.querySelector('.dcw-input');

    btn.addEventListener('click', function () { handleCheck(container); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') handleCheck(container);
    });
  }

  async function handleCheck(container) {
    var input = container.querySelector('.dcw-input');
    var btn = container.querySelector('.dcw-btn');
    var resultEl = container.querySelector('.dcw-result');
    var notDeliverableEl = container.querySelector('.dcw-not-deliverable');
    var errorEl = container.querySelector('.dcw-error');

    var location = input.value.trim();

    // Hide previous results
    resultEl.style.display = 'none';
    notDeliverableEl.style.display = 'none';
    errorEl.style.display = 'none';

    if (!location) {
      errorEl.textContent = 'Please enter a town, village, or Eircode.';
      errorEl.style.display = 'block';
      return;
    }

    // Loading state
    btn.disabled = true;
    btn.textContent = 'Checking\u2026';

    try {
      var resp = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: location }),
      });

      var data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      if (data.deliverable) {
        resultEl.innerHTML =
          '<p class="dcw-distance">Approximately <strong>' + data.distance_km + ' km</strong> from our yard</p>' +
          '<div class="dcw-fees">' +
            '<div class="dcw-fee-row">' +
              '<span class="dcw-fee-label">Orders under \u20ac220</span>' +
              '<span class="dcw-fee-amount">' + formatCurrency(data.fee_standard) + '</span>' +
            '</div>' +
            '<div class="dcw-fee-row">' +
              '<span class="dcw-fee-label">Orders \u20ac220+</span>' +
              '<span class="dcw-fee-amount">' + formatCurrency(data.fee_large) + '</span>' +
            '</div>' +
          '</div>';
        resultEl.style.display = 'block';
      } else {
        notDeliverableEl.textContent = data.message;
        notDeliverableEl.style.display = 'block';
      }
    } catch (err) {
      errorEl.textContent = err.message || 'Something went wrong. Please try again.';
      errorEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Check';
    }
  }

  function init() {
    var container = document.getElementById('delivery-cost-widget');
    if (!container) {
      console.warn('Delivery widget: #delivery-cost-widget not found on page');
      return;
    }
    injectStyles();
    buildWidget(container);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
