const materials = [
  { id: "MAT001", name: "Steel Rod", barcode: "123456" },
  { id: "MAT002", name: "Aluminum Sheet", barcode: "00045" },
  { id: "MAT003", name: "Copper Wire", barcode: "ABC789" }
];
const ERROR_TYPES = { VALIDATION: 'validation', STORAGE: 'storage', AUDIO: 'audio', SPEECH: 'speech', NETWORK: 'network' };
let domElements = {}, scanHistory = [], selectedMaterial = null, scanAttempts = 0, lastScanTime = 0;
const MAX_SCAN_ATTEMPTS = 10, SCAN_COOLDOWN = 1000;
const historySettings = { filter: 'all', sort: 'newest', searchTerm: '', dateRange: { start: null, end: null } };
const historyAnalytics = { total: 0, success: 0, error: 0, successRate: 0, lastScan: null, materialStats: {} };

function initializeDOMElements() {
  try {
    ['material-select', 'expected-barcode', 'expected-code', 'scan-section', 'barcode-input', 'scan-btn', 'result', 'scan-history', 'success-sound', 'error-sound', 'error-container', 'validation-errors']
      .forEach(id => {
        const el = document.getElementById(id);
        if (!el && !['error-container', 'validation-errors'].includes(id)) throw new Error(`Element '${id}' not found`);
        domElements[id] = el;
      });
    return true;
  } catch (e) { displayError('DOM init failed: ' + e.message); return false; }
}
function displayError(msg, type = ERROR_TYPES.VALIDATION, duration = 5000) {
  try {
    console.error(`[${type}] ${msg}`);
    if (domElements.result) {
      domElements.result.textContent = `⚠️ Error: ${msg}`;
      domElements.result.className = `error error-${type}`;
      domElements.result.style.display = 'flex';
    }
    if (domElements['error-container']) {
      const d = document.createElement('div');
      d.className = `error-message error-${type}`; d.textContent = msg;
      domElements['error-container'].appendChild(d);
      setTimeout(() => d.parentNode && d.parentNode.removeChild(d), duration);
    }
    speakText(`Error: ${msg}`);
  } catch (err) { console.error('Failed to display error:', err); }
}
function validateMaterialData() {
  try {
    if (!Array.isArray(materials) || !materials.length) throw new Error('Materials invalid/empty');
    materials.forEach((m, i) => {
      if (!m.id || !m.name || !m.barcode) throw new Error(`Material at ${i} missing fields`);
      if (typeof m.barcode !== 'string' || !m.barcode.trim()) throw new Error(`Material ${m.id} invalid barcode`);
    });
    return true;
  } catch (e) { displayError('Material data validation failed: ' + e.message); return false; }
}
function validateBarcodeInput(input) {
  const e = [];
  if (!input) e.push('Barcode cannot be empty');
  else if (input.length < 3) e.push('Barcode must be at least 3 chars');
  else if (input.length > 20) e.push('Barcode cannot exceed 20 chars');
  else if (!/^[a-zA-Z0-9]+$/.test(input)) e.push('Barcode must be alphanumeric');
  return e;
}
function validateScanRate() {
  const now = Date.now();
  if (now - lastScanTime < SCAN_COOLDOWN) return { valid: false, error: 'Please wait before scanning again' };
  if (++scanAttempts > MAX_SCAN_ATTEMPTS) return { valid: false, error: 'Too many scan attempts. Please refresh.' };
  lastScanTime = now; return { valid: true };
}
function populateMaterials() {
  try {
    if (!validateMaterialData() || !domElements['material-select']) return false;
    const sel = domElements['material-select'];
    while (sel.children.length > 1) sel.removeChild(sel.lastChild);
    materials.forEach(m => {
      const o = document.createElement('option');
      o.value = m.id; o.textContent = `${m.name} (${m.id})`; sel.appendChild(o);
    });
    return true;
  } catch (e) { displayError('Failed to populate materials: ' + e.message); return false; }
}
function handleMaterialSelection() {
  try {
    const id = domElements['material-select']?.value;
    if (!id) {
      selectedMaterial = null;
      domElements['expected-barcode'].style.display = 'none';
      domElements['scan-section'].style.display = 'none';
      domElements.result.textContent = '';
      return;
    }
    selectedMaterial = materials.find(m => m.id === id);
    if (!selectedMaterial) throw new Error(`Material with ID ${id} not found`);
    domElements['expected-code'].textContent = selectedMaterial.barcode;
    domElements['expected-barcode'].style.display = 'block';
    domElements['scan-section'].style.display = 'block';
    domElements.result.textContent = `Please scan barcode for ${selectedMaterial.name}`;
    domElements.result.className = '';
    scanAttempts = 0;
    domElements['barcode-input']?.focus();
  } catch (e) { displayError('Material selection failed: ' + e.message); }
}
function playSound(success) {
  try {
    const el = success ? domElements['success-sound'] : domElements['error-sound'];
    if (!el) return;
    el.currentTime = 0;
    el.play()?.catch(err => displayError('Audio playback not available', ERROR_TYPES.AUDIO, 2000));
  } catch (e) { }
}
function speakText(text) {
  try {
    if (!('speechSynthesis' in window) || !text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.8; u.volume = 0.8;
    u.onerror = e => { };
    speechSynthesis.speak(u);
  } catch (e) { }
}
function loadHistory() {
  try {
    const d = localStorage.getItem('scanHistory');
    scanHistory = d ? JSON.parse(d) : [];
    scanHistory.forEach(i => typeof i === 'string' && addHistoryItem(i));
  } catch (e) { displayError('Failed to load scan history', ERROR_TYPES.STORAGE, 3000); scanHistory = []; }
}
function saveHistory() {
  try { localStorage.setItem('scanHistory', JSON.stringify(scanHistory)); }
  catch (e) { displayError('Failed to save scan history', ERROR_TYPES.STORAGE, 3000); }
}
function normalizeBarcode(b) { try { return typeof b === 'string' ? b.replace(/[^a-zA-Z0-9]/g, '').trim() : ''; } catch { return ''; } }
function addHistoryItem(item, isDup = false) {
  try {
    if (!item || typeof item !== 'string' || !domElements['scan-history']) return;
    const li = document.createElement('li');
    li.textContent = item;
    if (isDup) li.classList.add('duplicate');
    else if (item.includes('✅')) li.classList.add('success-item');
    else if (item.includes('❌')) li.classList.add('error-item');
    domElements['scan-history'].appendChild(li);
    if (domElements['scan-history'].children.length > 50)
      domElements['scan-history'].removeChild(domElements['scan-history'].children[0]);
  } catch { }
}
function getFilteredAndSortedHistory() {
  let h = [...scanHistory];
  if (historySettings.filter === 'success') h = h.filter(i => i.includes('✅'));
  else if (historySettings.filter === 'error') h = h.filter(i => i.includes('❌'));
  if (historySettings.searchTerm) h = h.filter(i => i.toLowerCase().includes(historySettings.searchTerm.toLowerCase()));
  if (historySettings.dateRange.start || historySettings.dateRange.end)
    h = h.filter(i => {
      const m = i.match(/\(([^)]+)\)/);
      if (m && m[1]) {
        const d = new Date(m[1]), s = historySettings.dateRange.start ? new Date(historySettings.dateRange.start) : new Date(0), e = historySettings.dateRange.end ? new Date(historySettings.dateRange.end) : new Date(8640000000000000);
        return d >= s && d <= e;
      }
      return true;
    });
  if (historySettings.sort === 'newest') h.reverse();
  return h;
}
function calculateHistoryAnalytics() {
  historyAnalytics.total = scanHistory.length;
  historyAnalytics.success = scanHistory.filter(i => i.includes('✅')).length;
  historyAnalytics.error = scanHistory.filter(i => i.includes('❌')).length;
  historyAnalytics.successRate = historyAnalytics.total ? Math.round((historyAnalytics.success / historyAnalytics.total) * 100) : 0;
  if (scanHistory.length) {
    const m = scanHistory[scanHistory.length - 1].match(/\(([^)]+)\)/);
    historyAnalytics.lastScan = m ? m[1] : null;
  }
  historyAnalytics.materialStats = {};
  scanHistory.forEach(i => {
    let n = '';
    if (i.includes('✅')) n = i.split(':')[0].replace('✅', '').trim();
    else if (i.includes('❌')) n = i.split(':')[0].replace('❌', '').trim();
    if (n) {
      if (!historyAnalytics.materialStats[n]) historyAnalytics.materialStats[n] = { total: 0, success: 0, error: 0, rate: 0 };
      historyAnalytics.materialStats[n].total++;
      if (i.includes('✅')) historyAnalytics.materialStats[n].success++;
      else if (i.includes('❌')) historyAnalytics.materialStats[n].error++;
      historyAnalytics.materialStats[n].rate = Math.round((historyAnalytics.materialStats[n].success / historyAnalytics.materialStats[n].total) * 100);
    }
  });
}
function displayHistoryAnalytics() {
  const d = document.getElementById('history-analytics');
  if (!d) return;
  calculateHistoryAnalytics();
  let h = `<h3>📊 Analytics Summary</h3>
    <div class="analytics-summary">
      <div class="analytics-item"><span class="analytics-value">${historyAnalytics.total}</span><span class="analytics-label">Total Scans</span></div>
      <div class="analytics-item"><span class="analytics-value">${historyAnalytics.success}</span><span class="analytics-label">Successful</span></div>
      <div class="analytics-item"><span class="analytics-value">${historyAnalytics.error}</span><span class="analytics-label">Errors</span></div>
      <div class="analytics-item"><span class="analytics-value">${historyAnalytics.successRate}%</span><span class="analytics-label">Success Rate</span></div>
    </div>`;
  if (historyAnalytics.lastScan) h += `<div class="analytics-info"><p><strong>Last Scan:</strong> ${historyAnalytics.lastScan}</p></div>`;
  if (Object.keys(historyAnalytics.materialStats).length) {
    h += '<div class="material-stats"><h4>Material Statistics</h4><table><thead><tr><th>Material</th><th>Total</th><th>Success</th><th>Errors</th><th>Success Rate</th></tr></thead><tbody>';
    Object.entries(historyAnalytics.materialStats).forEach(([m, s]) => {
      let c = s.rate >= 80 ? 'high-success' : s.rate >= 50 ? 'medium-success' : 'low-success';
      h += `<tr class="${c}"><td><strong>${m}</strong></td><td>${s.total}</td><td>${s.success}</td><td>${s.error}</td><td>${s.rate}%</td></tr>`;
    });
    h += '</tbody></table></div>';
  } else if (!historyAnalytics.total) h += '<div class="no-data"><p>No scan data available for analysis.</p></div>';
  d.innerHTML = h; d.style.display = 'block';
}
function exportHistoryToExcel() {
  try {
    const h = getFilteredAndSortedHistory();
    if (!h.length) return displayError('No history data to export');
    let html = `<html><head><meta charset="UTF-8"><style>table{border-collapse:collapse;width:100%;font-family:Arial}th{background:#4CAF50;color:#fff;padding:12px;text-align:left;border:1px solid #ddd;font-weight:bold}td{padding:8px;border:1px solid #ddd}.success{background:#d4edda}.error{background:#f8d7da}.center{text-align:center}</style></head><body><h2>Scan History Report - ${new Date().toLocaleDateString()}</h2><table><thead><tr><th>Status</th><th>Material</th><th>Expected Barcode</th><th>Scanned Barcode</th><th>Timestamp</th><th>Result</th><th>Match</th></tr></thead><tbody>`;
    h.forEach(i => {
      const isS = i.includes('✅'), isE = i.includes('❌'), c = isS ? 'success' : isE ? 'error' : '';
      let status = 'Unknown', material = '', expected = '', scanned = '', ts = '', result = '', match = '';
      if (isS) {
        status = '✅ Success'; result = 'OK LOAD'; match = '✓ Yes';
        const m = i.match(/✅\s+(.+?):\s+(\w+)\s+\((.+?)\)/);
        if (m) [material, scanned, ts] = [m[1].trim(), m[2].trim(), m[3].trim()], expected = scanned;
      } else if (isE) {
        status = '❌ Error'; result = 'WRONG MATERIAL'; match = '✗ No';
        const m = i.match(/❌\s+(.+?):\s+Expected\s+(\w+),\s+Got\s+(\w+)\s+\((.+?)\)/);
        if (m) [material, expected, scanned, ts] = [m[1].trim(), m[2].trim(), m[3].trim(), m[4].trim()];
      }
      html += `<tr class="${c}"><td class="center">${status}</td><td>${material}</td><td class="center">${expected}</td><td class="center">${scanned}</td><td>${ts}</td><td class="center">${result}</td><td class="center">${match}</td></tr>`;
    });
    calculateHistoryAnalytics();
    html += `</tbody></table><br><h3>Summary Statistics</h3><table style="width:50%"><tr><td><strong>Total Scans:</strong></td><td>${historyAnalytics.total}</td></tr><tr><td><strong>Successful:</strong></td><td>${historyAnalytics.success}</td></tr><tr><td><strong>Errors:</strong></td><td>${historyAnalytics.error}</td></tr><tr><td><strong>Success Rate:</strong></td><td>${historyAnalytics.successRate}%</td></tr></table></body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' }), url = URL.createObjectURL(blob);
    const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19), link = document.createElement('a');
    link.href = url; link.download = `scan-history-${ts}.xls`; link.click(); URL.revokeObjectURL(url);
    displayError(`${h.length} history items exported to Excel successfully`, ERROR_TYPES.VALIDATION, 2000);
  } catch (e) { displayError('Failed to export Excel: ' + e.message); }
}
function setupHistoryControls() {
  ['clear-history', 'export-excel', 'analyze-history'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      if (id === 'clear-history') btn.addEventListener('click', clearHistory);
      if (id === 'export-excel') btn.addEventListener('click', exportHistoryToExcel);
      if (id === 'analyze-history') btn.addEventListener('click', () => {
        displayHistoryAnalytics();
        const d = document.getElementById('history-analytics');
        if (d) d.style.display = 'block';
      });
    }
  });
}
function initializeHistoryManagement() { setupHistoryControls(); calculateHistoryAnalytics(); }
function handleScan() {
  try {
    const rate = validateScanRate();
    if (!rate.valid) return displayError(rate.error);
    if (!selectedMaterial) return displayError("Please select a material first");
    const input = domElements['barcode-input']?.value?.trim(), errs = validateBarcodeInput(input);
    if (errs.length) return displayError(errs.join('. '));
    const scanned = normalizeBarcode(input), expected = normalizeBarcode(selectedMaterial.barcode);
    if (!scanned || !expected) throw new Error('Failed to process barcode data');
    const ts = new Date().toLocaleString();
    if (scanned === expected) {
      domElements.result.textContent = "✅ OK LOAD"; domElements.result.className = "success";
      playSound(true); speakText("OK Load");
      const entry = `✅ ${selectedMaterial.name}: ${scanned} (${ts})`;
      scanHistory.push(entry); addHistoryItem(entry); saveHistory();
    } else {
      domElements.result.textContent = "❌ WRONG MATERIAL"; domElements.result.className = "error";
      playSound(false); speakText("Wrong material");
      const entry = `❌ ${selectedMaterial.name}: Expected ${expected}, Got ${scanned} (${ts})`;
      scanHistory.push(entry); addHistoryItem(entry, true); saveHistory();
    }
    domElements['barcode-input'].value = '';
    if (scanHistory.length) {
      calculateHistoryAnalytics();
      if (document.getElementById('history-analytics')) displayHistoryAnalytics();
    }
  } catch (e) { displayError('Scan processing failed: ' + e.message); }
}
function setupEventListeners() {
  try {
    domElements['material-select']?.addEventListener('change', handleMaterialSelection);
    domElements['scan-btn']?.addEventListener('click', handleScan);
    if (domElements['barcode-input']) {
      domElements['barcode-input'].addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); handleScan(); } });
      domElements['barcode-input'].addEventListener('input', e => {
        const errs = validateBarcodeInput(e.target.value), v = domElements['validation-errors'];
        if (v) {
          if (errs.length) { v.textContent = errs.join('. '); v.style.display = 'block'; e.target.classList.add('invalid'); }
          else { v.style.display = 'none'; e.target.classList.remove('invalid'); }
        }
      });
    }
  } catch (e) { displayError('Failed to setup event listeners: ' + e.message); }
}
function initialize() {
  try {
    if (!window.localStorage) displayError('LocalStorage not supported', ERROR_TYPES.STORAGE);
    if (!initializeDOMElements() || !populateMaterials()) return;
    setupEventListeners(); loadHistory(); initializeHistoryManagement();
    console.log('Application initialized');
  } catch (e) { displayError('Application initialization failed: ' + e.message); }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize); else initialize();
window.addEventListener('error', e => { displayError('An unexpected error occurred'); });
window.addEventListener('unhandledrejection', e => { displayError('An unexpected error occurred'); });
function clearHistory() {
  if (confirm('Are you sure you want to clear all history?')) {
    scanHistory = []; localStorage.removeItem('scanHistory');
    domElements['scan-history'] && (domElements['scan-history'].innerHTML = '');
    calculateHistoryAnalytics();
    const d = document.getElementById('history-analytics'); if (d) d.innerHTML = '';
    displayError('History cleared successfully', ERROR_TYPES.VALIDATION, 2000);
  }
}