// ==========================================
// APP SHELL - Tab Navigation & Routing
// ==========================================

const App = {
  currentTab: 'scan',
  currentBoxId: null,
  history: [],

  tabs: {
    scan:   { icon: '📷', label: 'Scan',    init: () => Scanner.init() },
    search: { icon: '🔍', label: 'Suche',   init: () => Search.init() },
    view3d: { icon: '🏗', label: '3D',       init: () => View3D.init() },
    list:   { icon: '📋', label: 'Liste',   init: () => ListView.init() },
  },

  init() {
    this.renderTabBar();
    this.switchTab('scan');
  },

  renderTabBar() {
    const bar = document.getElementById('tab-bar');
    bar.innerHTML = '';
    for (const [key, tab] of Object.entries(this.tabs)) {
      const btn = document.createElement('button');
      btn.className = `tab-btn ${key === this.currentTab ? 'active' : ''}`;
      btn.dataset.tab = key;
      btn.innerHTML = `
        <span class="tab-icon">${tab.icon}</span>
        <span class="tab-label">${tab.label}</span>
      `;
      btn.addEventListener('click', () => this.switchTab(key));
      bar.appendChild(btn);
    }
  },

  switchTab(tabKey) {
    if (this.currentTab === tabKey && !this.currentBoxId) return;

    this.currentTab = tabKey;
    this.currentBoxId = null;

    // Update tab bar
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabKey);
    });

    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    // Show target view
    const view = document.getElementById(`view-${tabKey}`);
    if (view) {
      view.classList.add('active');
    }

    // Hide detail if showing
    this.hideDetail();

    // Init tab
    if (this.tabs[tabKey] && this.tabs[tabKey].init) {
      this.tabs[tabKey].init();
    }

    // 3D needs resize after becoming visible
    if (tabKey === 'view3d' && View3D.initialized) {
      requestAnimationFrame(() => View3D.onResize());
    }
  },

  showBoxDetail(boxId) {
    const box = findBoxById(boxId);
    if (!box) return;

    this.currentBoxId = boxId;
    this.history.push(this.currentTab);
    BoxDetail.render(box);

    document.getElementById('view-detail').classList.add('active');
    // Don't hide current tab view - detail overlays it
  },

  hideDetail() {
    document.getElementById('view-detail').classList.remove('active');
    this.currentBoxId = null;
  },

  goBack() {
    this.hideDetail();
  },
};

// ==========================================
// BOX DETAIL VIEW
// ==========================================

const BoxDetail = {
  render(box) {
    const el = document.getElementById('detail-content');
    const dept = DEPARTMENTS[box.department];
    const statusColor = STATUS_COLORS[box.status];
    const statusLabel = STATUS_LABELS[box.status];

    el.innerHTML = `
      <div class="detail-header">
        <button class="detail-back" onclick="App.goBack()">
          <span>←</span> Zurück
        </button>
        <div class="detail-id">${box.id}</div>
      </div>

      <div class="detail-body">
        <div class="detail-status" style="--status-color: ${statusColor}">
          <span class="status-dot" style="background: ${statusColor}"></span>
          ${statusLabel}
        </div>

        <div class="detail-section">
          <div class="detail-label">Position</div>
          <div class="detail-value detail-position">
            <span class="pos-tag">${box.position.rack}</span>
            <span class="pos-sep">·</span>
            <span class="pos-tag">Ebene ${box.position.shelf}</span>
            <span class="pos-sep">·</span>
            <span class="pos-tag">Platz ${box.position.tray}</span>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-label">Abteilung</div>
          <div class="detail-value">
            <span class="dept-badge" style="background: ${dept.color}">${box.department}</span>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-label">Bezeichnung</div>
          <div class="detail-value detail-title">${box.label}</div>
        </div>

        <div class="detail-section">
          <div class="detail-label">Inhalt</div>
          <div class="detail-value">
            <ul class="detail-contents">
              ${box.contents.map(c => `<li>${c}</li>`).join('')}
            </ul>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-section">
            <div class="detail-label">Eingelagert seit</div>
            <div class="detail-value">${formatDate(box.storedSince)}</div>
          </div>
          <div class="detail-section">
            <div class="detail-label">Aufbewahren bis</div>
            <div class="detail-value detail-retention ${box.status === 'zur_entsorgung' ? 'expired' : ''}">${formatDate(box.retentionUntil)}</div>
          </div>
        </div>

        ${box.photos && box.photos.length > 0 ? `
          <div class="detail-section">
            <div class="detail-label">Fotos</div>
            <div class="detail-photos">
              ${box.photos.map(p => `<div class="detail-photo"><img src="${p.url}" alt="${p.type}"></div>`).join('')}
            </div>
          </div>
        ` : `
          <div class="detail-section">
            <div class="detail-label">Fotos</div>
            <div class="detail-value detail-no-photos">Keine Fotos vorhanden</div>
          </div>
        `}

        <div class="detail-section detail-meta">
          <div class="detail-label">Box-ID (QR)</div>
          <div class="detail-qr-display">${box.id}</div>
        </div>
      </div>
    `;
  }
};
