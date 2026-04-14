/**
 * Delivery Cost Calculator Widget
 * Embeddable widget for Shopify stores
 * Fetches config from delivery-cost-api and uses delivery-cost calculator API for distance
 */

(function () {
  'use strict';

  // Configuration
  const CONFIG_API = 'https://delivery-cost-api-vercel.vercel.app/api/config';
  const DISTANCE_API = 'https://delivery-cost-calc-by-eoin-lynch.vercel.app/api/distance';
  const ORIGIN = 'N91PT7W';

  // State
  let priceBands = [];
  let freeDeliveryThreshold = 0;

  // Pure helpers (exported for testing)
  function selectBand(bands, orderValue) {
    const total = parseFloat(orderValue) || 0;
    const sorted = [...bands].sort((a, b) => b.minOrderTotal - a.minOrderTotal);
    return sorted.find(b => total >= b.minOrderTotal) || sorted[sorted.length - 1];
  }

  function calculateFee(band, distanceKm) {
    if (!band) return null;
    const km = parseFloat(distanceKm) || 0;
    return Math.round((band.baseFee + band.perKm * km) * 100) / 100;
  }

  function formatCurrency(amount) {
    return '\u20ac' + amount.toFixed(2);
  }

  // API calls
  async function fetchConfig() {
    try {
      const res = await fetch(CONFIG_API);
      const data = await res.json();
      priceBands = Array.isArray(data.priceBands) && data.priceBands.length
        ? data.priceBands
        : [{ minOrderTotal: 0, baseFee: 15, perKm: 1.25 }];
      freeDeliveryThreshold = data.freeDeliveryThreshold || 0;
    } catch (err) {
      console.warn('Delivery widget: config fetch failed, using defaults', err);
      priceBands = [
        { minOrderTotal: 0, baseFee: 15, perKm: 1.25 },
        { minOrderTotal: 220, baseFee: 10, perKm: 0.50 },
      ];
      freeDeliveryThreshold = 0;
    }
  }

  async function fetchDistance(destination) {
    const url = DISTANCE_API + '?origin=' + encodeURIComponent(ORIGIN) + '&destination=' + encodeURIComponent(destination);
    const res = await fetch(url);
    if (!res.ok) throw new Error('Distance API error: ' + res.status);
    return res.json();
  }

  // UI
  function buildWidget(container) {
    container.innerHTML = '<div id="dcw-wrapper">'
      + '<h2 id="dcw-title">Estimate Your Delivery Cost</h2>'
      + '<p id="dcw-subtitle">Enter your Eircode or address below to get an instant delivery quote.</p>'
      + '<div id="dcw-form">'
      + '<div id="dcw-input-group">'
      + '<label for="dcw-destination" id="dcw-label">Your Eircode / Address</label>'
      + '<input type="text" id="dcw-destination" placeholder="e.g. D08 X9F0 or Athlone" autocomplete="off" />'
      + '</div>'
      + '<div id="dcw-input-group-order">'
      + '<label for="dcw-order-value" id="dcw-order-label">Order Value (\u20ac)</label>'
      + '<input type="number" id="dcw-order-value" placeholder="0" min="0" step="1" value="0" />'
      + '</div>'
      + '<button id="dcw-btn" type="button">Calculate Delivery</button>'
      + '</div>'
      + '<div id="dcw-result" style="display:none;">'
      + '<div id="dcw-result-inner">'
      + '<p id="dcw-distance-text"></p>'
      + '<p id="dcw-fee-text"></p>'
      + '</div></div>'
      + '<div id="dcw-error" style="display:none;"></div>'
      + '<div id="dcw-loading" style="display:none;">Calculating...</div>'
      + '</div>';

    var btn = container.querySelector('#dcw-btn');
    var destInput = container.querySelector('#dcw-destination');
    btn.addEventListener('click', handleCalculate);
    destInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') handleCalculate();
    });
  }

  async function handleCalculate() {
    var container = document.getElementById('delivery-cost-widget');
    var dest = container.querySelector('#dcw-destination').value.trim();
    var orderVal = container.querySelector('#dcw-order-value').value;
    var resultEl = container.querySelector('#dcw-result');
    var errorEl = container.querySelector('#dcw-error');
    var loadingEl = container.querySelector('#dcw-loading');
    var distText = container.querySelector('#dcw-distance-text');
    var feeText = container.querySelector('#dcw-fee-text');

    resultEl.style.display = 'none';
    errorEl.style.display = 'none';

    if (!dest) {
      errorEl.textContent = 'Please enter a destination address or Eircode.';
      errorEl.style.display = 'block';
      return;
    }

    loadingEl.style.display = 'block';

    try {
      var data = await fetchDistance(dest);

      if (!data || data.status !== 'OK' || !data.rows || !data.rows[0] || !data.rows[0].elements[0] || !data.rows[0].elements[0].distance) {
        throw new Error('Could not find that address. Please check and try again.');
      }

      var distanceKm = data.distanceKm || Math.round(data.rows[0].elements[0].distance.value / 1000);
      var band = selectBand(priceBands, orderVal);
      var fee = data.deliveryFee != null ? data.deliveryFee : calculateFee(band, distanceKm);
      var destinationName = (data.destination_addresses && data.destination_addresses[0]) || dest;

      distText.innerHTML = '<strong>' + distanceKm + ' km</strong> from our yard to <strong>' + destinationName + '</strong>';

      if (freeDeliveryThreshold > 0 && parseFloat(orderVal) >= freeDeliveryThreshold) {
        feeText.innerHTML = '<span id="dcw-free">FREE DELIVERY</span> (orders over ' + formatCurrency(freeDeliveryThreshold) + ')';
      } else {
        feeText.innerHTML = 'Estimated delivery: <strong>' + formatCurrency(fee) + '</strong>';
      }

      loadingEl.style.display = 'none';
      resultEl.style.display = 'block';
    } catch (err) {
      loadingEl.style.display = 'none';
      errorEl.textContent = err.message || 'Something went wrong. Please try again.';
      errorEl.style.display = 'block';
    }
  }

  function injectStyles() {
    if (document.getElementById('dcw-styles')) return;
    var style = document.createElement('style');
    style.id = 'dcw-styles';
    style.textContent = '#dcw-wrapper{max-width:600px;margin:0 auto;padding:2rem 1.5rem;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;text-align:center}#dcw-title{font-size:1.6rem;color:#3a5a1c;margin-bottom:.4rem}#dcw-subtitle{color:#666;font-size:.95rem;margin-bottom:1.5rem}#dcw-form{display:flex;flex-direction:column;gap:.75rem;align-items:stretch}#dcw-input-group,#dcw-input-group-order{text-align:left}#dcw-label,#dcw-order-label{display:block;font-weight:600;font-size:.85rem;margin-bottom:.3rem;color:#333}#dcw-destination,#dcw-order-value{width:100%;padding:.7rem .9rem;font-size:1rem;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;transition:border-color .2s}#dcw-destination:focus,#dcw-order-value:focus{outline:none;border-color:#3a5a1c;box-shadow:0 0 0 2px rgba(58,90,28,.15)}#dcw-btn{padding:.75rem 1.5rem;background:#3a5a1c;color:#fff;font-size:1rem;font-weight:600;border:none;border-radius:6px;cursor:pointer;transition:background .2s;margin-top:.25rem}#dcw-btn:hover{background:#2e4816}#dcw-btn:active{background:#243a11}#dcw-result{margin-top:1.25rem;padding:1rem;background:#f0f7e8;border-radius:8px;border:1px solid #c5dba8}#dcw-result-inner p{margin:.3rem 0;color:#333}#dcw-free{display:inline-block;background:#3a5a1c;color:#fff;padding:2px 10px;border-radius:4px;font-weight:700;font-size:.9rem}#dcw-error{margin-top:1rem;padding:.75rem 1rem;background:#fef2f2;color:#b91c1c;border-radius:6px;border:1px solid #fecaca;font-size:.9rem}#dcw-loading{margin-top:1rem;color:#666;font-style:italic}@media(max-width:480px){#dcw-wrapper{padding:1.5rem 1rem}#dcw-title{font-size:1.3rem}}';
    document.head.appendChild(style);
  }

  // Initialise
  async function init() {
    var container = document.getElementById('delivery-cost-widget');
    if (!container) {
      console.warn('Delivery widget: #delivery-cost-widget container not found');
      return;
    }
    injectStyles();
    buildWidget(container);
    await fetchConfig();
  }

  // Export for testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { selectBand: selectBand, calculateFee: calculateFee, formatCurrency: formatCurrency };
  }

  // Auto-init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
