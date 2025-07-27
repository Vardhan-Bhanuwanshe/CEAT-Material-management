let materials = [
  { id: "MAT001", name: "CARTO", barcode: "2444DIP" },
  { id: "MAT002", name: "TORINO", barcode: "2444DIP" },
];

// Admin access control
let isAdmin = false;
const ADMIN_PASSWORD = "admin123"; // Simple password for demo

// Error types
const ERROR_TYPES = {
  VALIDATION: 'validation',
  STORAGE: 'storage',
  AUDIO: 'audio',
  SPEECH: 'speech',
  NETWORK: 'network'
};

// DOM elements with error handling
let domElements = {};
let scanHistory = [];
let selectedMaterial = null;
let scanAttempts = 0;
const MAX_SCAN_ATTEMPTS = 10;
const SCAN_COOLDOWN = 1000; // 1 second
let lastScanTime = 0;

// Enhanced history settings
const historySettings = {
  filter: 'all',        // 'all', 'success', 'error'
  sort: 'newest',       // 'newest', 'oldest'
  searchTerm: '',       // Search text
  dateRange: {          // Date range for filtering
    start: null,
    end: null
  }
};

// History analytics
const historyAnalytics = {
  total: 0,
  success: 0,
  error: 0,
  successRate: 0,
  lastScan: null,
  materialStats: {} // Stats by material
};

// Initialize DOM elements safely
function initializeDOMElements() {
  try {
    const elementIds = [
      'material-select', 'expected-barcode', 'expected-code', 'scan-section',
      'barcode-input', 'result', 'scan-history', 'success-sound',
      'error-sound', 'error-container', 'validation-errors',
      'add-material-name', 'add-material-barcode', 'add-material-btn', 'delete-material-btn',
      'material-validation'
    ];
    
    elementIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        domElements[id] = element;
      } else if (['success-sound', 'error-sound'].includes(id)) {
        // These elements are optional
        console.warn(`Optional element not found: ${id}`);
      } else {
        console.warn(`Required element not found: ${id}`);
      }
    });
    
    return true;
  } catch (error) {
    displayError('DOM initialization failed: ' + error.message, ERROR_TYPES.VALIDATION);
    return false;
  }
}

// Enhanced error display function
function displayError(message, type = ERROR_TYPES.VALIDATION, duration = 5000) {
  try {
    console.error(`[${type.toUpperCase()}] ${message}`);
    
    // Display in result div
    if (domElements.result) {
      domElements.result.textContent = `⚠️ Error: ${message}`;
      domElements.result.className = `error error-${type}`;
      domElements.result.style.display = 'flex';
    }
    
    // Display in error container if available
    if (domElements['error-container']) {
      const errorDiv = document.createElement('div');
      errorDiv.className = `error-message error-${type}`;
      errorDiv.textContent = message;
      domElements['error-container'].appendChild(errorDiv);
      
      // Auto-remove after duration
      setTimeout(() => {
        if (errorDiv.parentNode) {
          errorDiv.parentNode.removeChild(errorDiv);
        }
      }, duration);
    }
    
    // Speak error message
    speakText(`Error: ${message}`);
    
  } catch (err) {
    console.error('Failed to display error:', err);
  }
}

// Enhanced validation functions
function validateMaterialData() {
  try {
    if (!Array.isArray(materials) || materials.length === 0) {
      throw new Error('Materials data is invalid or empty');
    }
    
    materials.forEach((material, index) => {
      if (!material.id || !material.name || !material.barcode) {
        throw new Error(`Material at index ${index} is missing required fields`);
      }
      if (typeof material.barcode !== 'string' || material.barcode.trim() === '') {
        throw new Error(`Material ${material.id} has invalid barcode`);
      }
    });
    
    return true;
  } catch (error) {
    displayError('Material data validation failed: ' + error.message, ERROR_TYPES.VALIDATION);
    return false;
  }
}

function validateBarcodeInput(input) {
  const errors = [];
  
  if (!input) {
    errors.push('Barcode cannot be empty');
  } else if (input.length < 3) {
    errors.push('Barcode must be at least 3 characters long');
  } else if (input.length > 20) {
    errors.push('Barcode cannot exceed 20 characters');
  } else if (!/^[a-zA-Z0-9]+$/.test(input)) { // Allow alphanumeric characters
    errors.push('Barcode must contain only letters and numbers');
  }
  
  return errors;
}

function validateScanRate() {
  const currentTime = Date.now();
  if (currentTime - lastScanTime < SCAN_COOLDOWN) {
    return { valid: false, error: 'Please wait before scanning again' };
  }
  
  scanAttempts++;
  if (scanAttempts > MAX_SCAN_ATTEMPTS) {
    return { valid: false, error: 'Too many scan attempts. Please refresh the page.' };
  }
  
  lastScanTime = currentTime;
  return { valid: true };
}

// Enhanced populate materials function
function populateMaterials() {
  try {
    if (!validateMaterialData()) {
      return false;
    }
    if (!domElements['material-select']) {
      throw new Error('Material select element not found');
    }
    // Clear existing options except the first one
    const selectElement = domElements['material-select'];
    while (selectElement.children.length > 1) {
      selectElement.removeChild(selectElement.lastChild);
    }
    materials.forEach(material => {
      try {
        const option = document.createElement('option');
        option.value = material.id;
        option.textContent = `${material.name} (${material.id})`;
        selectElement.appendChild(option);
      } catch (err) {
        console.warn(`Failed to add material option for ${material.id}:`, err);
      }
    });
    return true;
  } catch (error) {
    displayError('Failed to populate materials: ' + error.message, ERROR_TYPES.VALIDATION);
    return false;
  }
}

// --- Delete Material ---
function handleDeleteMaterial() {
  if (!checkAdminAccess('deleting materials')) {
    return;
  }
  
  try {
    const materialSelect = domElements['material-select'];
    const validationElement = domElements['material-validation'];
    const selectedId = materialSelect?.value;
    
    // Clear previous validation
    if (validationElement) {
      validationElement.style.display = 'none';
      validationElement.textContent = '';
    }
    
    if (!selectedId) {
      showMaterialValidation('Please select a material to delete', 'warning');
      return;
    }
    
    const materialIndex = materials.findIndex(m => m.id === selectedId);
    if (materialIndex === -1) {
      showMaterialValidation('Selected material not found', 'error');
      return;
    }
    
    const materialToDelete = materials[materialIndex];
    
    // Confirm deletion
    const confirmMessage = `Are you sure you want to delete "${materialToDelete.name}" (${materialToDelete.barcode})?\n\nThis will completely remove all data for this material and cannot be undone.`;
    if (!confirm(confirmMessage)) {
      return;
    }
    
    // Remove material from array completely
    materials.splice(materialIndex, 1);
    
    // Save updated materials to localStorage immediately
    saveMaterials();
    
    // Clear current selection if it was the deleted material
    selectedMaterial = null;
    
    // Update the dropdown
    populateMaterials();
    
    // Reset material selection UI
    if (materialSelect) {
      materialSelect.value = '';
    }
    
    // Hide barcode and scan sections
    if (domElements['expected-barcode']) {
      domElements['expected-barcode'].style.display = 'none';
    }
    if (domElements['scan-section']) {
      domElements['scan-section'].style.display = 'none';
    }
    
    // Clear result display
    if (domElements.result) {
      domElements.result.textContent = '';
      domElements.result.className = '';
    }
    
    // Remove any scan history related to this material
    const materialName = materialToDelete.name;
    const originalHistoryLength = scanHistory.length;
    scanHistory = scanHistory.filter(item => !item.includes(materialName));
    
    // Save updated history if any items were removed
    if (scanHistory.length !== originalHistoryLength) {
      saveHistory();
      loadHistory(); // Refresh the display
    }
    
    // Show success message
    showMaterialValidation(`Material "${materialToDelete.name}" and all related data deleted successfully`, 'success');
    
    // Update delete button state
    updateDeleteButtonState();
    
    // Update footer stats
    updateFooterStats();
    
    // Reset scan attempts
    scanAttempts = 0;
    
    console.log('Material completely deleted:', materialToDelete);
    console.log('Remaining materials:', materials.length);
    
  } catch (error) {
    console.error('Error deleting material:', error);
    showMaterialValidation('Failed to delete material: ' + error.message, 'error');
  }
}

// Helper function to show material validation messages
function showMaterialValidation(message, type = 'error') {
  const validationElement = domElements['material-validation'];
  if (!validationElement) return;
  
  validationElement.textContent = message;
  validationElement.className = `validation-message ${type}`;
  validationElement.style.display = 'block';
  
  // Auto-hide success messages after 3 seconds
  if (type === 'success') {
    setTimeout(() => {
      if (validationElement && validationElement.textContent === message) {
        validationElement.style.display = 'none';
      }
    }, 3000);
  }
}

// Helper function to update delete button state
function updateDeleteButtonState() {
  const deleteBtn = domElements['delete-material-btn'];
  const materialSelect = domElements['material-select'];
  
  if (deleteBtn && materialSelect) {
    const hasSelection = materialSelect.value && materialSelect.value !== '';
    const canDelete = isAdmin && hasSelection;
    
    deleteBtn.disabled = !canDelete;
    
    if (!isAdmin) {
      deleteBtn.title = 'Admin access required';
    } else if (hasSelection) {
      deleteBtn.title = 'Delete selected material';
    } else {
      deleteBtn.title = 'Select a material to delete';
    }
  }
}

// Enhanced material selection handler
function handleMaterialSelection() {
  try {
    const materialId = domElements['material-select']?.value;
    
    if (!materialId) {
      selectedMaterial = null;
      domElements['expected-barcode'].style.display = 'none';
      domElements['scan-section'].style.display = 'none';
      domElements.result.textContent = '';
      return;
    }
    
    selectedMaterial = materials.find(m => m.id === materialId);
    if (!selectedMaterial) {
      throw new Error(`Material with ID ${materialId} not found`);
    }
    
    domElements['expected-code'].textContent = selectedMaterial.barcode;
    domElements['expected-barcode'].style.display = 'block';
    domElements['scan-section'].style.display = 'block';
    domElements.result.textContent = `Please scan barcode for ${selectedMaterial.name}`;
    domElements.result.className = '';
    
    // Reset scan attempts for new material
    scanAttempts = 0;
    
    // Update delete button state
    updateDeleteButtonState();
    
    // Auto-focus the barcode input for USB scanner
    setTimeout(() => {
      if (domElements['barcode-input']) {
        domElements['barcode-input'].focus();
        console.log(`Ready to scan barcode for ${selectedMaterial.name}`);
      }
    }, 100);
    
  } catch (error) {
    displayError('Material selection failed: ' + error.message, ERROR_TYPES.VALIDATION);
  }
}

// Enhanced audio playback
function playSound(isSuccess) {
  try {
    const soundElement = isSuccess ? domElements['success-sound'] : domElements['error-sound'];
    
    if (!soundElement) {
      console.warn('Audio element not found');
      return;
    }
    
    soundElement.currentTime = 0;
    const playPromise = soundElement.play();
    
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.warn('Audio playback failed:', error);
        displayError('Audio playback not available', ERROR_TYPES.AUDIO, 2000);
      });
    }
  } catch (error) {
    console.warn('Audio system error:', error);
  }
}

// Enhanced speech synthesis
function speakText(text) {
  try {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return;
    }
    
    if (!text || typeof text !== 'string') {
      console.warn('Invalid text for speech synthesis');
      return;
    }
    
    // Cancel any ongoing speech
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8;
    utterance.volume = 0.8;
    
    utterance.onerror = (event) => {
      console.warn('Speech synthesis error:', event.error);
    };
    
    speechSynthesis.speak(utterance);
    
  } catch (error) {
    console.warn('Speech synthesis failed:', error);
  }
}

// Enhanced localStorage operations
function loadHistory() {
  try {
    const historyData = localStorage.getItem('scanHistory');
    
    if (!historyData) {
      scanHistory = [];
      return;
    }
    
    const parsedHistory = JSON.parse(historyData);
    
    if (!Array.isArray(parsedHistory)) {
      throw new Error('Invalid history data format');
    }
    
    scanHistory = parsedHistory;
    
    // Clear existing display first
    if (domElements['scan-history']) {
      domElements['scan-history'].innerHTML = '';
    }
    
    // Display history in reverse order (newest first)
    const reversedHistory = [...parsedHistory].reverse();
    reversedHistory.forEach(item => {
      if (typeof item === 'string') {
        addHistoryItem(item);
      }
    });
    
  } catch (error) {
    console.warn('Failed to load history:', error);
    displayError('Failed to load scan history', ERROR_TYPES.STORAGE, 3000);
    scanHistory = [];
  }
}

function saveHistory() {
  try {
    if (!Array.isArray(scanHistory)) {
      throw new Error('Invalid history data');
    }
    
    localStorage.setItem('scanHistory', JSON.stringify(scanHistory));
    
  } catch (error) {
    console.warn('Failed to save history:', error);
    displayError('Failed to save scan history', ERROR_TYPES.STORAGE, 3000);
  }
}

// --- Material Add/Delete Persistence ---
function loadMaterials() {
  try {
    const storedMaterials = localStorage.getItem('materials');
    if (storedMaterials) {
      const parsedMaterials = JSON.parse(storedMaterials);
      if (Array.isArray(parsedMaterials) && parsedMaterials.length > 0) {
        materials = parsedMaterials;
        console.log('Materials loaded from localStorage:', materials.length);
      }
    }
  } catch (error) {
    console.error('Failed to load materials:', error);
    // Keep default materials if loading fails
  }
}

function saveMaterials() {
  try {
    localStorage.setItem('materials', JSON.stringify(materials));
    console.log('Materials saved to localStorage:', materials.length);
  } catch (error) {
    console.error('Failed to save materials:', error);
    displayError('Failed to save materials: ' + error.message, ERROR_TYPES.STORAGE);
  }
}

// --- Add Material ---
function handleAddMaterial() {
  if (!checkAdminAccess('adding materials')) {
    return;
  }
  
  try {
    const nameInput = domElements['add-material-name'];
    const barcodeInput = domElements['add-material-barcode'];
    const validationElement = domElements['material-validation'];
    
    const name = nameInput?.value.trim();
    const barcode = barcodeInput?.value.trim();
    
    // Clear previous validation
    if (validationElement) {
      validationElement.style.display = 'none';
      validationElement.textContent = '';
    }
    
    // Validate inputs
    let errors = [];
    if (!name) {
      errors.push('Material name is required');
    } else if (name.length < 2) {
      errors.push('Material name must be at least 2 characters');
    } else if (name.length > 50) {
      errors.push('Material name must be less than 50 characters');
    }
    
    if (!barcode) {
      errors.push('Barcode is required');
    } else if (!/^[a-zA-Z0-9]{3,20}$/.test(barcode)) {
      errors.push('Barcode must be 3-20 alphanumeric characters');
    }
    
    // Check for duplicates
    if (name && materials.some(m => m.name.toLowerCase() === name.toLowerCase())) {
      errors.push('Material name already exists');
    }
    
    if (barcode && materials.some(m => m.barcode === barcode)) {
      errors.push('Barcode already exists');
    }
    
    if (errors.length > 0) {
      showMaterialValidation(errors.join('. '), 'error');
      return;
    }
    
    // Generate new ID
    let maxId = 0;
    materials.forEach(m => {
      const idNum = parseInt((m.id || '').replace('MAT', ''), 10);
      if (!isNaN(idNum) && idNum > maxId) maxId = idNum;
    });
    const newId = 'MAT' + String(maxId + 1).padStart(3, '0');
    
    // Add new material to array
    const newMaterial = { id: newId, name, barcode };
    materials.push(newMaterial);
    
    // Save to localStorage immediately
    saveMaterials();
    
    // Update UI
    populateMaterials();
    
    // Clear inputs
    if (nameInput) nameInput.value = '';
    if (barcodeInput) barcodeInput.value = '';
    
    // Show success message
    showMaterialValidation(`Material "${name}" added successfully!`, 'success');
    
    // Auto-select the new material
    if (domElements['material-select']) {
      domElements['material-select'].value = newId;
      handleMaterialSelection();
    }
    
    // Update footer stats
    updateFooterStats();
    
    console.log('Material added and saved:', newMaterial);
    
  } catch (error) {
    console.error('Error adding material:', error);
    showMaterialValidation('Failed to add material: ' + error.message, 'error');
  }
}

// Enhanced barcode normalization
function normalizeBarcode(barcode) {
  try {
    if (typeof barcode !== 'string') {
      throw new Error('Barcode must be a string');
    }
    
    return barcode.replace(/[^a-zA-Z0-9]/g, '').trim(); // Remove non-alphanumeric characters
  } catch (error) {
    console.warn('Barcode normalization failed:', error);
    return '';
  }
}

// Enhanced history item addition
function addHistoryItem(item, isDuplicate = false) {
  try {
    if (!item || typeof item !== 'string') {
      throw new Error('Invalid history item');
    }
    
    if (!domElements['scan-history']) {
      throw new Error('Scan history element not found');
    }
    
    const li = document.createElement('li');
    li.textContent = item;
    
    if (isDuplicate) {
      li.classList.add('duplicate');
    } else if (item.includes('✅')) {
      li.classList.add('success-item');
    } else if (item.includes('❌')) {
      li.classList.add('error-item');
    } else if (item.includes('🚨')) {
      li.classList.add('error-item');
    }
    
    // Insert at the beginning (top) instead of appending to end
    const historyList = domElements['scan-history'];
    if (historyList.firstChild) {
      historyList.insertBefore(li, historyList.firstChild);
    } else {
      historyList.appendChild(li);
    }
    
    // Limit history display to prevent performance issues
    const maxDisplayItems = 50;
    const historyItems = domElements['scan-history'].children;
    if (historyItems.length > maxDisplayItems) {
      // Remove the oldest item (last in the list)
      domElements['scan-history'].removeChild(historyItems[historyItems.length - 1]);
    }
    
  } catch (error) {
    console.warn('Failed to add history item:', error);
  }
}

// Filter and sort history - update to handle newest first properly
function getFilteredAndSortedHistory() {
  let filteredHistory = [...scanHistory];

  // Apply status filter
  if (historySettings.filter === 'success') {
    filteredHistory = filteredHistory.filter(item => item.includes('✅'));
  } else if (historySettings.filter === 'error') {
    filteredHistory = filteredHistory.filter(item => item.includes('❌') || item.includes('🚨'));
  }
  
  // Apply search filter if provided
  if (historySettings.searchTerm) {
    const searchTerm = historySettings.searchTerm.toLowerCase();
    filteredHistory = filteredHistory.filter(item => 
      item.toLowerCase().includes(searchTerm)
    );
  }
  
  // Apply date range filter if provided
  if (historySettings.dateRange.start || historySettings.dateRange.end) {
    filteredHistory = filteredHistory.filter(item => {
      // Extract timestamp from history item
      const match = item.match(/\(([^)]+)\)/);
      if (match && match[1]) {
        const itemDate = new Date(match[1]);
        const startDate = historySettings.dateRange.start ? new Date(historySettings.dateRange.start) : new Date(0);
        const endDate = historySettings.dateRange.end ? new Date(historySettings.dateRange.end) : new Date(8640000000000000); // Max date
        
        return itemDate >= startDate && itemDate <= endDate;
      }
      return true; // Include items without valid dates
    });
  }

  // Apply sorting - newest is default (no reverse needed)
  if (historySettings.sort === 'oldest') {
    filteredHistory.reverse();
  }
  // For 'newest', keep the natural order as scanHistory already stores newest last

  return filteredHistory;
}

// Calculate history analytics - update to handle 🚨 entries
function calculateHistoryAnalytics() {
  historyAnalytics.total = scanHistory.length;
  historyAnalytics.success = scanHistory.filter(item => item.includes('✅')).length;
  historyAnalytics.error = scanHistory.filter(item => item.includes('❌') || item.includes('🚨')).length;
  historyAnalytics.successRate = historyAnalytics.total > 0 ? 
    Math.round((historyAnalytics.success / historyAnalytics.total) * 100) : 0;
  
  // Get last scan date
  if (scanHistory.length > 0) {
    const lastItem = scanHistory[scanHistory.length - 1];
    const match = lastItem.match(/\(([^)]+)\)/);
    historyAnalytics.lastScan = match ? match[1] : null;
  }
  
  // Calculate stats by material
  historyAnalytics.materialStats = {};
  scanHistory.forEach(item => {
    let materialName = '';
    
    // Extract material name
    if (item.includes('✅')) {
      materialName = item.split(':')[0].replace('✅', '').trim();
    } else if (item.includes('❌')) {
      materialName = item.split(':')[0].replace('❌', '').trim();
    } else if (item.includes('🚨')) {
      materialName = item.split(':')[0].replace('🚨', '').trim();
    }
    
    if (materialName) {
      if (!historyAnalytics.materialStats[materialName]) {
        historyAnalytics.materialStats[materialName] = {
          total: 0,
          success: 0,
          error: 0,
          rate: 0
        };
      }
      
      historyAnalytics.materialStats[materialName].total++;
      
      if (item.includes('✅')) {
        historyAnalytics.materialStats[materialName].success++;
      } else if (item.includes('❌') || item.includes('🚨')) {
        historyAnalytics.materialStats[materialName].error++;
      }
      
      historyAnalytics.materialStats[materialName].rate = Math.round(
        (historyAnalytics.materialStats[materialName].success / 
         historyAnalytics.materialStats[materialName].total) * 100
      );
    }
  });
}

// Display history analytics (improved for proper display)
function displayHistoryAnalytics() {
  const analyticsDiv = document.getElementById('history-analytics');
  if (!analyticsDiv) return;

  calculateHistoryAnalytics();

  let analyticsHTML = `
    <h3>📊 Analytics Summary</h3>
    <div class="analytics-summary">
      <div class="analytics-item">
        <span class="analytics-value">${historyAnalytics.total}</span>
        <span class="analytics-label">Total Scans</span>
      </div>
      <div class="analytics-item">
        <span class="analytics-value">${historyAnalytics.success}</span>
        <span class="analytics-label">Successful</span>
      </div>
      <div class="analytics-item">
        <span class="analytics-value">${historyAnalytics.error}</span>
        <span class="analytics-label">Errors</span>
      </div>
      <div class="analytics-item">
        <span class="analytics-value">${historyAnalytics.successRate}%</span>
        <span class="analytics-label">Success Rate</span>
      </div>
    </div>
  `;

  if (historyAnalytics.lastScan) {
    analyticsHTML += `
      <div class="analytics-info">
        <p><strong>Last Scan:</strong> ${historyAnalytics.lastScan}</p>
      </div>
    `;
  }

  if (Object.keys(historyAnalytics.materialStats).length > 0) {
    analyticsHTML += '<div class="material-stats"><h4>Material Statistics</h4><table>';
    analyticsHTML += '<thead><tr><th>Material</th><th>Total</th><th>Success</th><th>Errors</th><th>Success Rate</th></tr></thead><tbody>';

    Object.entries(historyAnalytics.materialStats).forEach(([material, stats]) => {
      let rowClass = '';
      if (stats.rate >= 80) rowClass = 'high-success';
      else if (stats.rate >= 50) rowClass = 'medium-success';
      else rowClass = 'low-success';
      analyticsHTML += `
        <tr class="${rowClass}">
          <td><strong>${material}</strong></td>
          <td>${stats.total}</td>
          <td>${stats.success}</td>
          <td>${stats.error}</td>
          <td>${stats.rate}%</td>
        </tr>
      `;
    });

    analyticsHTML += '</tbody></table></div>';
  } else if (historyAnalytics.total === 0) {
    analyticsHTML += '<div class="no-data"><p>No scan data available for analysis.</p></div>';
  }

  analyticsDiv.innerHTML = analyticsHTML;
  analyticsDiv.style.display = 'block';
}

// Export history to Excel format with advanced formatting
function exportHistoryToExcel() {
  try {
    const filteredHistory = getFilteredAndSortedHistory();
    
    if (filteredHistory.length === 0) {
      displayError('No history data to export', ERROR_TYPES.VALIDATION, 3000);
      return;
    }
    
    // Create HTML table for Excel import
    let htmlContent = `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
            th { background-color: #4CAF50; color: white; padding: 12px; text-align: left; border: 1px solid #ddd; font-weight: bold; }
            td { padding: 8px; border: 1px solid #ddd; }
            .success { background-color: #d4edda; }
            .error { background-color: #f8d7da; }
            .center { text-align: center; }
          </style>
        </head>
        <body>
          <h2>Scan History Report - ${new Date().toLocaleDateString()}</h2>
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Material</th>
                <th>Expected Barcode</th>
                <th>Scanned Barcode</th>
                <th>Timestamp</th>
                <th>Result</th>
                <th>Match</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    // Convert history items to table rows
    filteredHistory.forEach(item => {
      const isSuccess = item.includes('✅');
      const isError = item.includes('❌');
      const rowClass = isSuccess ? 'success' : (isError ? 'error' : '');
      
      let status = 'Unknown';
      let material = '';
      let expectedBarcode = '';
      let scannedBarcode = '';
      let timestamp = '';
      let result = '';
      let match = '';
      
      if (isSuccess) {
        status = '✅ Success';
        result = 'OK LOAD';
        match = '✓ Yes';
        
        const matchResult = item.match(/✅\s+(.+?):\s+(\w+)\s+\((.+?)\)/);
        if (matchResult) {
          material = matchResult[1].trim();
          scannedBarcode = matchResult[2].trim();
          expectedBarcode = scannedBarcode;
          timestamp = matchResult[3].trim();
        }
      } else if (isError) {
        status = '❌ Error';
        result = 'WRONG MATERIAL';
        match = '✗ No';
        
        const matchResult = item.match(/❌\s+(.+?):\s+Expected\s+(\w+),\s+Got\s+(\w+)\s+\((.+?)\)/);
        if (matchResult) {
          material = matchResult[1].trim();
          expectedBarcode = matchResult[2].trim();
          scannedBarcode = matchResult[3].trim();
          timestamp = matchResult[4].trim();
        }
      }
      
      htmlContent += `
        <tr class="${rowClass}">
          <td class="center">${status}</td>
          <td>${material}</td>
          <td class="center">${expectedBarcode}</td>
          <td class="center">${scannedBarcode}</td>
          <td>${timestamp}</td>
          <td class="center">${result}</td>
          <td class="center">${match}</td>
        </tr>
      `;
    });
    
    // Add summary statistics
    calculateHistoryAnalytics();
    htmlContent += `
            </tbody>
          </table>
          <br>
          <h3>Summary Statistics</h3>
          <table style="width: 50%;">
            <tr><td><strong>Total Scans:</strong></td><td>${historyAnalytics.total}</td></tr>
            <tr><td><strong>Successful:</strong></td><td>${historyAnalytics.success}</td></tr>
            <tr><td><strong>Errors:</strong></td><td>${historyAnalytics.error}</td></tr>
            <tr><td><strong>Success Rate:</strong></td><td>${historyAnalytics.successRate}%</td></tr>
          </table>
        </body>
      </html>
    `;
    
    // Create and download Excel file
    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scan-history-${timestamp}.xls`;
    link.click();
    
    URL.revokeObjectURL(url);
    displayError(`${filteredHistory.length} history items exported to Excel successfully`, ERROR_TYPES.VALIDATION, 2000);
    
  } catch (error) {
    displayError('Failed to export Excel: ' + error.message, ERROR_TYPES.VALIDATION);
  }
}

// Enhanced history controls setup
function setupHistoryControls() {
  // Removed: filterSelect, sortSelect, groupToggle, searchInput, startDateInput, endDateInput
  const clearButton = document.getElementById('clear-history');
  const exportButton = document.getElementById('export-history');
  // Removed: const importInput = document.getElementById('import-history');
  const analyzeButton = document.getElementById('analyze-history');
  const excelExportButton = document.getElementById('export-excel');

  if (clearButton) {
    clearButton.addEventListener('click', clearHistory);
  }

  if (excelExportButton) {
    excelExportButton.addEventListener('click', exportHistoryToExcel);
  }

  // Removed importInput event listener

  if (analyzeButton) {
    analyzeButton.addEventListener('click', () => {
      displayHistoryAnalytics();
      const analyticsDiv = document.getElementById('history-analytics');
      if (analyticsDiv) analyticsDiv.style.display = 'block';
    });
  }
}

// Admin authentication functions
function toggleAdminLogin() {
  if (isAdmin) {
    logout();
  } else {
    showAdminLogin();
  }
}

function showAdminLogin() {
  const password = prompt("Enter admin password:");
  if (password === ADMIN_PASSWORD) {
    isAdmin = true;
    updateAdminUI();
    showMaterialValidation("Admin access granted", 'success');
    console.log("Admin logged in");
  } else if (password !== null) {
    showMaterialValidation("Invalid admin password", 'error');
  }
}

function logout() {
  isAdmin = false;
  updateAdminUI();
  showMaterialValidation("Admin logged out", 'success');
  console.log("Admin logged out");
}

function updateAdminUI() {
  // Update footer admin controls visibility
  const materialManagementSection = document.querySelector('.footer-section:first-child');
  const quickActionsSection = document.querySelector('.footer-section:last-child');
  const adminToggleBtn = document.getElementById('admin-toggle-btn');
  
  if (materialManagementSection) {
    materialManagementSection.style.display = isAdmin ? 'block' : 'none';
  }
  
  if (quickActionsSection) {
    quickActionsSection.style.display = isAdmin ? 'block' : 'none';
  }
  
  // Update admin toggle button text
  if (adminToggleBtn) {
    adminToggleBtn.textContent = isAdmin ? '🔐' : '🔑';
    adminToggleBtn.title = isAdmin ? 'Admin Logout' : 'Admin Login';
    adminToggleBtn.className = isAdmin ? 'admin-btn admin-logout' : 'admin-btn admin-login';
  }
  
  // Hide/show delete button based on admin status
  updateDeleteButtonState();
}

function checkAdminAccess(action) {
  if (!isAdmin) {
    showMaterialValidation(`Admin access required for ${action}`, 'warning');
    return false;
  }
  return true;
}

// Initialize history management with new features
function initializeHistoryManagement() {
  setupHistoryControls();
  calculateHistoryAnalytics();
}

// Update footer statistics
function updateFooterStats() {
  try {
    const footerScanCount = document.getElementById('footer-scan-count');
    const footerMaterialCount = document.getElementById('footer-material-count');
    
    if (footerScanCount) {
      footerScanCount.textContent = `Total Scans: ${scanHistory.length}`;
    }
    
    if (footerMaterialCount) {
      footerMaterialCount.textContent = `Materials: ${materials.length}`;
    }
  } catch (error) {
    console.warn('Failed to update footer stats:', error);
  }
}

// Global variable to track alarm audio
let alarmAudio = null;

// Create continuous alarm sound effect
function createAlarmSound() {
  try {
    // Create audio context for alarm sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create a buffer for a short alarm beep
    const sampleRate = audioContext.sampleRate;
    const duration = 0.5; // 0.5 seconds per beep
    const frameCount = sampleRate * duration;
    const buffer = audioContext.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Generate alarm waveform (alternating high and low frequency)
    for (let i = 0; i < frameCount; i++) {
      const time = i / sampleRate;
      
      // Create alarm pattern: 800Hz for first half, 600Hz for second half
      const frequency = time < duration / 2 ? 800 : 600;
      
      // Generate square wave for more urgent sound
      const sample = Math.sin(2 * Math.PI * frequency * time) > 0 ? 1 : -1;
      
      // Add envelope to prevent clicks
      const envelope = Math.sin(Math.PI * time / duration);
      
      data[i] = sample * envelope * 0.4; // Volume at 40%
    }
    
    return { audioContext, buffer };
    
  } catch (error) {
    console.warn('Failed to create alarm sound:', error);
    return null;
  }
}

// Start continuous alarm
function startAlarm() {
  try {
    stopAlarm(); // Stop any existing alarm
    
    const alarmData = createAlarmSound();
    if (!alarmData) return;
    
    const { audioContext, buffer } = alarmData;
    
    // Function to play one beep and schedule the next
    function playBeep() {
      if (!alarmAudio) return; // Stop if alarm was stopped
      
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start();
      
      // Schedule next beep after a short pause
      setTimeout(() => {
        if (alarmAudio) { // Check if alarm is still active
          playBeep();
        }
      }, 700); // 0.5s beep + 0.2s pause = 0.7s total
    }
    
    // Mark alarm as active and start playing
    alarmAudio = { audioContext, stop: () => { alarmAudio = null; } };
    playBeep();
    
    console.log('Alarm started');
    
  } catch (error) {
    console.warn('Failed to start alarm:', error);
  }
}

// Stop continuous alarm
function stopAlarm() {
  if (alarmAudio) {
    alarmAudio.stop();
    alarmAudio = null;
    console.log('Alarm stopped');
  }
}

// Custom alert dialog for wrong material scans
function showWrongMaterialAlert(expectedCode, scannedCode, materialName) {
  // Start continuous alarm
  startAlarm();
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'alert-overlay';
  
  // Create alert dialog
  const alertDialog = document.createElement('div');
  alertDialog.className = 'alert-dialog wrong-material-alert';
  
  alertDialog.innerHTML = `
    <div class="alert-icon">⚠️</div>
    <h3 class="alert-title">Wrong Material Scanned!</h3>
    <div class="alert-content">
      <p><strong>Expected Material:</strong> ${materialName}</p>
      <p><strong>Expected Barcode:</strong> <code>${expectedCode}</code></p>
      <p><strong>Scanned Barcode:</strong> <code>${scannedCode}</code></p>
      <p class="alert-message">⚠️ INVALID MATERIAL DETECTED! Please scan the correct material barcode or reset to try again.</p>
    </div>
    <div class="alert-actions">
      <button class="alert-btn alert-btn-primary" id="alert-reset-btn">
        🔄 Stop Alarm & Reset
      </button>
    </div>
  `;
  
  overlay.appendChild(alertDialog);
  document.body.appendChild(overlay);
  
  // Add event listeners
  const resetBtn = alertDialog.querySelector('#alert-reset-btn');
  
  const closeAlert = () => {
    stopAlarm(); // Stop the alarm when closing
    document.body.removeChild(overlay);
  };
  
  const resetSystem = () => {
    // Stop the alarm first
    stopAlarm();
    
    // Clear the barcode input
    if (domElements['barcode-input']) {
      domElements['barcode-input'].value = '';
      domElements['barcode-input'].focus();
    }
    
    // Clear any error styling
    if (domElements['barcode-input']) {
      domElements['barcode-input'].className = '';
    }
    
    // Clear result display
    if (domElements.result) {
      domElements.result.textContent = `Please scan barcode for ${selectedMaterial.name}`;
      domElements.result.className = '';
    }
    
    // Reset scan attempts
    scanAttempts = Math.max(0, scanAttempts - 1);
    
    closeAlert();
    
    // Show success message
    setTimeout(() => {
      displayError('System reset. Ready to scan again.', ERROR_TYPES.VALIDATION, 2000);
    }, 300);
  };
  
  resetBtn.addEventListener('click', resetSystem);
  
  // Close on Escape key (also stops alarm)
  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      closeAlert();
      document.removeEventListener('keydown', handleKeydown);
    }
  };
  document.addEventListener('keydown', handleKeydown);
  
  // Focus the reset button for accessibility
  setTimeout(() => {
    resetBtn.focus();
  }, 100);
  
  // Speak error message
  speakText('Wrong material scanned. Invalid material detected. Please scan the correct barcode.');
}

// Enhanced scan handler with improved material validation
function handleScan() {
  try {
    // Validate rate limiting
    const rateValidation = validateScanRate();
    if (!rateValidation.valid) {
      displayError(rateValidation.error, ERROR_TYPES.VALIDATION);
      return;
    }
    
    // Validate material selection
    if (!selectedMaterial) {
      displayError("Please select a material first", ERROR_TYPES.VALIDATION);
      return;
    }
    
    // Get the scanned input
    const barcodeInput = domElements['barcode-input'];
    if (!barcodeInput) {
      displayError('Barcode input not found', ERROR_TYPES.VALIDATION);
      return;
    }
    
    const input = barcodeInput.value.trim();
    
    // Clear the input immediately for next scan
    barcodeInput.value = '';
    
    // Validate input
    const inputErrors = validateBarcodeInput(input);
    
    if (inputErrors.length > 0) {
      displayError(inputErrors.join('. '), ERROR_TYPES.VALIDATION);
      // Keep focus for next scan
      setTimeout(() => barcodeInput.focus(), 100);
      return;
    }
    
    const scannedCode = normalizeBarcode(input);
    const expectedCode = normalizeBarcode(selectedMaterial.barcode);
    
    if (!scannedCode || !expectedCode) {
      throw new Error('Failed to process barcode data');
    }
    
    const timestamp = new Date().toLocaleString();
    
    if (scannedCode === expectedCode) {
      domElements.result.textContent = "✅ OK LOAD";
      domElements.result.className = "success";
      playSound(true);
      speakText("OK Load");
      
      // Always add successful scans to history
      const historyEntry = `✅ ${selectedMaterial.name}: ${scannedCode} (${timestamp})`;
      scanHistory.push(historyEntry);
      addHistoryItem(historyEntry);
      saveHistory();
      
    } else {
      // Check if scanned code belongs to any valid material (invalid material detection)
      const isValidMaterial = materials.some(material => 
        normalizeBarcode(material.barcode) === scannedCode
      );
      
      if (isValidMaterial) {
        // Valid material but wrong for current selection - show regular error
        domElements.result.textContent = "❌ WRONG MATERIAL";
        domElements.result.className = "error";
        playSound(false);
        speakText("Wrong material");
        
        // Add to history
        const errorEntry = `❌ ${selectedMaterial.name}: Expected ${expectedCode}, Got ${scannedCode} (${timestamp})`;
        scanHistory.push(errorEntry);
        addHistoryItem(errorEntry, true);
        saveHistory();
        
      } else {
        // Invalid material - show alarm alert
        showWrongMaterialAlert(expectedCode, scannedCode, selectedMaterial.name);
        
        // Update result display
        domElements.result.textContent = "🚨 INVALID MATERIAL";
        domElements.result.className = "error";
        
        // Add to history with special marking for invalid materials
        const errorEntry = `🚨 ${selectedMaterial.name}: INVALID MATERIAL - Expected ${expectedCode}, Got ${scannedCode} (${timestamp})`;
        scanHistory.push(errorEntry);
        addHistoryItem(errorEntry, true);
        saveHistory();
      }
    }
    
    // After adding to history, update analytics and footer
    if (scanHistory.length > 0) {
      calculateHistoryAnalytics();
      if (document.getElementById('history-analytics')) {
        displayHistoryAnalytics();
      }
      updateFooterStats();
    }
    
    // Keep focus on input for continuous scanning
    setTimeout(() => {
      barcodeInput.focus();
    }, 100);
    
  } catch (error) {
    displayError('Scan processing failed: ' + error.message, ERROR_TYPES.VALIDATION);
    // Keep focus even on error
    setTimeout(() => {
      if (domElements['barcode-input']) {
        domElements['barcode-input'].focus();
      }
    }, 100);
  }
}

// Real-time material input validation
function validateMaterialInputs() {
  try {
    const nameInput = domElements['add-material-name'];
    const barcodeInput = domElements['add-material-barcode'];
    const validationElement = domElements['material-validation'];
    
    if (!nameInput || !barcodeInput || !validationElement) {
      return;
    }
    
    const name = nameInput.value.trim();
    const barcode = barcodeInput.value.trim();
    
    let errors = [];
    let warnings = [];
    
    // Validate name
    if (name.length > 0) {
      if (name.length < 2) {
        errors.push('Material name must be at least 2 characters');
      } else if (name.length > 50) {
        errors.push('Material name must be less than 50 characters');
      } else if (materials.some(m => m.name.toLowerCase() === name.toLowerCase())) {
        warnings.push('Material name already exists');
      }
    }
    
    // Validate barcode
    if (barcode.length > 0) {
      if (!/^[a-zA-Z0-9]*$/.test(barcode)) {
        errors.push('Barcode must contain only letters and numbers');
      } else if (barcode.length > 0 && barcode.length < 3) {
        errors.push('Barcode must be at least 3 characters');
      } else if (barcode.length > 20) {
        errors.push('Barcode cannot exceed 20 characters');
      } else if (materials.some(m => m.barcode === barcode)) {
        warnings.push('Barcode already exists');
      }
    }
    
    // Update validation display
    if (errors.length > 0) {
      showMaterialValidation(errors.join('. '), 'error');
    } else if (warnings.length > 0) {
      showMaterialValidation(warnings.join('. '), 'warning');
    } else if (name.length > 0 || barcode.length > 0) {
      validationElement.style.display = 'none';
    }
    
    // Update input field styling
    nameInput.className = errors.some(e => e.includes('name')) ? 'invalid' : 
                         name.length >= 2 && name.length <= 50 ? 'valid' : '';
    
    barcodeInput.className = errors.some(e => e.includes('Barcode')) ? 'invalid' : 
                            barcode.length >= 3 && barcode.length <= 20 && /^[a-zA-Z0-9]*$/.test(barcode) ? 'valid' : '';
    
  } catch (error) {
    console.warn('Material input validation failed:', error);
  }
}

// Enhanced event listeners with error handling
function setupEventListeners() {
  try {
    // Material selection
    if (domElements['material-select']) {
      domElements['material-select'].addEventListener('change', handleMaterialSelection);
    }
    
    // Scan functionality - Remove scan button, USB scanner works automatically
    if (domElements['barcode-input']) {
      // Focus the input when it becomes visible
      domElements['barcode-input'].addEventListener('focus', () => {
        console.log('Barcode input focused - ready for USB scanner');
      });
      
      // Handle Enter key (USB scanners typically send Enter after barcode)
      domElements['barcode-input'].addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault(); // Prevent form submission
          handleScan();
        }
      });
      
      // Add input validation for barcode field
      domElements['barcode-input'].addEventListener('input', (e) => {
        const input = e.target.value;
        const errors = validateBarcodeInput(input);
        
        // Update validation display
        const validationElement = domElements['validation-errors'];
        if (validationElement) {
          if (errors.length > 0 && input.length > 0) {
            validationElement.textContent = errors.join('. ');
            validationElement.style.display = 'block';
            e.target.className = 'invalid';
          } else {
            validationElement.style.display = 'none';
            e.target.className = input.length >= 3 && input.length <= 20 && /^[a-zA-Z0-9]*$/.test(input) ? 'valid' : '';
          }
        }
      });
    }

    // Material management event listeners
    if (domElements['add-material-btn']) {
      domElements['add-material-btn'].addEventListener('click', handleAddMaterial);
    }
    
    if (domElements['delete-material-btn']) {
      domElements['delete-material-btn'].addEventListener('click', handleDeleteMaterial);
    }
    
    // Real-time validation for material inputs
    if (domElements['add-material-name']) {
      domElements['add-material-name'].addEventListener('input', validateMaterialInputs);
      domElements['add-material-name'].addEventListener('blur', validateMaterialInputs);
      domElements['add-material-name'].addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (domElements['add-material-barcode']) {
            domElements['add-material-barcode'].focus();
          }
        }
      });
    }
    
    if (domElements['add-material-barcode']) {
      domElements['add-material-barcode'].addEventListener('input', validateMaterialInputs);
      domElements['add-material-barcode'].addEventListener('blur', validateMaterialInputs);
      domElements['add-material-barcode'].addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAddMaterial();
        }
      });
    }
    
    // Admin toggle button
    const adminToggleBtn = document.getElementById('admin-toggle-btn');
    if (adminToggleBtn) {
      adminToggleBtn.addEventListener('click', toggleAdminLogin);
    }
    
    // History controls
    const clearButton = document.getElementById('clear-history');
    if (clearButton) {
      clearButton.addEventListener('click', clearHistory);
    }
    
    const excelExportButton = document.getElementById('export-excel');
    if (excelExportButton) {
      excelExportButton.addEventListener('click', exportHistoryToExcel);
    }
    
    const analyzeButton = document.getElementById('analyze-history');
    if (analyzeButton) {
      analyzeButton.addEventListener('click', () => {
        displayHistoryAnalytics();
        const analyticsDiv = document.getElementById('history-analytics');
        if (analyticsDiv) analyticsDiv.style.display = 'block';
      });
    }
    
    console.log('All event listeners setup successfully');
    
  } catch (error) {
    displayError('Failed to setup event listeners: ' + error.message, ERROR_TYPES.VALIDATION);
  }
}

// Enhanced initialization
function initialize() {
  try {
    // Check for required browser features
    if (!window.localStorage) {
      displayError('LocalStorage not supported', ERROR_TYPES.STORAGE);
    }
    
    // Load materials first before initializing DOM
    loadMaterials();
    
    if (!initializeDOMElements()) {
      return;
    }
    if (!populateMaterials()) {
      return;
    }
    setupEventListeners();
    loadHistory();
    initializeHistoryManagement();
    updateFooterStats();
    updateAdminUI(); // Initialize admin UI state
    console.log('Application initialized successfully');
    console.log('Total materials loaded:', materials.length);
  } catch (error) {
    displayError('Application initialization failed: ' + error.message, ERROR_TYPES.VALIDATION);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  displayError('An unexpected error occurred', ERROR_TYPES.VALIDATION);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  displayError('An unexpected error occurred', ERROR_TYPES.VALIDATION);
});

function clearHistory() {
  if (!checkAdminAccess('clearing history')) {
    return;
  }
  
  if (confirm('Are you sure you want to clear all history?')) {
    scanHistory = [];
    localStorage.removeItem('scanHistory');
    // Clear the displayed history list
    if (domElements['scan-history']) {
      domElements['scan-history'].innerHTML = '';
    }
    calculateHistoryAnalytics();
    const analyticsDiv = document.getElementById('history-analytics');
    if (analyticsDiv) {
      analyticsDiv.innerHTML = '';
    }
    updateFooterStats();
    displayError('History cleared successfully', ERROR_TYPES.VALIDATION, 2000);
  }
}
