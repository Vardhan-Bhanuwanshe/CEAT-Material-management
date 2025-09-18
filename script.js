  // Password Change Modal Functions
  window.showPasswordChangeModal = function() {
    const modal = document.getElementById('password-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    const currentPassword = document.getElementById('current-password');
    const newPassword = document.getElementById('new-password');
    const confirmPassword = document.getElementById('confirm-password');
    if (currentPassword) currentPassword.value = '';
    if (newPassword) newPassword.value = '';
    if (confirmPassword) confirmPassword.value = '';

    const strength = document.getElementById('password-strength');
    const updateStrength = () => updatePasswordStrength(newPassword.value, strength);
    if (newPassword) {
      newPassword.removeEventListener('input', updateStrength);
      newPassword.addEventListener('input', updateStrength);
      updateStrength();
    }

    const keyHandler = (e) => {
      if (e.key === 'Enter') changePassword();
      if (e.key === 'Escape') closePasswordModal();
    };
    window._pwKeyHandler = keyHandler;
    document.addEventListener('keydown', keyHandler);
  };

  window.closePasswordModal = function() {
    const modal = document.getElementById('password-modal');
    if (modal) modal.style.display = 'none';
    if (window._pwKeyHandler) {
      document.removeEventListener('keydown', window._pwKeyHandler);
      window._pwKeyHandler = null;
    }
  };

  window.changePassword = function() {
    const currentPassword = (document.getElementById('current-password')||{}).value || '';
    const newPassword = (document.getElementById('new-password')||{}).value || '';
    const confirmPassword = (document.getElementById('confirm-password')||{}).value || '';
    if (!currentPassword) return UIManager.showToast('Please enter your current password', 'error');
    if (!newPassword || newPassword.length < 6) return UIManager.showToast('New password must be at least 6 characters', 'error');
    if (newPassword !== confirmPassword) return UIManager.showToast('New passwords do not match', 'error');
    const storedPassword = localStorage.getItem('drbs_admin_password') || 'admin123';
    if (currentPassword !== storedPassword) return UIManager.showToast('Current password is incorrect', 'error');
    localStorage.setItem('drbs_admin_password', newPassword);
    closePasswordModal();
    UIManager.showToast('Password changed successfully', 'success');
  };

  function updatePasswordStrength(pw, container) {
    if (!container) return;
    const bar = container.querySelector('.strength-bar');
    const text = container.querySelector('.strength-text');
    let score = 0;
    if (pw.length >= 6) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const perc = [0, 25, 50, 75, 100][score];
    const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['#ef4444', '#f59e0b', '#f59e0b', '#10b981', '#059669'];
    if (bar) { bar.style.height='6px'; bar.style.borderRadius='4px'; bar.style.background=colors[score]; bar.style.width=perc+'%'; bar.style.transition='width 0.2s ease'; }
    if (text) text.textContent = 'Password strength: ' + labels[score];
  }

  // Admin System Management Functions
  window.updateSystemStats = function() {
    // This function is kept for compatibility
    
    const totalRecords = AppState.scanHistory ? AppState.scanHistory.length : 0;
    const successRecords = AppState.scanHistory ? AppState.scanHistory.filter(entry => entry.status === 'success').length : 0;
    const errorRecords = totalRecords - successRecords;

    // Update any remaining stat elements if they exist (backwards compatibility)
    const totalEl = document.getElementById('admin-total-records');
    const successEl = document.getElementById('admin-success-records');
    const errorEl = document.getElementById('admin-error-records');

    if (totalEl) totalEl.textContent = totalRecords;
    if (successEl) successEl.textContent = successRecords;
    if (errorEl) errorEl.textContent = errorRecords;
    
    // Log stats for debugging
    console.log(`System Stats - Total: ${totalRecords}, Success: ${successRecords}, Errors: ${errorRecords}`);
  };

  // Clear All History Function
  window.clearAllHistory = function() {
    const totalRecords = AppState.scanHistory ? AppState.scanHistory.length : 0;
    
    if (totalRecords === 0) {
      UIManager.showToast('No history data to clear', 'info');
      return;
    }
    
    const confirmed = confirm(`Are you sure you want to clear all scan history?\n\nThis will permanently delete ${totalRecords} records and cannot be undone.`);
    
    if (confirmed) {
      try {
        // Clear all history and scan data
        AppState.scanHistory = [];
        AppState.scannedBarcode = null;
        AppState.vendorQRData = null;
        AppState.qrData = null;
        
        // Clear local storage
        localStorage.removeItem('drbs_history');
        localStorage.removeItem('drbs_scan_stats');
        localStorage.removeItem('drbs_vendor_qr_data');
        localStorage.removeItem('drbs_last_scan');
        
        // Reset statistics
        AppState.statistics = { successfulScans: 0, failedScans: 0, accuracy: 100 };
        
        // Clear any displayed barcode/QR data
        const materialBarcodeDisplay = document.getElementById('material-barcode');
        if (materialBarcodeDisplay) {
          materialBarcodeDisplay.innerHTML = '';
        }
        
        // Update displays
        DataManager.saveHistory();
        DataManager.updateHistoryDisplay();
        DataManager.updateStatistics();
        DataManager.updateStatisticsDisplay();
        
        // Update admin stats
        updateSystemStats();
        
        UIManager.showToast(`All scan history cleared (${totalRecords} records deleted)`, 'success');
        
      } catch (e) {
        console.error('Error clearing history:', e);
        UIManager.showToast('Failed to clear history', 'error');
      }
    }
  };

  // Improve System Function - Optimizes performance and cleans up data
  window.improveSystem = async function() {
    try {
      // Show initial progress message
      if (typeof UIManager !== 'undefined' && UIManager.showToast) {
        UIManager.showToast('Starting system optimization...', 'info');
      }

      // 1. Consolidate and clean history data
      const rawHistory = localStorage.getItem('drbs_history');
      const rawScanHistory = localStorage.getItem('drbs_scan_history');
      let allHistory = [];

      // Merge data from both storage keys
      if (rawHistory) {
        try {
          const historyData = JSON.parse(rawHistory);
          if (Array.isArray(historyData)) allHistory.push(...historyData);
        } catch (e) {
          console.warn('Failed to parse drbs_history:', e);
        }
      }

      if (rawScanHistory) {
        try {
          const scanHistoryData = JSON.parse(rawScanHistory);
          if (Array.isArray(scanHistoryData)) allHistory.push(...scanHistoryData);
        } catch (e) {
          console.warn('Failed to parse drbs_scan_history:', e);
        }
      }

      // Remove duplicates and invalid entries
      const seen = new Set();
      const cleanHistory = allHistory.filter(entry => {
        if (!entry || !entry.id) return false;
        if (seen.has(entry.id)) return false;
        seen.add(entry.id);
        
        // Clean up string fields
        if (typeof entry.qrData === 'string') entry.qrData = entry.qrData.trim();
        if (typeof entry.materialName === 'string') entry.materialName = entry.materialName.trim();
        if (typeof entry.vendorName === 'string') entry.vendorName = entry.vendorName.trim();
        if (typeof entry.scannedBarcode === 'string') entry.scannedBarcode = entry.scannedBarcode.trim();
        
        // Ensure required fields
        if (!entry.status) entry.status = 'success';
        if (entry.qrData && !entry.qrDataLength) entry.qrDataLength = entry.qrData.length;
        
        return true;
      });

      // Update AppState and localStorage
      if (typeof AppState !== 'undefined') {
        AppState.scanHistory = cleanHistory;
      }
      localStorage.setItem('drbs_history', JSON.stringify(cleanHistory));
      localStorage.setItem('drbs_scan_history', JSON.stringify(cleanHistory));

      // 2. Clean up old/unused localStorage keys
      const obsoleteKeys = [
        'drbs_temp_data',
        'drbs_cache',
        'drbs_old_history',
        'drbs_backup',
        'drbs_workflow_temp',
        'drbs_notification_temp'
      ];
      
      let removedKeysCount = 0;
      obsoleteKeys.forEach(key => {
        try {
          if (localStorage.getItem(key) !== null) {
            localStorage.removeItem(key);
            removedKeysCount++;
          }
        } catch (e) {
          console.warn(`Failed to remove ${key}:`, e);
        }
      });

      // 3. Refresh UI components
      if (typeof DataManager !== 'undefined') {
        DataManager.updateStatistics && DataManager.updateStatistics();
        DataManager.updateStatisticsDisplay && DataManager.updateStatisticsDisplay();
        DataManager.updateHistoryDisplay && DataManager.updateHistoryDisplay();
      }

      // Update admin stats
      updateSystemStats && updateSystemStats();

      // 4. Force UI refresh of critical elements
      const criticalElements = [
        'history-body',
        'total-scans',
        'successful-scans-metric',
        'error-scans-metric',
        'accuracy-metric',
        'admin-total-records',
        'admin-success-records',
        'admin-error-records'
      ];
      
      criticalElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
          element.style.transform = 'scale(1.01)';
          element.offsetHeight; // Force reflow
          element.style.transform = '';
        }
      });

      // Show completion message
      if (typeof UIManager !== 'undefined' && UIManager.showToast) {
        UIManager.showToast('System optimization completed successfully!', 'success');
      }
      
      // Create a visual indicator in the system section
      const systemSection = document.getElementById('admin-system');
      if (systemSection) {
        const optimizationResult = document.createElement('div');
        optimizationResult.className = 'optimization-result';
        optimizationResult.innerHTML = `
          <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 12px; margin-top: 1rem;">
            <div style="display: flex; align-items: center; gap: 8px; color: #059669; font-weight: 500;">
              <i class="fas fa-check-circle"></i>
              System Optimization Complete
            </div>
            <div style="margin-top: 8px; font-size: 0.9rem; color: #047857;">
              <div>✓ Cleaned ${allHistory.length - cleanHistory.length} duplicate/invalid entries</div>
              <div>✓ Final history count: ${cleanHistory.length} records</div>
              <div>✓ Removed ${removedKeysCount} obsolete storage keys</div>
              <div>✓ Refreshed UI components</div>
            </div>
          </div>
        `;
        
        // Remove any existing optimization results
        const existingResult = systemSection.querySelector('.optimization-result');
        if (existingResult) {
          existingResult.remove();
        }
        
        systemSection.appendChild(optimizationResult);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
          if (optimizationResult && optimizationResult.parentNode) {
            optimizationResult.style.opacity = '0';
            optimizationResult.style.transform = 'translateY(-10px)';
            setTimeout(() => {
              optimizationResult.remove();
            }, 300);
          }
        }, 10000);
      }
      
      // Log optimization results
      console.log(`System optimization completed:
        - Cleaned ${allHistory.length - cleanHistory.length} duplicate/invalid entries
        - Final history count: ${cleanHistory.length}
        - Removed ${removedKeysCount} obsolete storage keys
        - Refreshed UI components`);

    } catch (error) {
      console.error('System optimization failed:', error);
      if (typeof UIManager !== 'undefined' && UIManager.showToast) {
        UIManager.showToast('System optimization failed. Please try again.', 'error');
      }
    }
  };

  // Global material step status function
  window.updateMaterialStepStatus = function(step, status) {
    const stepEl = document.getElementById(`material-step-${step}`);
    const statusEl = document.getElementById(`material-step-${step}-status`);
    
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
  };

  // Global vendor step status function
  window.updateVendorStepStatus = function(step, status) {
    const stepEl = document.getElementById(`vendor-step-${step}`);
    const statusEl = document.getElementById(`vendor-step-${step}-status`);
    
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
  };

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

  // Utility: sanitize scanner input (remove control characters and trim)
  function sanitizeScan(code) {
    return (code || '').replace(/[\r\n\t]/g, '').trim();
  }

  // Application State
  const AppState = {
    currentStep: 1,
    selectedMaterial: null,
    scannedBarcode: null,
    selectedVendor: null,
    selectedLetoff: null,
    qrData: null,
    qrScanned: false,
    vendorQRWaiting: false,
    sessionStartTime: new Date(),
    scanHistory: [],
    lastVendorId: localStorage.getItem('drbs_last_vendor') || null,
    // Prevent re-entrant scans from fast scanners
    isScanLocked: false,
    // History filtering and sorting
    historySortColumn: null,
    historySortDirection: 'desc',
    historyPagination: {
      enabled: true,
      currentPage: 1,
      itemsPerPage: 10
    },
    statistics: {
      successfulScans: 0,
      failedScans: 0,
      accuracy: 100
    },
    // 4-Step Workflow Tracker
    workflowState: {
      step1_materialSelected: false,
      step2_barcodeScanned: false,
      step3_vendorSelected: false,
      step4_qrScanned: false,
      workflowData: {
        materialName: '',
        materialBarcode: '',
        scannedBarcode: '',
        vendorName: '',
        vendorCode: '',
        qrData: '',
        startTime: null,
        endTime: null
      }
    }
  };

  // Workflow Management Functions
  const WorkflowManager = {
    // Reset the entire workflow
    resetWorkflow() {
      AppState.workflowState = {
        step1_materialSelected: false,
        step2_barcodeScanned: false,
        step3_vendorSelected: false,
        step4_qrScanned: false,
        workflowData: {
          materialName: '',
          materialBarcode: '',
          scannedBarcode: '',
          vendorName: '',
          vendorCode: '',
          qrData: '',
          startTime: null,
          endTime: null
        }
      };
    },

    // Step 1: Material Selection
    setMaterialSelected(material) {
      AppState.workflowState.step1_materialSelected = true;
      AppState.workflowState.workflowData.materialName = material.name;
      AppState.workflowState.workflowData.materialBarcode = material.barcode;
      AppState.workflowState.workflowData.startTime = new Date().toISOString();
      
      console.log('Workflow Step 1: Material Selected -', material.name);
      this.checkWorkflowProgress();
    },

    // Step 2: Barcode Scanned
    setBarcodeScanned(scannedBarcode, isMatch) {
      if (!AppState.workflowState.step1_materialSelected) {
        console.log('Cannot proceed to step 2: Material not selected');
        return false;
      }
      
      AppState.workflowState.step2_barcodeScanned = true;
      AppState.workflowState.workflowData.scannedBarcode = scannedBarcode;
      
      console.log('Workflow Step 2: Barcode Scanned -', scannedBarcode, isMatch ? '(Match)' : '(Mismatch)');
      this.checkWorkflowProgress();
      return true;
    },

    // Step 3: Vendor Selection
    setVendorSelected(vendor) {
      if (!AppState.workflowState.step2_barcodeScanned) {
        console.log('Cannot proceed to step 3: Barcode not scanned');
        return false;
      }
      
      AppState.workflowState.step3_vendorSelected = true;
      AppState.workflowState.workflowData.vendorName = vendor.name;
      AppState.workflowState.workflowData.vendorCode = vendor.code;
      
      console.log('Workflow Step 3: Vendor Selected -', vendor.name);
      this.checkWorkflowProgress();
      return true;
    },

    // Step 4: QR Code Scanned
    setQRScanned(qrData) {
      if (!AppState.workflowState.step3_vendorSelected) {
        console.log('Cannot proceed to step 4: Vendor not selected');
        return false;
      }
      
      AppState.workflowState.step4_qrScanned = true;
      AppState.workflowState.workflowData.qrData = qrData;
      AppState.workflowState.workflowData.endTime = new Date().toISOString();
      
      console.log('Workflow Step 4: QR Scanned -', qrData.substring(0, 50) + '...');
      this.checkWorkflowProgress();
      
      // If all steps are complete, store in history
      if (this.isWorkflowComplete()) {
        this.storeCompleteWorkflow();
      }
      return true;
    },

    // Check if all 4 steps are complete
    isWorkflowComplete() {
      const state = AppState.workflowState;
      return state.step1_materialSelected && 
             state.step2_barcodeScanned && 
             state.step3_vendorSelected && 
             state.step4_qrScanned;
    },

    // Get current workflow progress
    getWorkflowProgress() {
      const state = AppState.workflowState;
      let completedSteps = 0;
      if (state.step1_materialSelected) completedSteps++;
      if (state.step2_barcodeScanned) completedSteps++;
      if (state.step3_vendorSelected) completedSteps++;
      if (state.step4_qrScanned) completedSteps++;
      
      return {
        completed: completedSteps,
        total: 4,
        percentage: (completedSteps / 4) * 100,
        isComplete: completedSteps === 4
      };
    },

    // Check and display workflow progress
    checkWorkflowProgress() {
      const progress = this.getWorkflowProgress();
      console.log(`Workflow Progress: ${progress.completed}/4 steps completed (${progress.percentage}%)`);
      
      // Update UI if needed
      this.updateWorkflowUI(progress);
    },

    // Update UI to show workflow progress
    updateWorkflowUI(progress) {
      // You can add UI updates here if needed
      // For now, just log the progress
      if (progress.isComplete) {
        console.log('🎉 All 4 workflow steps completed! Ready to store in history.');
      }
    },

    // Store complete workflow in history
    storeCompleteWorkflow() {
      const data = AppState.workflowState.workflowData;
      const entry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        // LETOFF Selection
        letoff: AppState.selectedLetoff || 'N/A',
        // Step 1 & 2: Material and Barcode
        materialName: data.materialName,
        expectedBarcode: data.materialBarcode,
        scannedBarcode: data.scannedBarcode,
        // Step 3 & 4: Vendor and QR
        vendorName: data.vendorName,
        vendorCode: data.vendorCode,
        qrData: data.qrData,
        qrDataLength: data.qrData.length,
        // Workflow metadata
        status: 'success',
        workflowStartTime: data.startTime,
        workflowEndTime: data.endTime,
        workflowDuration: this.calculateDuration(data.startTime, data.endTime),
        isCompleteWorkflow: true
      };

      // Add to history
      AppState.scanHistory.push(entry);
      
      // Update UI
      updateHistoryDisplay();
      updateSystemStats();
      
      // Show success message
      UIManager.showToast('✅ Complete workflow recorded in history!', 'success');
      
      // Auto-save to localStorage
      try {
        localStorage.setItem('drbs_scan_history', JSON.stringify(AppState.scanHistory));
        localStorage.setItem('drbs_workflow_data', JSON.stringify(entry));
      } catch (e) {
        console.warn('Failed to save workflow data:', e);
      }
      
      console.log('✅ Complete workflow stored in history:', entry);
      
      // Reset workflow for next cycle
      this.resetWorkflow();
    },

    // Calculate workflow duration
    calculateDuration(startTime, endTime) {
      if (!startTime || !endTime) return 'Unknown';
      
      const start = new Date(startTime);
      const end = new Date(endTime);
      const diff = end - start;
      
      const seconds = Math.round(diff / 1000);
      if (seconds < 60) return `${seconds}s`;
      
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
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

      // Update history count display
      const historyCountDisplay = document.getElementById('history-count-display');
      if (historyCountDisplay) {
        historyCountDisplay.textContent = `${AppState.scanHistory.length} records`;
      }

      // Update history stats
      this.updateHistoryStats();

      if (AppState.scanHistory.length === 0) {
        tbody.innerHTML = `
          <tr class="empty-state">
            <td colspan="7">
              <div class="empty-message">
                <i class="fas fa-inbox"></i>
                <p>No scans yet</p>
                <small>Start scanning to see history records here</small>
              </div>
            </td>
          </tr>
        `;
        return;
      }

      // Apply current filters and sorting
      let filteredHistory = this.getFilteredHistory();
      
      // Apply pagination
      const paginatedHistory = this.getPaginatedHistory(filteredHistory);

      if (paginatedHistory.length === 0) {
        tbody.innerHTML = `
          <tr class="empty-state">
            <td colspan="7">
              <div class="empty-message">
                <i class="fas fa-search"></i>
                <p>No matching records</p>
                <small>Try adjusting your search or filter criteria</small>
              </div>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = paginatedHistory.map(entry => `
        <tr class="history-row ${entry.status}" data-entry-id="${entry.id}">
          <td class="timestamp-cell">
            <div class="timestamp-content">
              <span class="date">${this.formatDate(entry.timestamp)}</span>
              <span class="time">${this.formatTime(entry.timestamp)}</span>
            </div>
          </td>
          <td class="letoff-cell">
            <span class="letoff-value">${entry.letoff || 'N/A'}</span>
          </td>
          <td class="material-cell">
            <div class="material-info">
              <strong>${entry.materialName}</strong>
              <small>Expected: ${entry.expectedBarcode}</small>
            </div>
          </td>
          <td class="barcode-cell">
            <code class="barcode-value">${entry.scannedBarcode}</code>
            <button class="copy-btn" onclick="copyToClipboard('${entry.scannedBarcode}')" title="Copy barcode">
              <i class="fas fa-copy"></i>
            </button>
          </td>
          <td class="vendor-cell">
            <span class="vendor-name">${entry.vendorName || '-'}</span>
          </td>
          <td class="qr-cell">
            ${entry.qrData ? `
              <div class="qr-data-cell">
                <div class="qr-preview">
                  <code class="qr-data-preview" title="${entry.qrData}">
                    ${entry.qrData.length > 20 ? entry.qrData.substring(0, 20) + '...' : entry.qrData}
                  </code>
                  <div class="qr-meta">
                    <span class="qr-length">${entry.qrData.length} chars</span>
                    <span class="qr-type">${entry.qrData.match(/^[0-9]+$/) ? 'Numeric' : entry.qrData.match(/^[a-zA-Z]+$/) ? 'Alpha' : 'Alphanumeric'}</span>
                  </div>
                </div>
                <div class="qr-actions">
                  <button class="qr-btn copy" onclick="copyQRData(\`${entry.qrData.replace(/`/g, '\\`')}\`)" title="Copy QR Data">
                    <i class="fas fa-copy"></i>
                  </button>
                  <button class="qr-btn view" onclick="showQRData(\`${entry.qrData.replace(/`/g, '\\`')}\`)" title="View Full QR Data">
                    <i class="fas fa-eye"></i>
                  </button>
                </div>
              </div>
            ` : '<span class="no-qr">No QR Data</span>'}
          </td>
          <td class="status-cell">
            <span class="status-badge ${entry.status}">
              <i class="fas fa-${entry.status === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
              ${entry.status.toUpperCase()}
            </span>
          </td>
        </tr>
      `).join('');

      // Update pagination
      this.updatePagination(filteredHistory.length);
    },

    updateHistoryStats() {
      const totalCount = AppState.scanHistory.length;
      const successCount = AppState.scanHistory.filter(entry => entry.status === 'success').length;
      const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 100;
      
      const filteredHistory = this.getFilteredHistory();
      
      const totalHistoryCount = document.getElementById('total-history-count');
      const successRateEl = document.getElementById('success-rate');
      const filteredCount = document.getElementById('filtered-count');
      
      if (totalHistoryCount) totalHistoryCount.textContent = totalCount;
      if (successRateEl) successRateEl.textContent = `${successRate}%`;
      if (filteredCount) filteredCount.textContent = filteredHistory.length;
    },

    getFilteredHistory() {
      let filtered = [...AppState.scanHistory];
      
      // Apply search filter
      const searchTerm = document.getElementById('history-search')?.value.toLowerCase();
      if (searchTerm) {
        filtered = filtered.filter(entry => 
          entry.materialName.toLowerCase().includes(searchTerm) ||
          entry.scannedBarcode.toLowerCase().includes(searchTerm) ||
          (entry.vendorName && entry.vendorName.toLowerCase().includes(searchTerm)) ||
          (entry.qrData && entry.qrData.toLowerCase().includes(searchTerm))
        );
      }
      
      // Apply status filter
      const statusFilter = document.getElementById('status-filter')?.value;
      if (statusFilter) {
        filtered = filtered.filter(entry => entry.status === statusFilter);
      }
      
      // Apply time filter
      const timeFilter = document.getElementById('time-filter')?.value;
      if (timeFilter) {
        const now = new Date();
        filtered = filtered.filter(entry => {
          const entryDate = new Date(entry.timestamp);
          switch (timeFilter) {
            case 'today':
              return entryDate.toDateString() === now.toDateString();
            case 'week':
              const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              return entryDate >= weekAgo;
            case 'month':
              const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
              return entryDate >= monthAgo;
            default:
              return true;
          }
        });
      }
      
      // Apply sorting
      if (AppState.historySortColumn) {
        filtered.sort((a, b) => {
          let aVal = a[AppState.historySortColumn];
          let bVal = b[AppState.historySortColumn];
          
          if (AppState.historySortColumn === 'timestamp') {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
          }
          
          if (aVal < bVal) return AppState.historySortDirection === 'asc' ? -1 : 1;
          if (aVal > bVal) return AppState.historySortDirection === 'asc' ? 1 : -1;
          return 0;
        });
      } else {
        // Default sort by timestamp (newest first)
        filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      }
      
      return filtered;
    },

    getPaginatedHistory(filteredHistory) {
      if (!AppState.historyPagination.enabled) return filteredHistory;
      
      const start = (AppState.historyPagination.currentPage - 1) * AppState.historyPagination.itemsPerPage;
      const end = start + AppState.historyPagination.itemsPerPage;
      return filteredHistory.slice(start, end);
    },

    updatePagination(totalFilteredItems) {
      const pagination = document.getElementById('history-pagination');
      if (!pagination) return;
      
      const itemsPerPage = AppState.historyPagination.itemsPerPage;
      const totalPages = Math.ceil(totalFilteredItems / itemsPerPage);
      
      if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
      }
      
      pagination.style.display = 'flex';
      
      const currentPage = AppState.historyPagination.currentPage;
      const start = (currentPage - 1) * itemsPerPage + 1;
      const end = Math.min(currentPage * itemsPerPage, totalFilteredItems);
      
      document.getElementById('showing-start').textContent = start;
      document.getElementById('showing-end').textContent = end;
      document.getElementById('total-records').textContent = totalFilteredItems;
      
      // Update page numbers
      const pageNumbers = document.getElementById('page-numbers');
      if (pageNumbers) {
        pageNumbers.innerHTML = '';
        
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage < maxVisiblePages - 1) {
          startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
          const pageBtn = document.createElement('button');
          pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
          pageBtn.textContent = i;
          pageBtn.onclick = () => goToPage(i);
          pageNumbers.appendChild(pageBtn);
        }
      }
      
      // Update prev/next buttons
      const prevBtn = document.getElementById('prev-page');
      const nextBtn = document.getElementById('next-page');
      if (prevBtn) prevBtn.disabled = currentPage === 1;
      if (nextBtn) nextBtn.disabled = currentPage === totalPages;
    },

    formatDate(timestamp) {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    },

    formatTime(timestamp) {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid Time';
      }
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    }
  };

  // UI Manager
  const UIManager = {
    showToast(message, type = 'info') {
      // Notifications disabled - no-op function
      return;
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

    updateVendorStepStatus(step, status) {
      const stepEl = document.getElementById(`vendor-step-${step}`);
      const statusEl = document.getElementById(`vendor-step-${step}-status`);
      
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

      // Reset workflow state for 4-step process
      WorkflowManager.resetWorkflow();

      // Reset all steps
      for (let i = 1; i <= 4; i++) {
        this.updateStepStatus(i, i === 1 ? 'active' : '');
      }

      // Reset form elements
  document.getElementById('material-select').value = '';
  const vendorSelect = document.getElementById('vendor-select');
  if (vendorSelect) {
    vendorSelect.value = '';
    vendorSelect.disabled = true;
    vendorSelect.innerHTML = '<option value="">Complete material verification first...</option>';
  }

      // Hide selection displays
      document.getElementById('selected-material').style.display = 'none';
      document.getElementById('selected-vendor').style.display = 'none';
      
      // Reset material or auto scan area
      const materialScanArea = document.getElementById('material-scan-area');
      const autoScanArea = document.getElementById('auto-scan-area');
      const scanTemplate = `
          <div class="scan-placeholder">
            <i class="fas fa-barcode"></i>
            <span>Select material to start automatic scanning</span>
          </div>
        `;
      if (materialScanArea) {
        materialScanArea.className = 'auto-scan-area';
        materialScanArea.innerHTML = scanTemplate;
      } else if (autoScanArea) {
        autoScanArea.className = 'auto-scan-area';
        autoScanArea.innerHTML = scanTemplate;
      }
      
      // Hide scan instructions (material-first, then legacy)
      const scanInstructions = document.getElementById('material-scan-instructions') || document.getElementById('scan-instructions');
      if (scanInstructions) {
        scanInstructions.style.display = 'none';
      }

      // Reset QR scan UI (vendor section)
      const qrScanArea = document.getElementById('qr-scan-area');
      const qrDataDisplay = document.getElementById('qr-data-display');
      const vendorResetBtn = document.getElementById('vendor-reset-btn');
      if (qrScanArea) {
        qrScanArea.innerHTML = `
          <div class="qr-placeholder">
            <i class="fas fa-qrcode"></i>
            <span>Select vendor to activate QR scanner</span>
            <small>Scanner will automatically detect QR codes and barcodes</small>
          </div>
        `;
      }
      if (qrDataDisplay) qrDataDisplay.style.display = 'none';
      if (vendorResetBtn) vendorResetBtn.style.display = 'none';
    }
  };

  // Workflow Functions
  window.handleMaterialSelection = function() {
    const select = document.getElementById('material-select');
    const selectedBarcode = select.value;
    
    if (!selectedBarcode) {
      AppState.selectedMaterial = null;
      document.getElementById('selected-material').style.display = 'none';
      updateMaterialStepStatus(1, 'active');
      updateMaterialStepStatus(2, '');
      
      // Reset material-scan-area
      const materialScanArea = document.getElementById('material-scan-area');
      if (materialScanArea) {
        materialScanArea.className = 'auto-scan-area';
        materialScanArea.innerHTML = `
          <div class="scan-placeholder">
            <i class="fas fa-barcode"></i>
            <span>Select material to start automatic scanning</span>
          </div>
        `;
      }
      const materialScanInstructions = document.getElementById('material-scan-instructions');
      if (materialScanInstructions) materialScanInstructions.style.display = 'none';
      
      const materialResetBtn = document.getElementById('material-reset-btn');
      if (materialResetBtn) materialResetBtn.style.display = 'none';
      return;
    }

    const materials = DataManager.getMaterials();
    AppState.selectedMaterial = materials.find(m => m.barcode === selectedBarcode);
    
  if (AppState.selectedMaterial) {
      // Show selected material
      document.getElementById('material-name').textContent = AppState.selectedMaterial.name;
      document.getElementById('material-barcode').textContent = AppState.selectedMaterial.barcode;
      document.getElementById('selected-material').style.display = 'block';
      
      updateMaterialStepStatus(1, 'completed');
      updateMaterialStepStatus(2, 'active');
      
      // Show reset button
      const materialResetBtn = document.getElementById('material-reset-btn');
      if (materialResetBtn) materialResetBtn.style.display = 'block';
      
      // Start material scanning
      startMaterialScanning();
      
      // WORKFLOW STEP 1: Material Selected
      WorkflowManager.setMaterialSelected(AppState.selectedMaterial);
      
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

  // QR Code scanning function (vendor-only or as part of 4-step flow)
  window.startQRScanning = function() {
    // Put the system into vendor QR waiting mode and focus the scanner input
    AppState.vendorQRWaiting = true;
    AppState.qrScanned = false;
    
    const barcodeInput = document.getElementById('barcode-input');
    if (barcodeInput) {
      barcodeInput.value = '';
      focusNoScroll(barcodeInput);
    }
    
    // Visual feedback in the scan area
    const qrScanArea = document.getElementById('qr-scan-area');
    if (qrScanArea) {
      qrScanArea.innerHTML = `
        <div class="qr-scanning-active">
          <div class="scan-header" style="text-align: center; margin-bottom: 1rem; color: var(--warning-color);">
            <i class="fas fa-qrcode fa-pulse" style="font-size: 1.5rem; margin-right: 0.5rem;"></i>
            <strong>Waiting for QR Code...</strong>
          </div>
          <div style="text-align: center; padding: 2rem; background: var(--gray-50); border-radius: 0.5rem; border: 2px dashed var(--warning-color);">
            <i class="fas fa-camera" style="font-size: 3rem; color: var(--warning-color); margin-bottom: 1rem;"></i>
            <p>Position the QR code under the scanner</p>
            <small>Scanner is active and ready</small>
          </div>
        </div>
      `;
    }
    
    UIManager.showToast('QR scanner ready. Scan a QR code now.', 'info');
  };

  window.handleVendorSelection = function() {
    const select = document.getElementById('vendor-select');
    const selectedId = select.value;
    
    // Check if material section is completed first
    if (!AppState.selectedMaterial || !AppState.scannedBarcode) {
      UIManager.showToast('Please complete material verification first before selecting vendor', 'warning');
      select.value = '';
      return;
    }
    
    if (!selectedId) {
      AppState.selectedVendor = null;
      document.getElementById('selected-vendor').style.display = 'none';
      updateVendorStepStatus(1, 'active');
      updateVendorStepStatus(2, '');
      
      // Hide vendor reset button
      const vendorResetBtn = document.getElementById('vendor-reset-btn');
      if (vendorResetBtn) vendorResetBtn.style.display = 'none';
      
      // Reset QR scan area
      const qrScanArea = document.getElementById('qr-scan-area');
      if (qrScanArea) {
        qrScanArea.innerHTML = `
          <div class="qr-placeholder">
            <i class="fas fa-qrcode"></i>
            <span>Select vendor to activate QR scanner</span>
            <small>Scanner will automatically detect QR codes and barcodes</small>
          </div>
        `;
      }
      return;
    }

    const vendors = DataManager.getVendors();
    AppState.selectedVendor = vendors.find(v => v.id === selectedId);
    
    if (AppState.selectedVendor) {
      // Show selected vendor
      document.getElementById('vendor-name').textContent = AppState.selectedVendor.name;
      document.getElementById('vendor-code').textContent = AppState.selectedVendor.code;
      document.getElementById('selected-vendor').style.display = 'block';
      
      updateVendorStepStatus(1, 'completed');
      updateVendorStepStatus(2, 'active');
      
      // Show vendor reset button
      const vendorResetBtn = document.getElementById('vendor-reset-btn');
      if (vendorResetBtn) vendorResetBtn.style.display = 'block';
      
      // Remember last vendor for convenience
      try { localStorage.setItem('drbs_last_vendor', AppState.selectedVendor.id); } catch {}

      // Show QR scan ready state and auto-start scanning
      const qrScanArea = document.getElementById('qr-scan-area');
      if (qrScanArea) {
        qrScanArea.innerHTML = `
          <div class="qr-scanning-active">
            <div class="scan-header" style="text-align: center; margin-bottom: 1rem; color: var(--warning-color);">
              <i class="fas fa-qrcode fa-pulse" style="font-size: 1.5rem; margin-right: 0.5rem;"></i>
              <strong>Ready to Scan QR Code or Barcode</strong>
            </div>
            <div style="text-align: center; padding: 2rem; background: linear-gradient(135deg, var(--gray-50) 0%, #e0f2fe 100%); border-radius: 0.5rem; border: 2px dashed var(--warning-color);">
              <div style="animation: pulse 2s infinite;">
                <i class="fas fa-camera" style="font-size: 3rem; color: var(--warning-color); margin-bottom: 1rem;"></i>
              </div>
              <p style="font-weight: 600; color: var(--gray-800);">Position any QR code or barcode under scanner</p>
              <small style="color: var(--gray-600);">
                Accepts: QR codes, barcodes, text data, URLs, JSON • Auto-detection active
              </small>
              <div style="margin-top: 1rem; padding: 0.5rem; background: rgba(59, 130, 246, 0.1); border-radius: 0.25rem;">
                <small style="color: var(--primary-color); font-weight: 600;">
                  <i class="fas fa-info-circle"></i> Vendor: ${AppState.selectedVendor.name} | Step 4 of 4
                </small>
              </div>
              <div style="margin-top: 0.5rem;">
                <small style="color: var(--warning-color); font-weight: 500;">
                  <i class="fas fa-exclamation-triangle"></i> Scanner ready - scan any code to complete workflow
                </small>
              </div>
              <div style="margin-top: 0.75rem; padding: 0.5rem; background: rgba(34, 197, 94, 0.1); border-radius: 0.25rem; border: 1px solid rgba(34, 197, 94, 0.2);">
                <small style="color: var(--success-color); font-weight: 600;">
                  <i class="fas fa-database"></i> All scanned data will be stored in complete workflow history
                </small>
              </div>
            </div>
          </div>
        `;
      }
      
      // Remove qr-actions display - only QR scanning, no other options
      const qrActions = document.getElementById('qr-actions');
      if (qrActions) {
        qrActions.style.display = 'none';
      }
      
      // Auto-start QR scanning
      AppState.vendorQRWaiting = true;
      AppState.qrScanned = false; // Reset QR scanned state
      
      // WORKFLOW STEP 3: Vendor Selected
      WorkflowManager.setVendorSelected(AppState.selectedVendor);
      
      // Focus on hidden input for QR scanner and keep it focused
      const barcodeInput = document.getElementById('barcode-input');
      if (barcodeInput) {
        barcodeInput.value = '';
        barcodeInput.focus();
        
        // Keep focus on scanner input during QR scanning
        const keepFocused = () => {
          if (AppState.vendorQRWaiting && barcodeInput) {
            barcodeInput.focus();
          }
        };
        
        // Maintain focus every 100ms while waiting for QR
        const focusInterval = setInterval(() => {
          if (!AppState.vendorQRWaiting) {
            clearInterval(focusInterval);
          } else {
            keepFocused();
          }
        }, 100);
      }
      
      UIManager.showToast(`✓ Vendor "${AppState.selectedVendor.name}" selected. Step 4: Ready to scan QR code or barcode!`, 'success');
      
      // Add follow-up message about workflow completion
      setTimeout(() => {
        UIManager.showToast('📱 Step 4: Scan any QR code or barcode to complete workflow and store data!', 'info');
      }, 2000);
    }
  };

  // Removed generateQRCode function - vendor section now only supports QR scanning
  // QR scanning happens automatically after vendor selection

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
    // Only handle error cases or incomplete workflows
    // Complete 4-step workflows are handled by WorkflowManager
    if (status !== 'error') {
      console.log('Skipping addToHistory for success - using WorkflowManager instead');
      return;
    }
    
    const entry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      letoff: AppState.selectedLetoff || 'N/A',
      materialName: AppState.selectedMaterial ? AppState.selectedMaterial.name : 'Unknown',
      expectedBarcode: AppState.selectedMaterial ? AppState.selectedMaterial.barcode : '',
      scannedBarcode: AppState.scannedBarcode || '',
      // Ensure vendor is omitted for error/mismatch cases as requested
      vendorName: '',
      status: status,
      // Enhanced QR data storage - preserve full data integrity
      qrData: '',
      qrDataLength: 0,
      // Store full vendor QR data separately for large datasets
      vendorQRData: '',
      isCompleteWorkflow: false,
      errorType: 'Barcode Mismatch'
    };

    AppState.scanHistory.push(entry);
    
    DataManager.saveHistory();
    DataManager.updateHistoryDisplay();
    DataManager.updateStatistics();
    
    console.log('Error entry added to history:', entry);
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
  // Support copying either the currently generated QR (no arg) or a specific QR string from history
  window.copyQRData = function(qrData) {
    const dataToCopy = (typeof qrData === 'string' && qrData.length) ? qrData : AppState.qrData;
    if (!dataToCopy) return;

    navigator.clipboard.writeText(dataToCopy).then(() => {
      UIManager.showToast('QR data copied to clipboard', 'success');
      try { playBeep(true); } catch {}
    }).catch(() => {
      UIManager.showToast('Failed to copy QR data', 'error');
      try { playBeep(false); } catch {}
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

  // Export history as CSV (Full fields: Date, Time, Material, Barcode, Vendor, Full QR Data, Status)
  window.exportHistoryCSV = function() {
    if (!AppState.scanHistory || AppState.scanHistory.length === 0) {
      UIManager.showToast('No history to export', 'warning');
      return;
    }
    
    // Helper to escape CSV values properly
    const escapeCSV = (value) => {
      const str = String(value == null ? '' : value);
      return '"' + str.replace(/"/g, '""') + '"';
    };
    
    const headers = ['Date', 'Time', 'Material', 'Barcode', 'Vendor', 'QR Code Data', 'Status'];
    const rows = AppState.scanHistory.map(entry => {
      // Parse timestamp to extract date and time in readable format
      const timestamp = new Date(entry.timestamp);
      let date = '';
      let time = '';
      
      if (!isNaN(timestamp.getTime())) {
        // Format date as MM/DD/YYYY for better readability
        const month = String(timestamp.getMonth() + 1).padStart(2, '0');
        const day = String(timestamp.getDate()).padStart(2, '0');
        const year = timestamp.getFullYear();
        date = `${month}/${day}/${year}`;
        
        // Format time as HH:MM:SS AM/PM for better readability
        const hours = timestamp.getHours();
        const minutes = String(timestamp.getMinutes()).padStart(2, '0');
        const seconds = String(timestamp.getSeconds()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        time = `${displayHours}:${minutes}:${seconds} ${ampm}`;
      } else {
        // Fallback for invalid timestamps
        date = entry.timestamp || '';
        time = '';
      }
      
      return [
        date,
        time,
        entry.materialName || '',
        entry.scannedBarcode || '',
        entry.vendorName || '',
        entry.qrData || '', // Full QR code data
        entry.status || ''
      ];
    });
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(escapeCSV).join(','))
      .join('\n');
    
    // Add BOM for Excel compatibility
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drbs_history_full_${new Date().toISOString().replace(/[:T]/g,'-').slice(0,16)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    UIManager.showToast('Full history exported with QR data', 'success');
  };

  // Export history as Excel file with readable date/time format
  window.exportHistoryExcel = function() {
    if (!AppState.scanHistory || AppState.scanHistory.length === 0) {
      UIManager.showToast('No history to export', 'warning');
      return;
    }
    
    // Create Excel-compatible HTML table format
    const headers = ['Date', 'Time', 'Material', 'Barcode', 'Vendor', 'QR Code Data', 'Status'];
    const rows = AppState.scanHistory.map(entry => {
      // Parse timestamp to extract date and time in readable format
      const timestamp = new Date(entry.timestamp);
      let date = '';
      let time = '';
      
      if (!isNaN(timestamp.getTime())) {
        // Format date as MM/DD/YYYY for better readability
        const month = String(timestamp.getMonth() + 1).padStart(2, '0');
        const day = String(timestamp.getDate()).padStart(2, '0');
        const year = timestamp.getFullYear();
        date = `${month}/${day}/${year}`;
        
        // Format time as HH:MM:SS AM/PM for better readability
        const hours = timestamp.getHours();
        const minutes = String(timestamp.getMinutes()).padStart(2, '0');
        const seconds = String(timestamp.getSeconds()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        time = `${displayHours}:${minutes}:${seconds} ${ampm}`;
      } else {
        // Fallback for invalid timestamps
        date = entry.timestamp || '';
        time = '';
      }
      
      return [
        date,
        time,
        entry.materialName || '',
        entry.scannedBarcode || '',
        entry.vendorName || '',
        entry.qrData || '', // Full QR code data
        entry.status || ''
      ];
    });
    
    // Create Excel-compatible HTML table
    const escapeHtml = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    
    const excelContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <meta name="ProgId" content="Excel.Sheet">
        <meta name="Generator" content="DRBS Material Management System">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>DRBS History</x:Name>
                <x:WorksheetSource HRef="sheet001.htm"/>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .status-success { color: #10b981; font-weight: bold; }
          .status-error { color: #ef4444; font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>DRBS Material Management System - Scan History</h2>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        <p>Total Records: ${AppState.scanHistory.length}</p>
        <table>
          <thead>
            <tr>
              ${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                ${row.map((cell, index) => {
                  const cellValue = escapeHtml(cell);
                  const className = index === 6 && cell ? `status-${cell.toLowerCase()}` : '';
                  return `<td class="${className}">${cellValue}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    // Create blob and download
    const blob = new Blob(['\uFEFF' + excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drbs_history_${new Date().toISOString().replace(/[:T]/g,'-').slice(0,16)}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    UIManager.showToast('History exported to Excel successfully', 'success');
  };

  // Quick reset function for both material and vendor sections
  window.quickReset = function() {
    try {
      // Reset both sections
      resetMaterialSection();
      resetVendorSection();
      
      // Clear and refocus the scanner input
      const barcodeInput = document.getElementById('barcode-input');
      if (barcodeInput) {
        barcodeInput.value = '';
        barcodeInput.focus();
      }
      
      UIManager.showToast('Workflow reset. Ready for next scan.', 'info');
    } catch (error) {
      console.error('Quick reset failed:', error);
      UIManager.showToast('Reset failed', 'error');
    }
  };

  // Clear all scan history
  window.clearHistory = function() {
    if (AppState.scanHistory.length === 0) {
      UIManager.showToast('History is already empty', 'info');
      return;
    }
    
    if (confirm('Are you sure you want to clear all scan history? This action cannot be undone.')) {
      AppState.scanHistory = [];
      DataManager.saveHistory();
      DataManager.updateHistoryDisplay();
      DataManager.updateStatistics();
      UIManager.showToast('All history cleared successfully', 'success');
    }
  };

  // Print scan history
  window.printHistory = function() {
    if (AppState.scanHistory.length === 0) {
      UIManager.showToast('No history to print', 'warning');
      return;
    }

    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>DRBS Scan History Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .company-info { margin-bottom: 10px; }
          .report-date { color: #666; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .status-success { color: #10b981; font-weight: bold; }
          .status-error { color: #ef4444; font-weight: bold; }
          .status-warning { color: #f59e0b; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <h1>DRBS Material Management System</h1>
            <h2>Scan History Report</h2>
          </div>
          <div class="report-date">Generated on: ${new Date().toLocaleString()}</div>
          <div class="report-date">Total Records: ${AppState.scanHistory.length}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Material</th>
              <th>Expected Barcode</th>
              <th>Scanned Barcode</th>
              <th>Vendor</th>
              <th>QR Data</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${AppState.scanHistory.map(entry => `
              <tr>
                <td>${entry.timestamp}</td>
                <td>${entry.materialName}</td>
                <td>${entry.expectedBarcode}</td>
                <td>${entry.scannedBarcode}</td>
                <td>${entry.vendorName || '-'}</td>
                <td>${entry.qrData ? (entry.qrData.length > 50 ? entry.qrData.substring(0, 50) + '...' : entry.qrData) : '-'}</td>
                <td class="status-${entry.status}">${entry.status.toUpperCase()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Developed by <strong>Vardhan Bhanuwanshe</strong></p>
          <p>DRBS - Digital Resource & Barcode System</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    UIManager.showToast('Print dialog opened', 'success');
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
      // Initially disable vendor selection until material is verified
      vendorSelect.disabled = true;
      vendorSelect.innerHTML = '<option value="">Complete material verification first...</option>';
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
      if (AppState.isScanLocked) return;
      const scanned = sanitizeScan(e.target.value);
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const minLen = AppState.vendorQRWaiting ? 2 : 8; // shorter for QR/text data
        if (scanned.length >= minLen) {
          processBarcodeScanned(scanned);
          e.target.value = '';
        }
      }, 60);
    });

    barcodeInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        if (AppState.isScanLocked) return;
        const scanned = sanitizeScan(barcodeInput.value);
        if (scanned) {
          processBarcodeScanned(scanned);
          barcodeInput.value = '';
        }
      }
    });

    // Auto-focus for barcode scanner
    barcodeInput.addEventListener('blur', function() {
      const scanArea = document.getElementById('material-scan-area') ||
                       document.getElementById('auto-scan-area') ||
                       document.getElementById('barcode-scan-area');
      if (scanArea && scanArea.classList.contains('scanning')) {
        setTimeout(() => focusNoScroll(barcodeInput), 100);
      }
    });
  }

  function processBarcodeScanned(scannedBarcode) {
    // Throttle very fast consecutive scans
    if (AppState.isScanLocked) return;
    AppState.isScanLocked = true;
    setTimeout(() => { AppState.isScanLocked = false; }, 250);

    const sanitizedScan = sanitizeScan(scannedBarcode);
    
    // Check if we're waiting for vendor QR scan
  if (AppState.vendorQRWaiting && !AppState.qrScanned) {
      // Enhanced QR validation for big data support
      // Accept QR codes with various data types: alphanumeric, URLs, JSON, etc.
      if (sanitizedScan.length >= 2) { // Very permissive minimum length
        // Store the full QR data (can handle large datasets)
        AppState.qrData = sanitizedScan;
        AppState.vendorQRData = sanitizedScan; // Also store in separate field for persistence
        AppState.qrScanned = true;
        AppState.vendorQRWaiting = false;
        playBeep(true);

        // Enhanced display for big data
        const truncatedDisplay = sanitizedScan.length > 100 ? 
          sanitizedScan.substring(0, 100) + '...' : sanitizedScan;

        // Update the QR scan area to show success
        const qrScanArea = document.getElementById('qr-scan-area');
        if (qrScanArea) {
          qrScanArea.innerHTML = `
            <div class="qr-scan-success">
              <div style="text-align: center; padding: 2rem; background: var(--success-color); color: white; border-radius: 0.5rem;">
                <i class="fas fa-check-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <p><strong>QR Code/Barcode Data Captured Successfully!</strong></p>
                <small>Complete workflow data stored in scan history</small>
              </div>
            </div>
          `;
        }

        // Show the captured data in the data display area
        const qrDataDisplay = document.getElementById('qr-data-display');
        const qrDataContent = document.getElementById('qr-data-content');
        const qrDataInfo = document.getElementById('qr-data-info');
        
        if (qrDataDisplay && qrDataContent && qrDataInfo) {
          qrDataDisplay.style.display = 'block';
          qrDataContent.innerHTML = `
            <div style="background: #f8f9fa; padding: 1rem; border-radius: 0.5rem; border-left: 4px solid var(--success-color); font-family: monospace; word-break: break-all; max-height: 150px; overflow-y: auto;">
              ${truncatedDisplay}
            </div>
          `;
          qrDataInfo.textContent = `${sanitizedScan.length} characters captured • Stored as QR/Barcode Data in History`;
        }
        
        updateVendorStepStatus(2, 'completed');
        
        // Step 4: QR Code Scanned - attempt to complete workflow
        WorkflowManager.setQRScanned(sanitizedScan);

        // If full 4-step workflow is not complete, still store a vendor-only success entry
        if (!WorkflowManager.isWorkflowComplete()) {
          const entry = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            letoff: AppState.selectedLetoff || 'N/A',
            materialName: AppState.selectedMaterial ? AppState.selectedMaterial.name : '',
            expectedBarcode: AppState.selectedMaterial ? AppState.selectedMaterial.barcode : '',
            scannedBarcode: AppState.scannedBarcode || '',
            vendorName: AppState.selectedVendor ? AppState.selectedVendor.name : '',
            vendorCode: AppState.selectedVendor ? AppState.selectedVendor.code : '',
            qrData: sanitizedScan,
            qrDataLength: sanitizedScan.length,
            status: 'success',
            isCompleteWorkflow: false,
            type: 'vendor-only'
          };
          AppState.scanHistory.push(entry);
          DataManager.saveHistory();
          DataManager.updateHistoryDisplay();
          DataManager.updateStatistics();
          UIManager.showToast('✅ Vendor QR recorded in history', 'success');
        } else {
          UIManager.showToast('🎉 QR scanned successfully! Complete workflow stored', 'success');
        }

        // Auto-reset after 5 seconds
        setTimeout(() => {
          UIManager.resetWorkflow();
          populateDropdowns();
          UIManager.showToast('Ready for next scan', 'info');
        }, 5000);

        return;
      } else {
        playBeep(false);
        UIManager.showToast(`QR too short (${sanitizedScan.length} chars). Please scan a valid vendor QR code.`, 'error');
        return;
      }
    }
    
    // Regular barcode scanning (step 2)
    if (!AppState.selectedMaterial) {
      UIManager.showToast('Please select a material first', 'error');
      return;
    }

    AppState.scannedBarcode = sanitizedScan;
    
    // Update the material barcode display with the matched barcode
    const materialBarcodeDisplay = document.getElementById('material-barcode');
    if (materialBarcodeDisplay && AppState.selectedMaterial) {
      const expected = sanitizeScan(AppState.selectedMaterial.barcode);
      if (sanitizedScan === expected) {
        materialBarcodeDisplay.innerHTML = `<code style="background: var(--success-color); color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-weight: 600;">${sanitizedScan}</code>`;
      }
    }
    
    const autoScanArea = document.getElementById('material-scan-area') ||
                         document.getElementById('auto-scan-area') ||
                         document.getElementById('barcode-scan-area');
    const scanInstructions = document.getElementById('material-scan-instructions') ||
                             document.getElementById('scan-instructions');

    const expected = sanitizeScan(AppState.selectedMaterial.barcode);
    if (sanitizedScan === expected) {
      playBeep(true);
      
      // Show "OK LOAD" message first
      UIManager.showToast('📦 OK LOAD - Material barcode detected!', 'success');
      
      // Enhanced success display with verification process
      if (autoScanArea) {
        autoScanArea.className = (autoScanArea.id === 'auto-scan-area' || autoScanArea.id === 'material-scan-area')
          ? 'auto-scan-area success'
          : 'scan-area success';
      autoScanArea.innerHTML = `
        <div class="scan-result success">
          <div class="scan-result-header">
            <i class="fas fa-check-circle"></i>
            <strong>📦 OK LOAD - VERIFYING...</strong>
          </div>
          <div class="scan-result-content">
            <div class="verification-process" style="margin: 1rem 0;">
              <div class="verification-step active">
                <i class="fas fa-search fa-spin"></i>
                <span>Verifying barcode...</span>
              </div>
            </div>
            Material: <strong>${AppState.selectedMaterial.name}</strong><br>
            Scanned: <code style="background: var(--warning-color); color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem;">${sanitizedScan}</code><br>
          </div>
        </div>
      `;
      }
      
      // Show verification process
      setTimeout(() => {
        UIManager.showToast('🔍 Verifying barcode match...', 'info');
        
        // Update display to show verification success
        if (autoScanArea) {
          autoScanArea.innerHTML = `
            <div class="scan-result success">
              <div class="scan-result-header">
                <i class="fas fa-check-circle"></i>
                <strong>✅ VERIFIED - Perfect Match!</strong>
              </div>
              <div class="scan-result-content">
                <div class="verification-complete" style="margin: 1rem 0; color: var(--success-color);">
                  <i class="fas fa-check-circle"></i>
                  <span><strong>Verification Complete</strong></span>
                </div>
                Material: <strong>${AppState.selectedMaterial.name}</strong><br>
                Matched Barcode: <code style="background: var(--success-color); color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem;">${sanitizedScan}</code><br>
                <small style="color: var(--success-color); font-weight: 600;">✓ Material Confirmed</small><br>
                <small style="color: var(--primary-color); margin-top: 0.5rem; display: block;">
                  <i class="fas fa-database"></i> Data ready for vendor selection
                </small>
              </div>
            </div>
          `;
        }
        
        if (scanInstructions) {
          scanInstructions.style.display = 'none';
        }
        
        updateMaterialStepStatus(2, 'completed');
        
        // Update step 3 to show vendor selection is now available
        const step3Element = document.querySelector('.workflow-step:nth-child(3)');
        if (step3Element) {
          step3Element.classList.add('active');
          const step3Icon = step3Element.querySelector('.step-icon');
          if (step3Icon) {
            step3Icon.innerHTML = '<i class="fas fa-circle-dot"></i>';
          }
        }
        
        // WORKFLOW STEP 2: Barcode Scanned Successfully
        WorkflowManager.setBarcodeScanned(sanitizedScan, true);
        
        // Show verification success message
        UIManager.showToast('✅ Barcode verified successfully! Vendor selection unlocked!', 'success');
        
        // Additional message about proceeding to vendor selection
        setTimeout(() => {
          UIManager.showToast('🔓 Step 3 Unlocked: Vendor selection is now available', 'info');
        }, 800);
        
        // Auto-redirect to vendor section after successful verification
        setTimeout(() => {
          // Enable vendor selection since barcode is now verified
          const vendorSelect = document.getElementById('vendor-select');
          if (vendorSelect) {
            vendorSelect.disabled = false;
            // Populate vendor options now that material is verified
            const vendors = DataManager.getVendors();
            vendorSelect.innerHTML = '<option value="">Choose vendor...</option>' + 
              vendors.map(v => `<option value="${v.id}">${v.name} (${v.code})</option>`).join('');
          }
          
          // Check if admin panel is open and switch to vendors section
          const adminPanel = document.getElementById('admin-panel');
          if (adminPanel && adminPanel.style.display !== 'none') {
            // Switch to vendors tab in admin panel
            showAdminSection('vendors');
            
            // Highlight the vendors section briefly
            const vendorsSection = document.getElementById('admin-vendors');
            if (vendorsSection) {
              vendorsSection.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
              vendorsSection.style.border = '2px solid #3b82f6';
              vendorsSection.style.borderRadius = '12px';
              vendorsSection.style.transition = 'all 0.3s ease';
              
              setTimeout(() => {
                vendorsSection.style.backgroundColor = '';
                vendorsSection.style.border = '';
                vendorsSection.style.borderRadius = '';
              }, 3000);
            }
            
            UIManager.showToast('📋 Step 3: Admin panel switched to Vendors - Select a vendor to continue', 'info');
          } else {
            // Scroll to vendor section in main interface
            const vendorSection = document.querySelector('.vendor-section');
            if (vendorSection) {
              vendorSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
              });
              
              // Highlight the vendor section
              vendorSection.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
              vendorSection.style.border = '2px solid #3b82f6';
              vendorSection.style.borderRadius = '12px';
              vendorSection.style.transition = 'all 0.3s ease';
              
              setTimeout(() => {
                vendorSection.style.backgroundColor = '';
                vendorSection.style.border = '';
                vendorSection.style.borderRadius = '';
              }, 3000);
            }
            
            // Focus on vendor selection
            const vendorSelect = document.getElementById('vendor-select');
            if (vendorSelect) {
              vendorSelect.focus();
              
              // Highlight the vendor select dropdown
              vendorSelect.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
              vendorSelect.style.border = '2px solid #3b82f6';
              vendorSelect.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)';
              vendorSelect.style.transition = 'all 0.3s ease';
              
              setTimeout(() => {
                vendorSelect.style.backgroundColor = '';
                vendorSelect.style.border = '';
                vendorSelect.style.boxShadow = '';
              }, 3000);
              
              UIManager.showToast('📋 Step 3: Please select a vendor to continue', 'info');
            }
          }
        }, 1500);
        
      }, 1000); // 1 second verification delay
      
      // Clear the scanner input and refocus for next scan
      const input = document.getElementById('barcode-input');
      if (input) { 
        input.value = ''; 
        setTimeout(() => focusNoScroll(input), 500);
      }
      
    } else {
      playBeep(false);
      // Failed scan - Show enhanced custom alert
      showMismatchAlert(sanitizedScan);
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
    const scanArea = document.getElementById('material-scan-area') ||
                      document.getElementById('auto-scan-area') ||
                      document.getElementById('barcode-scan-area');
    if (scanArea) {
      scanArea.className = (scanArea.id === 'auto-scan-area' || scanArea.id === 'material-scan-area')
        ? 'auto-scan-area error'
        : 'scan-area error';
      scanArea.innerHTML = `
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
    }
    
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

  // LETOFF Selection Setup
  function setupLetoffSelection() {
    const letoffOptions = document.querySelectorAll('input[name="letoff"]');
    const letoffStatus = document.getElementById('letoff-status');
    
    letoffOptions.forEach(option => {
      option.addEventListener('change', function() {
        if (this.checked) {
          AppState.selectedLetoff = this.value;
          
          // Update status display
          if (letoffStatus) {
            letoffStatus.classList.add('selected');
            letoffStatus.innerHTML = `
              <i class="fas fa-check-circle"></i>
              <span>LETOFF ${this.value} selected - You can now proceed with material selection</span>
            `;
          }
          
          // Update localStorage for persistence
          localStorage.setItem('drbs_selected_letoff', this.value);
          
          console.log(`LETOFF ${this.value} selected`);
        }
      });
    });
    
    // Restore previous selection if exists
    const savedLetoff = localStorage.getItem('drbs_selected_letoff');
    if (savedLetoff) {
      const savedOption = document.querySelector(`input[name="letoff"][value="${savedLetoff}"]`);
      if (savedOption) {
        savedOption.checked = true;
        AppState.selectedLetoff = savedLetoff;
        
        if (letoffStatus) {
          letoffStatus.classList.add('selected');
          letoffStatus.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>LETOFF ${savedLetoff} selected - You can now proceed with material selection</span>
          `;
        }
      }
    }
  }

  // Initialize application
  document.addEventListener('DOMContentLoaded', async function() {
    // Initialize system with loading screen
    await SystemInitializer.initialize();
    
    // Set footer year
    const footerYear = document.getElementById('footer-year');
    if (footerYear) {
      footerYear.textContent = new Date().getFullYear();
    }
    
    // Initialize UI
    populateDropdowns();
    DataManager.loadHistory();
    DataManager.updateStatistics(); // Update dashboard metrics
    UIManager.resetWorkflow();
    
    // Setup event handlers
    handleBarcodeInput();
    setupLetoffSelection();
    
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
    // Admin password protection (uses stored password or defaults to admin123)
    const storedPassword = localStorage.getItem('drbs_admin_password') || 'admin123';
    const enteredPassword = prompt('Enter Admin Password:');

    if (enteredPassword === null) return; // cancelled

    if (enteredPassword !== storedPassword) {
      UIManager.showToast('Access Denied: Invalid password', 'error');
      playBeep(false);
      return;
    }

    // Correct password - open admin panel
    const modal = document.getElementById('admin-modal');
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      loadAdminData();
      updateTabBadges();
      UIManager.showToast('Admin panel opened successfully', 'success');
      playBeep(true);
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
    } else if (section === 'system') {
      // Update system stats if the elements still exist
      updateSystemStats();
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
    let csvContent = 'Timestamp,Material,ExpectedBarcode,ScannedBarcode,Vendor,QR Data,Status\n';

    history.forEach(entry => {
      const row = [
        entry.timestamp || '',
        (entry.materialName || '').replace(/"/g, '""'),
        entry.expectedBarcode || '',
        entry.scannedBarcode || '',
        (entry.vendorName || '').replace(/"/g, '""'),
        entry.qrData ? `"${String(entry.qrData).replace(/"/g, '""')}"` : '',
        entry.status || ''
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

  // =============================================================================
  // ENHANCED FUNCTIONALITY FOR INDEPENDENT SECTIONS
  // =============================================================================

  // Material Section Reset Function
  window.resetMaterialSection = function() {
    AppState.selectedMaterial = null;
    AppState.scannedBarcode = null;
    AppState.materialScanningActive = false;
    
    // Reset UI
    const materialSelect = document.getElementById('material-select');
    const selectedMaterial = document.getElementById('selected-material');
    const materialScanArea = document.getElementById('material-scan-area');
    const materialResetBtn = document.getElementById('material-reset-btn');
    const materialStep1 = document.getElementById('material-step-1');
    const materialStep2 = document.getElementById('material-step-2');
    
    if (materialSelect) materialSelect.value = '';
    if (selectedMaterial) selectedMaterial.style.display = 'none';
    if (materialResetBtn) materialResetBtn.style.display = 'none';
    
    if (materialScanArea) {
      materialScanArea.className = 'auto-scan-area';
      materialScanArea.innerHTML = `
        <div class="scan-placeholder">
          <i class="fas fa-barcode"></i>
          <span>Select material to start automatic scanning</span>
        </div>
      `;
    }
    
    // Reset step statuses using proper functions
    updateMaterialStepStatus(1, 'active');
    updateMaterialStepStatus(2, '');
    
    // Hide scan instructions
    const materialScanInstructions = document.getElementById('material-scan-instructions');
    if (materialScanInstructions) materialScanInstructions.style.display = 'none';
    
    // Disable vendor selection since material is reset
    const vendorSelect = document.getElementById('vendor-select');
    if (vendorSelect) {
      vendorSelect.disabled = true;
      vendorSelect.value = '';
      vendorSelect.innerHTML = '<option value="">Complete material verification first...</option>';
    }
    
    UIManager.showToast('Material section reset successfully', 'info');
  };

  // Vendor Section Reset Function
  window.resetVendorSection = function() {
    AppState.selectedVendor = null;
    AppState.qrData = null;
    AppState.qrScanned = false;
    AppState.vendorQRWaiting = false;
    AppState.vendorQRData = null;
    
    // Reset UI
    const vendorSelect = document.getElementById('vendor-select');
    const selectedVendor = document.getElementById('selected-vendor');
    const qrScanArea = document.getElementById('qr-scan-area');
    const qrDataDisplay = document.getElementById('qr-data-display');
    const vendorResetBtn = document.getElementById('vendor-reset-btn');
    
    if (vendorSelect) vendorSelect.value = '';
    if (selectedVendor) selectedVendor.style.display = 'none';
    if (vendorResetBtn) vendorResetBtn.style.display = 'none';
    if (qrDataDisplay) qrDataDisplay.style.display = 'none';
    
    if (qrScanArea) {
      qrScanArea.innerHTML = `
        <div class="qr-placeholder">
          <i class="fas fa-qrcode"></i>
          <span>Select vendor to activate QR scanner</span>
          <small>Scanner will automatically detect QR codes and barcodes</small>
        </div>
      `;
    }
    
    // Reset step statuses using proper functions
    updateVendorStepStatus(1, 'active');
    updateVendorStepStatus(2, '');
    
    UIManager.showToast('Vendor section reset successfully', 'info');
  };

  // Enhanced Sound System
  const SoundSystem = {
    audioContext: null,
    
    init() {
      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.warn('Web Audio API not supported');
      }
    },
    
    playSuccessBeep() {
      if (!this.audioContext) return;
      
      try {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.3);
      } catch (e) {
        console.warn('Could not play success sound:', e);
      }
    },
    
    playErrorAlarm() {
      if (!this.audioContext) return;
      
      try {
        // Create ambulance-like siren sound
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Siren frequency modulation
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        for (let i = 0; i < 6; i++) {
          const time = this.audioContext.currentTime + (i * 0.3);
          oscillator.frequency.setValueAtTime(800, time);
          oscillator.frequency.setValueAtTime(400, time + 0.15);
        }
        
        gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1.8);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 1.8);
      } catch (e) {
        console.warn('Could not play error sound:', e);
      }
    }
  };

  // Initialize sound system
  SoundSystem.init();

  // Enhanced Material Handling with Sound
  const originalHandleMaterialSelection = window.handleMaterialSelection;
  window.handleMaterialSelection = function() {
    const select = document.getElementById('material-select');
    const selectedBarcode = select.value;
    
    if (!selectedBarcode) {
      // Reset material section if no selection
      const selectedMaterial = document.getElementById('selected-material');
      const materialScanArea = document.getElementById('material-scan-area');
      
      if (selectedMaterial) selectedMaterial.style.display = 'none';
      if (materialScanArea) {
        materialScanArea.className = 'auto-scan-area';
        materialScanArea.innerHTML = `
          <div class="scan-placeholder">
            <i class="fas fa-barcode"></i>
            <span>Select material to start automatic scanning</span>
          </div>
        `;
      }
      
      const materialStep2 = document.getElementById('material-step-2');
      if (materialStep2) materialStep2.className = 'workflow-step';
      AppState.selectedMaterial = null;
      return;
    }

    const materials = DataManager.getMaterials();
    AppState.selectedMaterial = materials.find(m => m.barcode === selectedBarcode);
    
    if (AppState.selectedMaterial) {
      // Update selected material display
      const materialNameEl = document.getElementById('material-name');
      const materialBarcodeEl = document.getElementById('material-barcode');
      const selectedMaterialEl = document.getElementById('selected-material');
      
      if (materialNameEl) materialNameEl.textContent = AppState.selectedMaterial.name;
      if (materialBarcodeEl) materialBarcodeEl.textContent = AppState.selectedMaterial.barcode;
      if (selectedMaterialEl) selectedMaterialEl.style.display = 'block';
      
      // Update step statuses
      const materialStep1 = document.getElementById('material-step-1');
      const materialStep2 = document.getElementById('material-step-2');
      if (materialStep1) materialStep1.className = 'workflow-step completed';
      if (materialStep2) materialStep2.className = 'workflow-step active';
      
      // Start automatic scanning
      startMaterialScanning();
      
      console.log(`Material selected: ${AppState.selectedMaterial.name}`, 'success');
    }
  };

  // Enhanced Vendor Handling
  const originalHandleVendorSelection = window.handleVendorSelection;
  window.handleVendorSelection = function() {
    // Prefer the primary implementation defined earlier (auto-starts QR scanning and updates UI)
    if (typeof originalHandleVendorSelection === 'function') {
      return originalHandleVendorSelection();
    }
    // Fallback minimal behavior
    const select = document.getElementById('vendor-select');
    const selectedId = select?.value;
    if (!selectedId) {
      resetVendorSection();
      return;
    }
    const vendors = DataManager.getVendors();
    AppState.selectedVendor = vendors.find(v => v.id === selectedId);
    if (AppState.selectedVendor) {
      document.getElementById('vendor-name').textContent = AppState.selectedVendor.name;
      document.getElementById('vendor-code').textContent = AppState.selectedVendor.code;
      document.getElementById('selected-vendor').style.display = 'block';
      updateVendorStepStatus(1, 'completed');
      updateVendorStepStatus(2, 'active');
      AppState.vendorQRWaiting = true;
      const input = document.getElementById('barcode-input');
      if (input) { input.value = ''; focusNoScroll(input); }
      const qrScanArea = document.getElementById('qr-scan-area');
      if (qrScanArea) {
        qrScanArea.innerHTML = `
          <div class="qr-scanning-active">
            <div class="scan-header" style="text-align: center; margin-bottom: 1rem; color: var(--warning-color);">
              <i class="fas fa-qrcode fa-pulse" style="font-size: 1.5rem; margin-right: 0.5rem;"></i>
              <strong>Ready to Scan QR Code</strong>
            </div>
            <div style="text-align: center; padding: 2rem; background: var(--gray-50); border-radius: 0.5rem; border: 2px dashed var(--warning-color);">
              <i class="fas fa-camera" style="font-size: 3rem; color: var(--warning-color); margin-bottom: 1rem;"></i>
              <p>Position the QR code under the scanner</p>
            </div>
          </div>`;
      }
      console.log(`Vendor selected: ${AppState.selectedVendor.name}`, 'success');
    }
  };

  // Material Scanning Function
  function startMaterialScanning() {
    const materialScanArea = document.getElementById('material-scan-area');
    const materialScanInstructions = document.getElementById('material-scan-instructions');
    
    if (materialScanArea) {
      materialScanArea.className = 'auto-scan-area ready';
      materialScanArea.innerHTML = `
        <div class="scan-placeholder">
          <i class="fas fa-crosshairs"></i>
          <span>Scanner Ready - Waiting for barcode...</span>
        </div>
      `;
    }
    
    if (materialScanInstructions) materialScanInstructions.style.display = 'block';
    
    // Focus on hidden input for scanner
    const barcodeInput = document.getElementById('barcode-input');
    if (barcodeInput) {
      barcodeInput.value = '';
      focusNoScroll(barcodeInput);
      
      // Set material scanning mode
      AppState.materialScanningActive = true;
    }
    
    UIManager.showToast('Material scanner activated - ready to scan barcode', 'info');
  }

  // Removed generateVendorQRCode function - vendor section now only supports QR scanning
  // QR scanning happens automatically after vendor selection

  // Removed duplicate overridden handlers (processBarcodeScanned, showMismatchAlert, resetAndRecord)

  // =============================================================================
  // ENHANCED ADMIN PANEL FUNCTIONS
  // =============================================================================

  // Password Change Modal Functions
  // (Password change UI removed)

  // Clear History Modal Functions
  // (Clear history UI removed)

  // (Clear history modal handlers removed)

  // (Clear history confirm removed)

  // (Duplicate barcode input handler removed to avoid double listeners)

  // MongoDB Integration Initialization
  if (window.DRBS_CLIENT) {
    // Initialize UI Manager for toasts
    window.UIManager = {
      showToast: function(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Remove toast
        setTimeout(() => {
          toast.classList.remove('show');
          setTimeout(() => {
            if (document.body.contains(toast)) {
              document.body.removeChild(toast);
            }
          }, 300);
        }, duration);
      }
    };

    // Update sync status on initialization
    const syncStatus = document.getElementById('sync-status');
    if (syncStatus) {
      if (window.DRBS_CLIENT.isConnected()) {
        syncStatus.textContent = 'Connected';
        syncStatus.className = 'sync-status sync-success';
      } else {
        syncStatus.textContent = 'Offline';
        syncStatus.className = 'sync-status sync-error';
      }
    }

    // Update counts from stored data
    const updateInitialCounts = () => {
      const materialsCount = document.getElementById('materials-count');
      const vendorsCount = document.getElementById('vendors-count');
      const historyCount = document.getElementById('history-count');
      
      if (materialsCount) materialsCount.textContent = AppState.materials.length;
      if (vendorsCount) vendorsCount.textContent = AppState.vendors.length;
      if (historyCount) historyCount.textContent = AppState.scanHistory.length;
    };
    
    updateInitialCounts();
    
    // Force initial sync after 2 seconds
    setTimeout(() => {
      if (window.DRBS_CLIENT.isConnected()) {
        window.DRBS_CLIENT.forcSync().then(() => {
          UIManager.showToast('System synchronized across all devices', 'success');
        });
      }
    }, 2000);
  }

  // Enhanced Button Interactions
  function initializeEnhancedButtons() {
    // Add click ripple effect to all enhanced/admin buttons
    document.querySelectorAll('.enhanced-action-btn, .enhanced-add-btn, .enhanced-clear-btn, .enhanced-password-btn, .admin-btn, .header-action-btn, .btn-primary, .btn-secondary, .btn-danger')
      .forEach(button => {
      button.addEventListener('click', function(e) {
        // Create ripple effect
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');
        
        this.appendChild(ripple);
        
        setTimeout(() => {
          if (ripple.parentNode) {
            ripple.parentNode.removeChild(ripple);
          }
        }, 600);
      });
      });

    // Add button success feedback
    window.buttonSuccessFeedback = function(button, message = 'Success!') {
      const originalText = button.innerHTML;
      button.innerHTML = '<i class="fas fa-check"></i> ' + message;
      button.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      button.disabled = true;
      
      setTimeout(() => {
        button.innerHTML = originalText;
        button.style.background = '';
        button.disabled = false;
      }, 2000);
    };

    // Add button error feedback
    window.buttonErrorFeedback = function(button, message = 'Error!') {
      const originalText = button.innerHTML;
      button.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ' + message;
      button.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
      button.style.animation = 'buttonShake 0.5s ease-in-out';
      
      setTimeout(() => {
        button.innerHTML = originalText;
        button.style.background = '';
        button.style.animation = '';
      }, 2000);
    };
  }

  // Enhanced History Functions
  window.filterHistory = function() {
    DataManager.updateHistoryDisplay();
    
    // Show/hide clear search button
    const searchInput = document.getElementById('history-search');
    const clearBtn = document.querySelector('.clear-search');
    if (searchInput && clearBtn) {
      clearBtn.style.display = searchInput.value ? 'block' : 'none';
    }
  };

  window.clearHistorySearch = function() {
    const searchInput = document.getElementById('history-search');
    const statusFilter = document.getElementById('status-filter');
    const timeFilter = document.getElementById('time-filter');
    const clearBtn = document.querySelector('.clear-search');
    
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';
    if (timeFilter) timeFilter.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    
    DataManager.updateHistoryDisplay();
  };

  window.sortHistory = function(column) {
    // Update sort state
    if (AppState.historySortColumn === column) {
      AppState.historySortDirection = AppState.historySortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      AppState.historySortColumn = column;
      AppState.historySortDirection = 'asc';
    }
    
    // Update sort indicators
    document.querySelectorAll('.sort-icon').forEach(icon => {
      icon.className = 'fas fa-sort sort-icon';
    });
    
    const sortIcon = document.querySelector(`th[onclick="sortHistory('${column}')"] .sort-icon`);
    if (sortIcon) {
      sortIcon.className = `fas fa-sort-${AppState.historySortDirection === 'asc' ? 'up' : 'down'} sort-icon active`;
    }
    
    DataManager.updateHistoryDisplay();
  };

  window.changePage = function(direction) {
    const newPage = AppState.historyPagination.currentPage + direction;
    const filteredHistory = DataManager.getFilteredHistory();
    const totalPages = Math.ceil(filteredHistory.length / AppState.historyPagination.itemsPerPage);
    
    if (newPage >= 1 && newPage <= totalPages) {
      AppState.historyPagination.currentPage = newPage;
      DataManager.updateHistoryDisplay();
    }
  };

  window.goToPage = function(page) {
    AppState.historyPagination.currentPage = page;
    DataManager.updateHistoryDisplay();
  };

  window.copyToClipboard = function(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        UIManager.showToast('Copied to clipboard', 'success');
      }).catch(() => {
        UIManager.showToast('Failed to copy', 'error');
      });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        UIManager.showToast('Copied to clipboard', 'success');
      } catch {
        UIManager.showToast('Failed to copy', 'error');
      }
      document.body.removeChild(textArea);
    }
  };

  // Initialize enhanced buttons
  initializeEnhancedButtons();

  // Add CSS for ripple effect
  if (!document.getElementById('ripple-styles')) {
    const style = document.createElement('style');
    style.id = 'ripple-styles';
    style.textContent = `
      .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple-animation 0.6s linear;
        pointer-events: none;
      }
      
      @keyframes ripple-animation {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Enhanced Admin Panel Functions
  window.clearSearch = function(section) {
    const searchInput = document.getElementById(`${section}-search`);
    const clearBtn = searchInput?.parentElement?.querySelector('.search-clear');
    
    if (searchInput) {
      searchInput.value = '';
      if (clearBtn) clearBtn.style.display = 'none';
      
      // Trigger the appropriate filter function
      if (section === 'materials') {
        filterMaterials();
      } else if (section === 'vendors') {
        filterVendors();
      }
      
      // Focus back on search input
      searchInput.focus();
    }
  };

  // Enhanced search input handlers
  document.addEventListener('DOMContentLoaded', function() {
    // Materials search enhancement
    const materialsSearch = document.getElementById('materials-search');
    if (materialsSearch) {
      materialsSearch.addEventListener('input', function() {
        const clearBtn = this.parentElement.querySelector('.search-clear');
        if (clearBtn) {
          clearBtn.style.display = this.value ? 'block' : 'none';
        }
      });
    }

    // Vendors search enhancement
    const vendorsSearch = document.getElementById('vendors-search');
    if (vendorsSearch) {
      vendorsSearch.addEventListener('input', function() {
        const clearBtn = this.parentElement.querySelector('.search-clear');
        if (clearBtn) {
          clearBtn.style.display = this.value ? 'block' : 'none';
        }
      });
    }
  });

})();
