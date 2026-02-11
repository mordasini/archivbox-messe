// ==========================================
// APP CONTROLLER - ArchivBox Manager v2
// ==========================================

const App = {
  currentTab: 'dashboard',
  initialized: false,

  init() {
    if (this.initialized) return;
    this.initialized = true;

    // Initialize data
    getBoxes();

    // Initialize modules
    Dashboard.init();
    Search.init();
    List.init();

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    // Window resize
    window.addEventListener('resize', () => this.onResize());

    console.log('ArchivBox Manager v2 initialized');
  },

  switchTab(tabId) {
    if (this.currentTab === tabId) return;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabId}`);
    });

    // Stop scanner when leaving scan tab
    if (this.currentTab === 'scan') {
      Scanner.stop();
    }

    this.currentTab = tabId;

    // Initialize tab-specific content
    switch (tabId) {
      case 'scan':
        Scanner.init();
        break;
      case 'view3d':
        View3D.init();
        break;
      case 'list':
        List.render();
        break;
      case 'dashboard':
        Dashboard.updateStats();
        break;
    }
  },

  onResize() {
    if (this.currentTab === 'view3d') {
      View3D.onResize();
    }
  },

  // Modal shortcuts
  showBoxDetail(boxId) {
    Modals.showBoxDetail(boxId);
  },

  closeModal() {
    Modals.close();
  },

  showDisposalAudit() {
    Modals.showDisposalAudit();
  },

  showEmergencyMode() {
    Modals.showEmergencyMode();
  },

  showBulkEdit() {
    Modals.showBulkEdit();
  },

  showHitlist() {
    Modals.showHitlist();
  },

  showRequested() {
    Modals.showRequested();
  },

  showAllAlerts() {
    // Could show a dedicated alerts view
    console.log('Show all alerts');
  },
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
