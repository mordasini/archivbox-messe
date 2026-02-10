// ==========================================
// LIST VIEW TAB
// ==========================================

const ListView = {
  filter: { dept: 'all', status: 'all', rack: 'all' },
  selectedBoxes: new Set(),
  sortBy: 'id',

  init() {
    const container = document.getElementById('list-area');
    if (!container) return;
    this.render();
  },

  render() {
    const container = document.getElementById('list-area');
    const stats = getStats();

    container.innerHTML = `
      <div class="list-header">
        <div class="list-stats">
          <div class="list-stat">
            <span class="list-stat-num">${stats.used}</span>
            <span class="list-stat-label">/ ${stats.totalCapacity} Plätze</span>
          </div>
          <div class="list-stat-bar">
            <div class="list-stat-fill" style="width:${(stats.used/stats.totalCapacity*100)}%"></div>
          </div>
        </div>
      </div>

      <div class="list-filters">
        <select id="filter-dept" onchange="ListView.setFilter('dept', this.value)">
          <option value="all">Alle Abteilungen</option>
          ${Object.keys(DEPARTMENTS).map(d => `<option value="${d}" ${this.filter.dept === d ? 'selected' : ''}>${d}</option>`).join('')}
        </select>
        <select id="filter-status" onchange="ListView.setFilter('status', this.value)">
          <option value="all">Alle Status</option>
          ${Object.keys(STATUS_LABELS).map(s => `<option value="${s}" ${this.filter.status === s ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`).join('')}
        </select>
        <select id="filter-rack" onchange="ListView.setFilter('rack', this.value)">
          <option value="all">Alle Racks</option>
          ${Object.keys(DEPOT_CONFIG.racks).map(r => `<option value="${r}" ${this.filter.rack === r ? 'selected' : ''}>${r}${DEPOT_CONFIG.racks[r].isMesse ? ' (Messe)' : ''}</option>`).join('')}
        </select>
      </div>

      ${this.selectedBoxes.size > 0 ? this.renderBatchBar() : ''}

      <div id="list-items" class="list-items">
        ${this.renderItems()}
      </div>
    `;
  },

  renderItems() {
    let boxes = [...DEMO_BOXES];

    // Apply filters
    if (this.filter.dept !== 'all') boxes = boxes.filter(b => b.department === this.filter.dept);
    if (this.filter.status !== 'all') boxes = boxes.filter(b => b.status === this.filter.status);
    if (this.filter.rack !== 'all') boxes = boxes.filter(b => b.position.rack === this.filter.rack);

    // Sort
    boxes.sort((a, b) => a.id.localeCompare(b.id));

    if (boxes.length === 0) {
      return '<div class="list-empty">Keine Boxen mit diesen Filtern</div>';
    }

    return boxes.map(box => {
      const dept = DEPARTMENTS[box.department];
      const statusColor = STATUS_COLORS[box.status];
      const isSelected = this.selectedBoxes.has(box.id);

      return `
        <div class="list-item ${isSelected ? 'selected' : ''}" data-id="${box.id}">
          <div class="list-item-check" onclick="event.stopPropagation(); ListView.toggleSelect('${box.id}')">
            <div class="checkbox ${isSelected ? 'checked' : ''}">
              ${isSelected ? '✓' : ''}
            </div>
          </div>
          <div class="list-item-body" onclick="App.showBoxDetail('${box.id}')">
            <div class="list-item-top">
              <span class="list-item-id">${box.id}</span>
              <span class="status-dot-sm" style="background:${statusColor}"></span>
            </div>
            <div class="list-item-label">${box.label}</div>
            <div class="list-item-meta">
              <span class="dept-badge-sm" style="background:${dept.color}">${box.department}</span>
              <span class="list-item-pos">${positionString(box.position)}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderBatchBar() {
    return `
      <div class="batch-bar">
        <span class="batch-count">${this.selectedBoxes.size} ausgewählt</span>
        <div class="batch-actions">
          <button class="batch-btn" onclick="ListView.batchAction('status')">Status ändern</button>
          <button class="batch-btn" onclick="ListView.batchAction('dept')">Abteilung ändern</button>
          <button class="batch-btn batch-btn-danger" onclick="ListView.batchAction('entsorgung')">Zur Entsorgung</button>
          <button class="batch-btn-clear" onclick="ListView.clearSelection()">✕</button>
        </div>
      </div>
    `;
  },

  setFilter(key, value) {
    this.filter[key] = value;
    this.render();
  },

  toggleSelect(id) {
    if (this.selectedBoxes.has(id)) {
      this.selectedBoxes.delete(id);
    } else {
      this.selectedBoxes.add(id);
    }
    this.render();
  },

  clearSelection() {
    this.selectedBoxes.clear();
    this.render();
  },

  batchAction(action) {
    const count = this.selectedBoxes.size;
    let message = '';

    switch (action) {
      case 'status':
        message = `Status von ${count} Boxen würde geändert (Demo)`;
        break;
      case 'dept':
        message = `Abteilung von ${count} Boxen würde geändert (Demo)`;
        break;
      case 'entsorgung':
        // Actually update status in demo data
        this.selectedBoxes.forEach(id => {
          const box = findBoxById(id);
          if (box) box.status = 'zur_entsorgung';
        });
        message = `${count} Boxen als «Zur Entsorgung» markiert`;
        break;
    }

    this.selectedBoxes.clear();
    this.render();

    // Show toast
    showToast(message);
  },
};

// Simple toast notification
function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2500);
}
