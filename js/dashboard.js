// ==========================================
// DASHBOARD - ArchivBox Manager v2
// ==========================================

const Dashboard = {
  init() {
    this.updateStats();
    this.renderAlerts();
    this.renderHitlist();
  },

  updateStats() {
    const stats = getStats();
    
    const totalEl = document.getElementById('stat-total');
    const requestedEl = document.getElementById('stat-requested');
    const disposalEl = document.getElementById('stat-disposal');
    const deptsEl = document.getElementById('stat-departments');
    
    if (totalEl) totalEl.textContent = stats.total.toLocaleString('de-CH');
    if (requestedEl) requestedEl.textContent = stats.requested;
    if (disposalEl) disposalEl.textContent = stats.disposal;
    if (deptsEl) deptsEl.textContent = stats.departments;
    
    // Update notification badge
    const badge = document.getElementById('notification-count');
    if (badge) {
      const alerts = stats.disposal + stats.requested;
      badge.textContent = alerts;
      badge.style.display = alerts > 0 ? 'flex' : 'none';
    }
  },

  renderAlerts() {
    const container = document.getElementById('alert-list');
    if (!container) return;

    const disposalBoxes = getBoxesForDisposal();
    const requestedBoxes = getRequestedBoxes();
    const topBoxes = getTopAccessedBoxes(1);

    let html = '';

    // Disposal alert
    if (disposalBoxes.length > 0) {
      html += `
        <div class="alert-item danger" onclick="App.showDisposalAudit()">
          <div class="alert-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </div>
          <div class="alert-content">
            <div class="alert-title">Entsorgung fällig</div>
            <div class="alert-subtitle">${disposalBoxes.length} Boxen warten auf Freigabe</div>
          </div>
          <div class="alert-badge">${disposalBoxes.length}</div>
        </div>
      `;
    }

    // Requested alert
    if (requestedBoxes.length > 0) {
      html += `
        <div class="alert-item warning" onclick="App.showRequested()">
          <div class="alert-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <div class="alert-content">
            <div class="alert-title">Anforderungen</div>
            <div class="alert-subtitle">${requestedBoxes.length} Boxen zur Abholung bereit</div>
          </div>
          <div class="alert-badge">${requestedBoxes.length}</div>
        </div>
      `;
    }

    // Top accessed info
    if (topBoxes.length > 0 && topBoxes[0].accessCount > 10) {
      const top = topBoxes[0];
      html += `
        <div class="alert-item success" onclick="App.showBoxDetail('${top.id}')">
          <div class="alert-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 3v18h18"/>
              <path d="M18 17V9"/>
              <path d="M13 17V5"/>
              <path d="M8 17v-3"/>
            </svg>
          </div>
          <div class="alert-content">
            <div class="alert-title">Häufigster Zugriff</div>
            <div class="alert-subtitle">${top.label}</div>
          </div>
          <div class="alert-badge">${top.accessCount}x</div>
        </div>
      `;
    }

    if (html === '') {
      html = '<div class="text-center text-muted" style="padding: 20px;">Keine offenen Aufgaben</div>';
    }

    container.innerHTML = html;
  },

  renderHitlist() {
    const container = document.getElementById('hitlist');
    if (!container) return;

    const topBoxes = getTopAccessedBoxes(5);

    if (topBoxes.length === 0 || topBoxes[0].accessCount === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--gray-400);">Keine Zugriffsdaten</div>';
      return;
    }

    container.innerHTML = topBoxes.map((box, i) => {
      const pos = box.position;
      return `
      <div class="hitlist-item" onclick="App.showBoxDetail('${box.id}')">
        <div class="result-rst">
          <span class="r">R${pos.rack.replace('R','')}</span>
          S${String(pos.shelf).padStart(2,'0')} T${String(pos.tray).padStart(2,'0')}
        </div>
        <div class="hitlist-content">
          <div class="hitlist-id">${box.id}</div>
          <div class="hitlist-label">${box.label}</div>
        </div>
        <div class="hitlist-count">${box.accessCount}x</div>
      </div>
    `;
    }).join('');
  },
};
