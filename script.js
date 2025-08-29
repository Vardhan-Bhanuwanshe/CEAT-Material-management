// Modern DRBS Material Management System
(function() {
  'use strict';

  // System Initialization
  const SystemInitializer = {
    async initialize() {
  const loadingOverlay = document.getElementById('system-loading');
  const progressBar = document.getElementById('loading-progress');
  const progressFill = document.getElementById('progress-fill');
      
      // Simulate system initialization steps
      const steps = [
        { message: 'Loading material database...', duration: 800 },
        { message: 'Connecting to barcode scanner...', duration: 600 },
        { message: 'Initializing admin panel...', duration: 500 },
        { message: 'System ready!', duration: 300 }
      ];
      
      let progress = 0;
      const progressStep = 100 / steps.length;
      
      for (const step of steps) {
        if (loadingOverlay && progressFill) loadingOverlay.querySelector('#loading-status').textContent = step.message;
        await this.simulateStep(step.message, step.duration);
        progress += progressStep;
        if (progressFill) progressFill.style.width = `${progress}%`;
      }

      // Hide loading screen if present
      if (loadingOverlay) {
        setTimeout(() => {
          loadingOverlay.classList.add('hidden');
          setTimeout(() => {
            if (loadingOverlay && loadingOverlay.parentElement) loadingOverlay.parentElement.removeChild(loadingOverlay);
          }, 500);
        }, 300);
      }
    },
    
    simulateStep(message, duration) {
      console.log(`System: ${message}`);
      return new Promise(resolve => setTimeout(resolve, duration));
    }
  };

  // Utility: focus element without scrolling the page
  function focusNoScroll(el) {
    if (!el) return;
    try {
      el.focus({ preventScroll: true });
    } catch (e) {
      el.focus();
    }
  }

  // Application State
  const AppState = {
    currentStep: 1,
    selectedMaterial: null,
    scannedBarcode: null,
    selectedVendor: null,
    qrData: null,
    qrScanned: false,
    sessionStartTime: new Date(),
    scanHistory: [],
  lastVendorId: localStorage.getItem('drbs_last_vendor') || null,
    statistics: {
      successfulScans: 0,
      failedScans: 0,
      accuracy: 100
    }
  };

  // Data Management
  const DataManager = {
    getMaterials() {
      try {
        const stored = localStorage.getItem('drbs_materials');
        return stored ? JSON.parse(stored) : this.getDefaultMaterials();
      } catch (e) {
        console.warn('Failed to load materials:', e);
        return this.getDefaultMaterials();
      }
    },

    getDefaultMaterials() {
      return [
        { id: 'MAT001', name: 'PVC Sheet', barcode: '123456789012' },
        { id: 'MAT002', name: 'Rubber Roll', barcode: '123456789013' },
        { id: 'MAT003', name: 'Steel Plate', barcode: '123456789014' },
        { id: 'MAT004', name: 'Aluminum Sheet', barcode: '123456789015' },
        { id: 'MAT005', name: 'Copper Wire', barcode: '123456789016' }
      ];
    },

    getVendors() {
      try {
        const stored = localStorage.getItem('drbs_vendors');
        return stored ? JSON.parse(stored) : this.getDefaultVendors();
      } catch (e) {
        console.warn('Failed to load vendors:', e);
        return this.getDefaultVendors();
      }
    },

    getDefaultVendors() {
      return [
        { id: 'VEN001', code: 'VEN001', name: 'Industrial Supplies Co.' },
        { id: 'VEN002', code: 'VEN002', name: 'Steel Solutions Ltd.' },
        { id: 'VEN003', code: 'VEN003', name: 'Global Materials Inc.' },
        { id: 'VEN004', code: 'VEN004', name: 'Advanced Polymers Inc.' },
        { id: 'VEN005', code: 'VEN005', name: 'MetalWorks Corporation' }
      ];
    },

    saveHistory() {
      try {
        localStorage.setItem('drbs_history', JSON.stringify(AppState.scanHistory));
      } catch (e) {
        console.error('Failed to save history:', e);
      }
    },

    loadHistory() {
      try {
        const stored = localStorage.getItem('drbs_history');
        if (stored) {
          AppState.scanHistory = JSON.parse(stored);
          this.updateHistoryDisplay();
          this.updateStatistics();
        }
      } catch (e) {
        console.warn('Failed to load history:', e);
      }
    },

    updateStatistics() {
      const successful = AppState.scanHistory.filter(h => h.status === 'success').length;
      const failed = AppState.scanHistory.filter(h => h.status === 'error').length;
      const total = successful + failed;
      
      AppState.statistics.successfulScans = successful;
      AppState.statistics.failedScans = failed;
      AppState.statistics.accuracy = total > 0 ? Math.round((successful / total) * 100) : 100;
      
      this.updateStatisticsDisplay();
    },

    updateStatisticsDisplay() {
      const stats = AppState.statistics;
      
      // Update main statistics
      const successEl = document.getElementById('successful-scans');
      const failedEl = document.getElementById('failed-scans');
      const accuracyEl = document.getElementById('accuracy-rate');
      
      if (successEl) successEl.textContent = stats.successfulScans;
      if (failedEl) failedEl.textContent = stats.failedScans;
      if (accuracyEl) accuracyEl.textContent = stats.accuracy + '%';
      
      // Update dashboard metrics
      const totalScansEl = document.getElementById('total-scans');
      const successfulScansMetricEl = document.getElementById('successful-scans-metric');
      const errorScansMetricEl = document.getElementById('error-scans-metric');
      const accuracyMetricEl = document.getElementById('accuracy-metric');
      const historyCountEl = document.getElementById('history-count');
      
      if (totalScansEl) totalScansEl.textContent = AppState.scanHistory.length;
      if (successfulScansMetricEl) successfulScansMetricEl.textContent = stats.successfulScans;
      if (errorScansMetricEl) errorScansMetricEl.textContent = stats.failedScans;
      if (accuracyMetricEl) accuracyMetricEl.textContent = stats.accuracy + '%';
      if (historyCountEl) historyCountEl.textContent = AppState.scanHistory.length;
      
      // Update counts
      const materialsEl = document.getElementById('materials-count');
      const vendorsEl = document.getElementById('vendors-count');
      
      if (materialsEl) materialsEl.textContent = this.getMaterials().length;
      if (vendorsEl) vendorsEl.textContent = this.getVendors().length;
    },

    updateHistoryDisplay() {
      const tbody = document.getElementById('history-body');
      if (!tbody) return;

      // Update history count in header if count badge exists
      const historyHeader = document.querySelector('.history-header h3');
      if (historyHeader) {
        const countBadge = historyHeader.querySelector('.count-badge');
        if (countBadge) {
          countBadge.textContent = AppState.scanHistory.length;
        }
      }

      if (AppState.scanHistory.length === 0) {
        tbody.innerHTML = `
          <tr class="empty-state">
            <td colspan="6">
              <div class="empty-message">
                <i class="fas fa-inbox"></i>
                <span>No scans yet. Start scanning to see history.</span>
              </div>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = AppState.scanHistory.map(entry => `
        <tr>
          <td>${entry.timestamp}</td>
          <td>${entry.materialName}</td>
          <td><code>${entry.scannedBarcode}</code></td>
          <td>${entry.vendorName || '-'}</td>
          <td><span class="status-badge ${entry.status}">${entry.status.toUpperCase()}</span></td>
          <td>
            ${entry.qrData ? `
              <div class="qr-data-cell">
                <code class="qr-data-preview">${entry.qrData.length > 20 ? entry.qrData.substring(0, 20) + '...' : entry.qrData}</code>
                <button class="action-btn secondary" onclick="copyQRData('${entry.qrData}')" title="Copy QR Data">
                  <i class="fas fa-copy"></i>
                </button>
                <button class="action-btn" onclick="showQRData('${entry.qrData}')" title="View Full QR Data">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            ` : '<span class="no-qr">No QR Data</span>'}
          </td>
        </tr>
      `).reverse().join('');
    }
  };

  // UI Manager
  const UIManager = {
    showToast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.innerHTML = `
        <div class="toast-content">
          <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'info-circle'}"></i>
          <span>${message}</span>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
          <i class="fas fa-times"></i>
        </button>
      `;

      container.appendChild(toast);
      setTimeout(() => toast.remove(), 5000);
    },

    updateStepStatus(step, status) {
      const stepEl = document.getElementById(`step-${step}`);
      const statusEl = document.getElementById(`step-${step}-status`);
      
      if (stepEl && statusEl) {
        stepEl.className = `workflow-step ${status}`;
        
        if (status === 'completed') {
          statusEl.innerHTML = '<i class="fas fa-check-circle"></i>';
        } else if (status === 'error') {
          statusEl.innerHTML = '<i class="fas fa-times-circle"></i>';
        } else if (status === 'active') {
          statusEl.innerHTML = '<i class="fas fa-circle-dot"></i>';
        } else {
          statusEl.innerHTML = '<i class="fas fa-circle"></i>';
        }
      }
    },

    resetWorkflow() {
      AppState.currentStep = 1;
      AppState.selectedMaterial = null;
      AppState.scannedBarcode = null;
      AppState.selectedVendor = null;
      AppState.qrData = null;
      AppState.qrScanned = false;

      // Reset all steps
      for (let i = 1; i <= 4; i++) {
        this.updateStepStatus(i, i === 1 ? 'active' : '');
      }

      // Reset form elements
      document.getElementById('material-select').value = '';
      document.getElementById('vendor-select').value = '';
      document.getElementById('vendor-select').disabled = true;

      // Hide selection displays
      document.getElementById('selected-material').style.display = 'none';
      document.getElementById('selected-vendor').style.display = 'none';
      
      // Reset auto-scan area
      const autoScanArea = document.getElementById('auto-scan-area');
      if (autoScanArea) {
        autoScanArea.className = 'auto-scan-area';
        autoScanArea.innerHTML = `
          <div class="scan-placeholder">
            <i class="fas fa-barcode"></i>
            <span>Select material to start automatic scanning</span>
          </div>
        `;
      }
      
      // Hide scan instructions
      const scanInstructions = document.getElementById('scan-instructions');
      if (scanInstructions) {
        scanInstructions.style.display = 'none';
      }

      // Reset QR display
      const qrDisplay = document.getElementById('qr-display');
      qrDisplay.innerHTML = `
        <div class="qr-placeholder">
          <i class="fas fa-qrcode"></i>
          <span>Complete previous steps</span>
        </div>
      `;
      document.getElementById('qr-actions').style.display = 'none';
    }
  };

  // Workflow Functions
  window.handleMaterialSelection = function() {
    const select = document.getElementById('material-select');
    const selectedBarcode = select.value;
    
    if (!selectedBarcode) {
      AppState.selectedMaterial = null;
      document.getElementById('selected-material').style.display = 'none';
      UIManager.updateStepStatus(1, 'active');
      UIManager.updateStepStatus(2, '');
      
      // Reset auto-scan area
      const autoScanArea = document.getElementById('auto-scan-area');
      autoScanArea.className = 'auto-scan-area';
      autoScanArea.innerHTML = `
        <div class="scan-placeholder">
          <i class="fas fa-barcode"></i>
          <span>Select material to start automatic scanning</span>
        </div>
      `;
      document.getElementById('scan-instructions').style.display = 'none';
      return;
    }

    const materials = DataManager.getMaterials();
    AppState.selectedMaterial = materials.find(m => m.barcode === selectedBarcode);
    
  if (AppState.selectedMaterial) {
      // Show selected material
      document.getElementById('material-name').textContent = AppState.selectedMaterial.name;
      document.getElementById('material-barcode').textContent = AppState.selectedMaterial.barcode;
      document.getElementById('selected-material').style.display = 'block';
      
      UIManager.updateStepStatus(1, 'completed');
      UIManager.updateStepStatus(2, 'active');
      
      // Start automatic scanning if auto-scan area exists, otherwise enable manual start
      if (document.getElementById('auto-scan-area')) {
        startAutomaticScanning();
      } else if (document.getElementById('barcode-scan-area')) {
        const scanArea = document.getElementById('barcode-scan-area');
        scanArea.className = 'scan-area';
        scanArea.innerHTML = `
          <div class="scan-placeholder">
            <i class="fas fa-crosshairs"></i>
            <span>Scanner Ready - Click "Start Barcode Scan"</span>
          </div>
        `;
        const btn = document.getElementById('start-barcode-scan');
        if (btn) btn.disabled = false;
      }
      
      UIManager.showToast(`Material selected: ${AppState.selectedMaterial.name}. Scanner is now ready!`, 'success');
    }
  };

  function startAutomaticScanning() {
    if (!AppState.selectedMaterial) return;

    const autoScanArea = document.getElementById('auto-scan-area') || document.getElementById('barcode-scan-area');
    const scanInstructions = document.getElementById('scan-instructions');
    
    // Update UI to show scanning ready state
  autoScanArea.className = (autoScanArea.id === 'auto-scan-area') ? 'auto-scan-area ready' : 'scan-area ready';
    autoScanArea.innerHTML = `
      <div class="scan-placeholder">
        <i class="fas fa-crosshairs"></i>
        <span>Scanner Ready - Waiting for barcode...</span>
      </div>
    `;
    
    if (scanInstructions) {
      scanInstructions.style.display = 'block';
    }
    
    // Activate scanner input
  const barcodeInput = document.getElementById('barcode-input');
  barcodeInput.value = '';
  focusNoScroll(barcodeInput);
    
    // Enhanced visual feedback with better animation
    setTimeout(() => {
      autoScanArea.className = (autoScanArea.id === 'auto-scan-area') ? 'auto-scan-area scanning' : 'scan-area scanning';
      autoScanArea.innerHTML = `
        <div class="scan-placeholder">
          <i class="fas fa-barcode"></i>
          <span>Scanning Active - Ready to scan</span>
          <small>Position barcode and scan</small>
        </div>
      `;
      
      UIManager.showToast('Auto-scanning activated. Ready to scan barcode.', 'info');
    }, 1000);
  }

  // Manual start for index-modern flow
  window.startBarcodeScanning = function() {
    if (!AppState.selectedMaterial) {
      UIManager.showToast('Please select a material first', 'warning');
      return;
    }
    const area = document.getElementById('barcode-scan-area');
    if (area) {
      area.className = 'scan-area scanning';
      area.innerHTML = `
        <div class="scan-placeholder">
          <i class="fas fa-barcode"></i>
          <span>Scanning Active - Ready to scan</span>
          <small>Position barcode and scan</small>
        </div>`;
    }
    const input = document.getElementById('barcode-input');
    if (input) { input.value = ''; input.focus(); }
    UIManager.showToast('Scanner ready. Please scan the barcode.', 'info');
  };

  // QR Code scanning function
  window.startQRScanning = function() {
    if (!AppState.qrData) {
      UIManager.showToast('No QR code generated yet', 'warning');
      return;
    }
    
    UIManager.showToast('Please scan the QR code to complete the workflow', 'info');
    
    // Focus on hidden input for QR scanner
    const barcodeInput = document.getElementById('barcode-input');
    if (barcodeInput) {
      barcodeInput.value = '';
      barcodeInput.focus();
    }
    
    // Visual feedback for QR scanning mode
    const qrDisplay = document.getElementById('qr-display');
    const currentContent = qrDisplay.innerHTML;
    qrDisplay.innerHTML = `
      <div class="qr-content">
        <div class="qr-header" style="text-align: center; margin-bottom: 1rem; color: var(--warning-color);">
          <i class="fas fa-qrcode fa-pulse" style="font-size: 1.5rem; margin-right: 0.5rem;"></i>
          <strong>Waiting for QR Code Scan...</strong>
        </div>
        <div style="text-align: center; padding: 2rem; background: var(--gray-50); border-radius: 0.5rem; border: 2px dashed var(--warning-color);">
          <i class="fas fa-camera" style="font-size: 3rem; color: var(--warning-color); margin-bottom: 1rem;"></i>
          <p>Position the QR code under the scanner</p>
          <small>The system is ready to receive the QR scan</small>
        </div>
      </div>
    `;
    
    // Store original content to restore if needed
    AppState.originalQRContent = currentContent;
  };

  window.handleVendorSelection = function() {
    const select = document.getElementById('vendor-select');
    const selectedId = select.value;
    
    if (!selectedId) {
      AppState.selectedVendor = null;
      document.getElementById('selected-vendor').style.display = 'none';
      UIManager.updateStepStatus(3, 'active');
      return;
    }

    const vendors = DataManager.getVendors();
    AppState.selectedVendor = vendors.find(v => v.id === selectedId);
    
    if (AppState.selectedVendor) {
      // Show selected vendor
      document.getElementById('vendor-name').textContent = AppState.selectedVendor.name;
      document.getElementById('vendor-code').textContent = AppState.selectedVendor.code;
      document.getElementById('selected-vendor').style.display = 'block';
      
      UIManager.updateStepStatus(3, 'completed');
      UIManager.updateStepStatus(4, 'active');
      
      // Remember last vendor for convenience
      try { localStorage.setItem('drbs_last_vendor', AppState.selectedVendor.id); } catch {}

      // Generate QR code
      generateQRCode();
      
      UIManager.showToast(`Selected vendor: ${AppState.selectedVendor.name}`, 'success');
    }
  };

  function generateQRCode() {
    if (!AppState.selectedMaterial || !AppState.scannedBarcode || !AppState.selectedVendor) {
      UIManager.showToast('Please complete all previous steps', 'warning');
      return;
    }

    const qrData = {
      timestamp: new Date().toISOString(),
      material: {
        id: AppState.selectedMaterial.id,
        name: AppState.selectedMaterial.name,
        expectedBarcode: AppState.selectedMaterial.barcode,
        scannedBarcode: AppState.scannedBarcode
      },
      vendor: {
        id: AppState.selectedVendor.id,
        code: AppState.selectedVendor.code,
        name: AppState.selectedVendor.name
      },
      session: {
        startTime: AppState.sessionStartTime.toISOString(),
        operator: 'System User',
        sessionId: `DRBS-${Date.now()}`
      }
    };

    AppState.qrData = JSON.stringify(qrData, null, 2);
    
    // Enhanced QR display with loading animation
    const qrDisplay = document.getElementById('qr-display');
    qrDisplay.innerHTML = `
      <div class="qr-loading" style="text-align: center; padding: 2rem; color: var(--primary-color);">
        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
        <div>Generating QR Code...</div>
      </div>
    `;
    
    // Simulate QR generation process
    setTimeout(() => {
      qrDisplay.innerHTML = `
        <div class="qr-content">
          <div class="qr-header" style="text-align: center; margin-bottom: 1rem; color: var(--success-color);">
            <i class="fas fa-qrcode" style="font-size: 1.5rem; margin-right: 0.5rem;"></i>
            <strong>QR Code Generated Successfully</strong>
          </div>
          <div class="qr-data-preview" style="background: var(--gray-50); padding: 1rem; border-radius: 0.5rem; border: 1px solid var(--gray-200);">
            <pre style="margin: 0; font-size: 0.875rem; line-height: 1.4;">${AppState.qrData}</pre>
          </div>
          <div style="margin-top: 1rem; padding: 1rem; background: var(--warning-color); color: white; border-radius: 0.5rem; text-align: center;">
            <i class="fas fa-info-circle" style="margin-right: 0.5rem;"></i>
            <strong>Please scan this QR code to complete the process</strong>
          </div>
        </div>
      `;
      
      document.getElementById('qr-actions').style.display = 'flex';
      
      // Update QR actions to include scan button
      document.getElementById('qr-actions').innerHTML = `
        <button class="action-btn secondary" onclick="copyQRData()">
          <i class="fas fa-copy"></i>
          Copy Data
        </button>
        <button class="action-btn" onclick="showFullscreenQR()">
          <i class="fas fa-expand"></i>
          View Full
        </button>
        <button class="action-btn" onclick="startQRScanning()" style="background: var(--warning-color);">
          <i class="fas fa-qrcode"></i>
          Scan QR Code
        </button>
      `;
      
      UIManager.updateStepStatus(4, 'active');
      UIManager.showToast('QR code generated! Please scan the QR code to complete the workflow.', 'info');
      
    }, 1500); // Enhanced loading experience
  }

  // Complete workflow after QR scan
  function completeAfterQRScan() {
    // Add to history after QR scan
    addToHistory('success');
    
    UIManager.updateStepStatus(4, 'completed');
    UIManager.showToast('🎉 QR code scanned successfully! Workflow complete.', 'success');
    
    // Auto-reset after 5 seconds
    setTimeout(() => {
      UIManager.resetWorkflow();
      populateDropdowns();
      UIManager.showToast('Ready for next scan', 'info');
    }, 5000);
  }

  function addToHistory(status) {
    const entry = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString(),
      materialName: AppState.selectedMaterial ? AppState.selectedMaterial.name : 'Unknown',
      expectedBarcode: AppState.selectedMaterial ? AppState.selectedMaterial.barcode : '',
      scannedBarcode: AppState.scannedBarcode || '',
  // Ensure vendor is omitted for error/mismatch cases as requested
  vendorName: status === 'error' ? '' : (AppState.selectedVendor ? AppState.selectedVendor.name : ''),
      status: status,
      qrData: AppState.qrData
    };

    AppState.scanHistory.push(entry);
    DataManager.saveHistory();
    DataManager.updateHistoryDisplay();
    DataManager.updateStatistics();
  }

  // QR Functions
  window.copyQRData = function() {
    if (!AppState.qrData) return;
    
    navigator.clipboard.writeText(AppState.qrData).then(() => {
      UIManager.showToast('QR data copied to clipboard', 'success');
    }).catch(() => {
      UIManager.showToast('Failed to copy QR data', 'error');
    });
  };

  window.showFullscreenQR = function() {
    if (!AppState.qrData) return;
    
    const modal = document.getElementById('qr-fullscreen-modal');
    const display = document.getElementById('qr-fullscreen-display');
    
    if (modal && display) {
      display.textContent = AppState.qrData;
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  };

  window.closeFullscreenQR = function() {
    const modal = document.getElementById('qr-fullscreen-modal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  };

  window.copyFullscreenQR = function() {
    const display = document.getElementById('qr-fullscreen-display');
    if (display && navigator.clipboard) {
      navigator.clipboard.writeText(display.textContent).then(() => {
        UIManager.showToast('QR data copied to clipboard', 'success');
      }).catch(() => {
        UIManager.showToast('Failed to copy QR data', 'error');
      });
    }
  };

  window.selectFullscreenQRText = function() {
    const display = document.getElementById('qr-fullscreen-display');
    if (display) {
      const range = document.createRange();
      range.selectNodeContents(display);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  // History QR Data Functions
  window.copyQRData = function(qrData) {
    if (!qrData) return;
    
    navigator.clipboard.writeText(qrData).then(() => {
      UIManager.showToast('QR data copied to clipboard', 'success');
      playBeep(true); // Success sound
    }).catch(() => {
      UIManager.showToast('Failed to copy QR data', 'error');
      playBeep(false); // Error sound
    });
  };

  window.showQRData = function(qrData) {
    if (!qrData) return;
    
    const modal = document.getElementById('qr-fullscreen-modal');
    const display = document.getElementById('qr-fullscreen-display');
    
    if (modal && display) {
      display.textContent = qrData;
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  };

  // History Functions
  window.clearHistory = function() {
    if (confirm('Are you sure you want to clear all scan history?')) {
      AppState.scanHistory = [];
      DataManager.saveHistory();
      DataManager.updateHistoryDisplay();
      DataManager.updateStatistics();
      UIManager.showToast('History cleared', 'info');
    }
  };

  window.printHistoryReport = function() {
    if (AppState.scanHistory.length === 0) {
      UIManager.showToast('No history data to print', 'warning');
      return;
    }

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    const currentDate = new Date().toLocaleString();
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>DRBS - Scan History Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .header h1 { margin: 0; color: #3b82f6; }
          .header p { margin: 5px 0; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f8f9fa; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .status-success { color: #10b981; font-weight: bold; }
          .status-error { color: #ef4444; font-weight: bold; }
          .qr-data { font-family: 'Courier New', monospace; font-size: 12px; max-width: 200px; word-break: break-all; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>DRBS - Material Management System</h1>
          <p>Scan History Report</p>
          <p>Generated on: ${currentDate}</p>
          <p>Total Records: ${AppState.scanHistory.length}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Material</th>
              <th>Barcode</th>
              <th>Vendor</th>
              <th>Status</th>
              <th>QR Code Data</th>
            </tr>
          </thead>
          <tbody>
            ${AppState.scanHistory.map(entry => `
              <tr>
                <td>${entry.timestamp}</td>
                <td>${entry.materialName}</td>
                <td>${entry.scannedBarcode}</td>
                <td>${entry.vendorName || '-'}</td>
                <td class="status-${entry.status}">${entry.status.toUpperCase()}</td>
                <td class="qr-data">${entry.qrData || 'No QR Data'}</td>
              </tr>
            `).reverse().join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>This report contains all scan history data from the DRBS Material Management System</p>
          <p>4 Roll Calender Material Processing - Production Line Control</p>
        </div>
        
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    UIManager.showToast('Print dialog opened', 'success');
  };

  window.removeHistoryEntry = function(entryId) {
    AppState.scanHistory = AppState.scanHistory.filter(entry => entry.id !== entryId);
    DataManager.saveHistory();
    DataManager.updateHistoryDisplay();
    DataManager.updateStatistics();
    UIManager.showToast('Entry removed', 'info');
  };

  // Export history as CSV
  window.exportHistoryCSV = function() {
    if (AppState.scanHistory.length === 0) {
      UIManager.showToast('No history to export', 'warning');
      return;
    }
    const headers = ['Time','Material','ExpectedBarcode','ScannedBarcode','Vendor','Status'];
    const rows = AppState.scanHistory.map(h => [
      h.timestamp,
      h.materialName,
      h.expectedBarcode,
      h.scannedBarcode,
      h.vendorName || '',
      h.status
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drbs_history_${new Date().toISOString().replace(/[:T]/g,'-').slice(0,16)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    UIManager.showToast('History exported', 'success');
  };

  // Simple beep feedback for scans
  function playBeep(success = true) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      // Success: crisp sine ping; Error: short square low beep
      osc.type = success ? 'sine' : 'square';
      osc.frequency.setValueAtTime(success ? 880 : 220, ctx.currentTime);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch (e) {
      // Ignore audio errors
    }
  }

  // Ambulance-like siren for mismatch alert
  let _siren = { ctx: null, osc: null, gain: null, timer: null };
  function startSiren() {
    try {
      if (_siren.ctx) return; // already running
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      // Start at base frequency and sweep up/down
      const base = 650; // Hz
      const peak = 1200; // Hz
      osc.frequency.setValueAtTime(base, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      // Create repeating sweep up/down to mimic siren
      const sweep = () => {
        const now = ctx.currentTime;
        osc.frequency.cancelScheduledValues(now);
        osc.frequency.setValueAtTime(base, now);
        osc.frequency.linearRampToValueAtTime(peak, now + 0.6);
        osc.frequency.linearRampToValueAtTime(base, now + 1.2);
      };
      sweep();
      const timer = setInterval(sweep, 1200);
      _siren = { ctx, osc, gain, timer };
    } catch (e) {
      // audio might be blocked; ignore
    }
  }
  function stopSiren() {
    try {
      if (_siren.timer) { clearInterval(_siren.timer); _siren.timer = null; }
      if (_siren.gain && _siren.ctx) {
        const now = _siren.ctx.currentTime;
        _siren.gain.gain.cancelScheduledValues(now);
        _siren.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      }
      if (_siren.osc && _siren.ctx) {
        const stopAt = _siren.ctx.currentTime + 0.08;
        _siren.osc.stop(stopAt);
      }
      // Close context after a short delay to allow ramp
      const ctx = _siren.ctx;
      setTimeout(() => { try { ctx && ctx.close && ctx.close(); } catch {} }, 120);
    } finally {
      _siren = { ctx: null, osc: null, gain: null, timer: null };
    }
  }

  // Populate dropdowns
  function populateDropdowns() {
    const materials = DataManager.getMaterials();
    const vendors = DataManager.getVendors();
    
    const materialSelect = document.getElementById('material-select');
    if (materialSelect) {
      materialSelect.innerHTML = '<option value="">Choose material...</option>' + 
        materials.map(m => `<option value="${m.barcode}">${m.name} (${m.barcode})</option>`).join('');
    }
    
    const vendorSelect = document.getElementById('vendor-select');
    if (vendorSelect) {
      vendorSelect.innerHTML = '<option value="">Choose vendor...</option>' + 
        vendors.map(v => `<option value="${v.id}">${v.name} (${v.code})</option>`).join('');
    }
  }

  // Session timer
  function updateSessionTime() {
    const now = new Date();
    const elapsed = Math.floor((now - AppState.sessionStartTime) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    
    const sessionTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    const sessionTimeEl = document.getElementById('session-time');
    const sidebarSessionTimeEl = document.getElementById('sidebar-session-time');
    
    if (sessionTimeEl) sessionTimeEl.textContent = sessionTime;
    if (sidebarSessionTimeEl) sidebarSessionTimeEl.textContent = sessionTime;
  }

  // Update current time
  function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    
    const timeEl = document.getElementById('current-time');
    
    if (timeEl) timeEl.textContent = timeString;
  }

  // Handle barcode input
  function handleBarcodeInput() {
    const barcodeInput = document.getElementById('barcode-input');
    if (!barcodeInput) return;

    let debounceTimer = null;
    barcodeInput.addEventListener('input', function(e) {
      const scanned = e.target.value.trim();
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (scanned.length >= 8) { // Minimum barcode length
          processBarcodeScanned(scanned);
          e.target.value = '';
        }
      }, 60);
    });

    barcodeInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        const scanned = barcodeInput.value.trim();
        if (scanned) {
          processBarcodeScanned(scanned);
          barcodeInput.value = '';
        }
      }
    });

    // Auto-focus for barcode scanner
    barcodeInput.addEventListener('blur', function() {
      if (document.getElementById('auto-scan-area').classList.contains('scanning')) {
  setTimeout(() => focusNoScroll(barcodeInput), 100);
      }
    });
  }

  function processBarcodeScanned(scannedBarcode) {
    // Check if we're in QR scanning mode (step 4)
    if (AppState.qrData && !AppState.qrScanned) {
      // This is a QR code scan
      try {
        const scannedData = JSON.parse(scannedBarcode);
        const originalData = JSON.parse(AppState.qrData);
        
        // Verify the QR data matches what we generated
        if (scannedData.material.id === originalData.material.id &&
            scannedData.vendor.id === originalData.vendor.id &&
            scannedData.session.sessionId === originalData.session.sessionId) {
          
          // QR scan successful
          AppState.qrScanned = true;
          playBeep(true);
          
          // Update QR display
          const qrDisplay = document.getElementById('qr-display');
          qrDisplay.innerHTML = `
            <div class="qr-content">
              <div class="qr-header" style="text-align: center; margin-bottom: 1rem; color: var(--success-color);">
                <i class="fas fa-check-circle" style="font-size: 1.5rem; margin-right: 0.5rem;"></i>
                <strong>QR Code Scanned Successfully!</strong>
              </div>
              <div style="text-align: center; padding: 2rem; background: var(--success-color); color: white; border-radius: 0.5rem;">
                <i class="fas fa-check-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <p><strong>Workflow Complete!</strong></p>
                <small>Data has been stored in history</small>
              </div>
            </div>
          `;
          
          UIManager.updateStepStatus(4, 'completed');
          
          // Now add to history after QR scan
          addToHistory('success');
          
          UIManager.showToast('🎉 QR code scanned successfully! Workflow complete.', 'success');
          
          // Auto-reset after 5 seconds
          setTimeout(() => {
            UIManager.resetWorkflow();
            populateDropdowns();
            UIManager.showToast('Ready for next scan', 'info');
          }, 5000);
          
          return;
        } else {
          throw new Error('QR data mismatch');
        }
      } catch (e) {
        // QR scan failed
        playBeep(false);
        UIManager.showToast('Invalid QR code. Please scan the correct QR code.', 'error');
        
        // Restore original QR display
        if (AppState.originalQRContent) {
          document.getElementById('qr-display').innerHTML = AppState.originalQRContent;
        }
        return;
      }
    }
    
    // Regular barcode scanning (step 2)
    if (!AppState.selectedMaterial) {
      UIManager.showToast('Please select a material first', 'error');
      return;
    }

    AppState.scannedBarcode = scannedBarcode;
  const autoScanArea = document.getElementById('auto-scan-area') || document.getElementById('barcode-scan-area');
  const scanInstructions = document.getElementById('scan-instructions');
    
    if (scannedBarcode === AppState.selectedMaterial.barcode) {
      playBeep(true);
      // Successful scan with enhanced animation
  autoScanArea.className = (autoScanArea.id === 'auto-scan-area') ? 'auto-scan-area success' : 'scan-area success';
      autoScanArea.innerHTML = `
        <div class="scan-result success">
          <div class="scan-result-header">
            <i class="fas fa-check-circle"></i>
            <strong>Perfect Match! ✓</strong>
          </div>
          <div class="scan-result-content">
            Material: <strong>${AppState.selectedMaterial.name}</strong><br>
            Barcode: <code>${scannedBarcode}</code><br>
            <small style="color: var(--success-color); font-weight: 600;">✓ Verification Complete</small>
          </div>
        </div>
      `;
      
      if (scanInstructions) {
        scanInstructions.style.display = 'none';
      }
      
      UIManager.updateStepStatus(2, 'completed');
      UIManager.updateStepStatus(3, 'active');
      
      // Enable vendor selection with visual feedback
  const vendorSelect = document.getElementById('vendor-select');
      vendorSelect.disabled = false;
      vendorSelect.style.borderColor = 'var(--success-color)';
      
      UIManager.showToast('✓ Barcode verified successfully! Please select vendor.', 'success');
      
      // Auto-focus on vendor selection after animation
      setTimeout(() => {
        vendorSelect.focus();
        vendorSelect.style.borderColor = '';
  }, 2000);
  const input = document.getElementById('barcode-input');
  if (input) { input.value = ''; focusNoScroll(input); }
      
    } else {
      playBeep(false);
  // Failed scan - Show enhanced custom alert
      showMismatchAlert(scannedBarcode);
    }
  }

  function showMismatchAlert(scannedBarcode) {
    const overlay = document.getElementById('alert-overlay');
    const modal = document.getElementById('alert-modal');
    const header = document.getElementById('alert-header');
    const icon = document.getElementById('alert-icon');
    const title = document.getElementById('alert-title');
    const message = document.getElementById('alert-message');
    const details = document.getElementById('alert-details');
    const expectedEl = document.getElementById('expected-barcode');
    const scannedEl = document.getElementById('scanned-barcode');
    
    // Configure alert
    header.className = 'alert-header';
    icon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
  title.textContent = 'wrong material detected';
    message.textContent = 'The scanned barcode does not match the selected material. Please verify you have the correct material or select the right material type.';
    
    // Show details
    details.style.display = 'block';
    expectedEl.textContent = AppState.selectedMaterial.barcode;
    scannedEl.textContent = scannedBarcode;
    
    // Show alert
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  // Start siren when alert opens
  startSiren();
    
    // Update scan area to error state
  const autoScanArea = document.getElementById('auto-scan-area') || document.getElementById('barcode-scan-area');
  autoScanArea.className = (autoScanArea.id === 'auto-scan-area') ? 'auto-scan-area error' : 'scan-area error';
    autoScanArea.innerHTML = `
      <div class="scan-result error">
        <div class="scan-result-header">
          <i class="fas fa-times-circle"></i>
          <strong>Material Mismatch!</strong>
        </div>
        <div class="scan-result-content">
          Wrong barcode detected.<br>
          Click "Reset & Continue" to try again.
        </div>
      </div>
    `;
    
    UIManager.updateStepStatus(2, 'error');
  }

  // Alert Functions
  window.closeAlert = function() {
    const overlay = document.getElementById('alert-overlay');
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  // Stop siren on close
  stopSiren();
  };

  window.resetAndRecord = function() {
    // Add failed scan to history
    addToHistory('error');
    
    // Close alert
    closeAlert();
    
    // Show success message
    UIManager.showToast('Scan recorded in history. Ready for next scan.', 'info');
    
    // Reset workflow
    setTimeout(() => {
      UIManager.resetWorkflow();
      populateDropdowns();
    }, 1500);
  };

  // Initialize application
  document.addEventListener('DOMContentLoaded', async function() {
    // Initialize system with loading screen
    await SystemInitializer.initialize();
    
    // Initialize UI
    populateDropdowns();
    DataManager.loadHistory();
    DataManager.updateStatistics(); // Update dashboard metrics
    UIManager.resetWorkflow();
    
    // Setup event handlers
    handleBarcodeInput();
    
    // Start timers
    setInterval(updateCurrentTime, 1000);
    setInterval(updateSessionTime, 1000);
    
    // Initial time update
    updateCurrentTime();
    updateSessionTime();
    
    // Close modal on escape or outside click
    const modal = document.getElementById('qr-fullscreen-modal');
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal || e.target.classList.contains('qr-fullscreen-overlay')) {
          closeFullscreenQR();
        }
      });
      
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.style.display !== 'none') {
          closeFullscreenQR();
        }
      });
    }
    
    UIManager.showToast('DRBS Material Management System ready', 'info');
  });

  // =============================================================================
  // ADMIN PANEL FUNCTIONALITY
  // =============================================================================
  
  // Admin Panel Management
  window.openAdminPanel = function() {
    // Admin password protection
    const adminPassword = "admin123"; // You can change this password
    const enteredPassword = prompt("Enter Admin Password:");
    
    if (enteredPassword === null) {
      // User cancelled the prompt
      return;
    }
    
    if (enteredPassword !== adminPassword) {
      // Wrong password
      showToast("Access Denied: Invalid password", "error");
      playBeep(false); // Error sound
      return;
    }
    
    // Correct password - open admin panel
    const modal = document.getElementById('admin-modal');
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      loadAdminData();
      updateTabBadges();
      showToast("Admin panel opened successfully", "success");
      playBeep(true); // Success sound
    }
  };

  window.closeAdminPanel = function() {
    const modal = document.getElementById('admin-modal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
      hideAllForms();
    }
  };

  window.showAdminSection = function(section) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(s => {
      s.style.display = 'none';
      s.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.admin-tab').forEach(t => {
      t.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(`admin-${section}`);
    const targetTab = document.querySelector(`[onclick="showAdminSection('${section}')"]`);
    
    if (targetSection) {
      targetSection.style.display = 'block';
      targetSection.classList.add('active');
    }
    
    if (targetTab) {
      targetTab.classList.add('active');
    }
    
    hideAllForms();
    
    // Load section-specific data
    if (section === 'materials') {
      loadMaterialsTable();
    } else if (section === 'vendors') {
      loadVendorsTable();
    } else if (section === 'settings') {
      updateAdminInfo();
    }
  };

  function updateTabBadges() {
    const materials = DataManager.getMaterials();
    const vendors = DataManager.getVendors();
    
    const materialsBadge = document.getElementById('materials-count-badge');
    const vendorsBadge = document.getElementById('vendors-count-badge');
    
    if (materialsBadge) materialsBadge.textContent = materials.length;
    if (vendorsBadge) vendorsBadge.textContent = vendors.length;
  }

  // Enhanced Materials Management
  window.generateBarcode = function() {
    const barcodeInput = document.getElementById('material-barcode-input');
    if (barcodeInput) {
      const timestamp = Date.now().toString();
      const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const barcode = timestamp.slice(-8) + randomPart;
      barcodeInput.value = barcode;
      UIManager.showToast('Barcode generated', 'success');
    }
  };

  window.filterMaterials = function() {
    const searchTerm = document.getElementById('materials-search').value.toLowerCase();
    const tableRows = document.querySelectorAll('#materials-table-body tr');
    
    tableRows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
  };

  // Enhanced Vendors Management  
  window.filterVendors = function() {
    const searchTerm = document.getElementById('vendors-search').value.toLowerCase();
    const tableRows = document.querySelectorAll('#vendors-table-body tr');
    
    tableRows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
  };

  function hideAllForms() {
    const forms = document.querySelectorAll('.add-form');
    forms.forEach(form => form.style.display = 'none');
  }

  function loadAdminData() {
    loadMaterialsTable();
    updateAdminInfo();
  }

  // Materials Management
  window.showAddMaterialForm = function() {
    const form = document.getElementById('add-material-form');
    if (form) {
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
      if (form.style.display === 'block') {
        document.getElementById('material-name-input').focus();
      }
    }
  };

  window.hideAddMaterialForm = function() {
    const form = document.getElementById('add-material-form');
    if (form) {
      form.style.display = 'none';
      clearMaterialForm();
    }
  };

  window.addMaterial = function() {
    const nameInput = document.getElementById('material-name-input');
    const barcodeInput = document.getElementById('material-barcode-input');
    
    const name = nameInput.value.trim();
    const barcode = barcodeInput.value.trim();
    
    if (!name || !barcode) {
      UIManager.showToast('Please fill in all fields', 'error');
      return;
    }
    
    const materials = DataManager.getMaterials();
    
    // Check if barcode already exists
    if (materials.some(m => m.barcode === barcode)) {
      UIManager.showToast('Barcode already exists', 'error');
      return;
    }
    
    // Generate new ID
    const newId = `MAT${String(materials.length + 1).padStart(3, '0')}`;
    
    // Add new material
    const newMaterial = {
      id: newId,
      name: name,
      barcode: barcode
    };
    
    materials.push(newMaterial);
    
    // Save to localStorage
    try {
      localStorage.setItem('drbs_materials', JSON.stringify(materials));
      UIManager.showToast('Material added successfully', 'success');
      loadMaterialsTable();
      populateDropdowns();
      clearMaterialForm();
      hideAddMaterialForm();
      updateAdminInfo();
    } catch (e) {
      UIManager.showToast('Failed to save material', 'error');
    }
  };

  window.deleteMaterial = function(materialId) {
    if (!confirm('Are you sure you want to delete this material?')) return;
    
    const materials = DataManager.getMaterials();
    const filteredMaterials = materials.filter(m => m.id !== materialId);
    
    try {
      localStorage.setItem('drbs_materials', JSON.stringify(filteredMaterials));
      UIManager.showToast('Material deleted successfully', 'success');
      loadMaterialsTable();
      populateDropdowns();
      updateAdminInfo();
    } catch (e) {
      UIManager.showToast('Failed to delete material', 'error');
    }
  };

  function clearMaterialForm() {
    document.getElementById('material-name-input').value = '';
    document.getElementById('material-barcode-input').value = '';
  }

  function loadMaterialsTable() {
    const tbody = document.getElementById('materials-table-body');
    if (!tbody) return;
    
    const materials = DataManager.getMaterials();
    
    if (materials.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--gray-500);">No materials found</td></tr>';
      return;
    }
    
    tbody.innerHTML = materials.map(material => `
      <tr>
        <td>${material.id}</td>
        <td>${material.name}</td>
        <td><code>${material.barcode}</code></td>
        <td>
          <button class="delete-btn" onclick="deleteMaterial('${material.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }

  // Vendors Management
  window.showAddVendorForm = function() {
    const form = document.getElementById('add-vendor-form');
    if (form) {
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
      if (form.style.display === 'block') {
        document.getElementById('vendor-name-input').focus();
      }
    }
  };

  window.hideAddVendorForm = function() {
    const form = document.getElementById('add-vendor-form');
    if (form) {
      form.style.display = 'none';
      clearVendorForm();
    }
  };

  window.addVendor = function() {
    const nameInput = document.getElementById('vendor-name-input');
    const codeInput = document.getElementById('vendor-code-input');
    const emailInput = document.getElementById('vendor-email-input');
    const phoneInput = document.getElementById('vendor-phone-input');
    const addressInput = document.getElementById('vendor-address-input');
    
    const name = nameInput.value.trim();
    const code = codeInput.value.trim();
    const email = emailInput ? emailInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const address = addressInput ? addressInput.value.trim() : '';
    
    if (!name || !code) {
      UIManager.showToast('Please fill in name and code fields', 'error');
      return;
    }
    
    const vendors = DataManager.getVendors();
    
    // Check if code already exists
    if (vendors.some(v => v.code === code)) {
      UIManager.showToast('Vendor code already exists', 'error');
      return;
    }
    
    // Generate new ID
    const newId = `VEN${String(vendors.length + 1).padStart(3, '0')}`;
    
    // Add new vendor
    const newVendor = {
      id: newId,
      code: code,
      name: name,
      email: email,
      phone: phone,
      address: address
    };
    
    vendors.push(newVendor);
    
    // Save to localStorage
    try {
      localStorage.setItem('drbs_vendors', JSON.stringify(vendors));
      UIManager.showToast('Vendor added successfully', 'success');
      loadVendorsTable();
      populateDropdowns();
      clearVendorForm();
      hideAddVendorForm();
      updateAdminInfo();
      updateTabBadges();
    } catch (e) {
      UIManager.showToast('Failed to save vendor', 'error');
    }
  };

  window.deleteVendor = function(vendorId) {
    if (!confirm('Are you sure you want to delete this vendor?')) return;
    
    const vendors = DataManager.getVendors();
    const filteredVendors = vendors.filter(v => v.id !== vendorId);
    
    try {
      localStorage.setItem('drbs_vendors', JSON.stringify(filteredVendors));
      UIManager.showToast('Vendor deleted successfully', 'success');
      loadVendorsTable();
      populateDropdowns();
      updateAdminInfo();
    } catch (e) {
      UIManager.showToast('Failed to delete vendor', 'error');
    }
  };

  function clearVendorForm() {
    document.getElementById('vendor-name-input').value = '';
    document.getElementById('vendor-code-input').value = '';
    const emailInput = document.getElementById('vendor-email-input');
    const phoneInput = document.getElementById('vendor-phone-input');
    const addressInput = document.getElementById('vendor-address-input');
    
    if (emailInput) emailInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (addressInput) addressInput.value = '';
  }

  function loadVendorsTable() {
    const tbody = document.getElementById('vendors-table-body');
    if (!tbody) return;
    
    const vendors = DataManager.getVendors();
    
    if (vendors.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--gray-500);">No vendors found</td></tr>';
      return;
    }
    
    tbody.innerHTML = vendors.map(vendor => `
      <tr>
        <td>${vendor.id}</td>
        <td>${vendor.name}</td>
        <td><code>${vendor.code}</code></td>
        <td>
          ${vendor.email ? `<div><i class="fas fa-envelope"></i> ${vendor.email}</div>` : ''}
          ${vendor.phone ? `<div><i class="fas fa-phone"></i> ${vendor.phone}</div>` : ''}
          ${!vendor.email && !vendor.phone ? '<span style="color: var(--gray-400);">No contact info</span>' : ''}
        </td>
        <td>
          <button class="delete-btn" onclick="deleteVendor('${vendor.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }

  // Settings Management
  window.clearAllHistory = function() {
    if (!confirm('Are you sure you want to clear ALL scan history? This cannot be undone.')) return;
    
    try {
      localStorage.removeItem('drbs_history');
      AppState.scanHistory = [];
      DataManager.updateHistoryDisplay();
      DataManager.updateStatistics();
      UIManager.showToast('All history cleared successfully', 'success');
      updateAdminInfo();
    } catch (e) {
      UIManager.showToast('Failed to clear history', 'error');
    }
  };

  window.exportAllData = function() {
    const materials = DataManager.getMaterials();
    const vendors = DataManager.getVendors();
    const history = AppState.scanHistory;
    
    const exportData = {
      timestamp: new Date().toISOString(),
      materials: materials,
      vendors: vendors,
      history: history,
      statistics: AppState.statistics
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `drbs_export_${new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    UIManager.showToast('Data exported successfully', 'success');
  };

  window.exportToExcel = function() {
    const history = AppState.scanHistory;
    
    if (!history || history.length === 0) {
      UIManager.showToast('No history data to export', 'warning');
      return;
    }
    
    // Create Excel-compatible CSV data with BOM for proper UTF-8 encoding
    let csvContent = 'Timestamp,Material,Barcode,Vendor,QR Data,Status\n';
    
    history.forEach(entry => {
      const row = [
        entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '',
        entry.material ? entry.material.replace(/"/g, '""') : '',
        entry.barcode || '',
        entry.vendor ? entry.vendor.replace(/"/g, '""') : '',
        entry.qrData ? `"${entry.qrData.replace(/"/g, '""')}"` : '',
        entry.status || 'success'
      ].join(',');
      csvContent += row + '\n';
    });
    
    // Add BOM for proper UTF-8 encoding in Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `DRBS_History_${new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    UIManager.showToast('History exported to Excel successfully', 'success');
  };

  window.resetToDefaults = function() {
    if (!confirm('Are you sure you want to reset all materials and vendors to defaults? This will remove all custom data.')) return;
    
    try {
      localStorage.removeItem('drbs_materials');
      localStorage.removeItem('drbs_vendors');
      
      UIManager.showToast('Reset to defaults successfully', 'success');
      loadMaterialsTable();
      loadVendorsTable();
      populateDropdowns();
      updateAdminInfo();
    } catch (e) {
      UIManager.showToast('Failed to reset to defaults', 'error');
    }
  };

  function updateAdminInfo() {
    const materials = DataManager.getMaterials();
    const vendors = DataManager.getVendors();
    const totalScans = AppState.statistics.successfulScans + AppState.statistics.failedScans;
    
    const materialsCountEl = document.getElementById('admin-materials-count');
    const vendorsCountEl = document.getElementById('admin-vendors-count');
    const totalScansEl = document.getElementById('admin-total-scans');
    const uptimeEl = document.getElementById('admin-uptime');
    
    if (materialsCountEl) materialsCountEl.textContent = materials.length;
    if (vendorsCountEl) vendorsCountEl.textContent = vendors.length;
    if (totalScansEl) totalScansEl.textContent = totalScans;
    
    if (uptimeEl) {
      const now = new Date();
      const elapsed = Math.floor((now - AppState.sessionStartTime) / 1000);
      const hours = Math.floor(elapsed / 3600);
      const minutes = Math.floor((elapsed % 3600) / 60);
      const seconds = elapsed % 60;
      uptimeEl.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  // Close admin panel on escape key or outside click
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const adminModal = document.getElementById('admin-modal');
      if (adminModal && adminModal.style.display === 'flex') {
        closeAdminPanel();
      }
    }
  });

  document.addEventListener('click', function(e) {
    const adminModal = document.getElementById('admin-modal');
    const adminOverlay = document.querySelector('.admin-overlay');
    if (adminModal && adminOverlay && e.target === adminOverlay) {
      closeAdminPanel();
    }
  });

})();
