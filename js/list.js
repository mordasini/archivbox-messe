// ==========================================
// LIST VIEW - ArchivBox Manager v2
// ==========================================

const List = {
  sortBy: 'id',
  selectedBoxes: new Set(),

  init() {
    this.render();
    
    const sortSelect = document.getElementById('list-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        this.sortBy = sortSelect.value;
        this.render();
      });
    }
  },

  render() {
    const container = document.getElementById('box-list');
    const countEl = document.getElementById('list-count');
    if (!container) return;

    let boxes = [...getBoxes()];

    // Sort
    switch (this.sortBy) {
      case 'id':
        boxes.sort((a, b) => a.id.localeCompare(b.id));
        break;
      case 'date':
        boxes.sort((a, b) => b.storedSince.localeCompare(a.storedSince));
        break;
      case 'department':
        boxes.sort((a, b) => a.department.localeCompare(b.department));
        break;
      case 'status':
        boxes.sort((a, b) => a.status.localeCompare(b.status));
        break;
    }

    if (countEl) {
      countEl.textContent = `${boxes.length} Boxen`;
    }

    container.innerHTML = boxes.map(box => {
      const dept = DEPARTMENTS[box.department];
      const pos = box.position;
      
      return `
        <div class="box-list-item" onclick="List.onItemClick(event, '${box.id}')">
          <div class="box-rst-badge">
            <span class="r">R${pos.rack.replace('R','')}</span>
            <span class="st">S${String(pos.shelf).padStart(2,'0')} T${String(pos.tray).padStart(2,'0')}</span>
          </div>
          <div class="box-list-content">
            <div class="box-list-id">${box.id}</div>
            <div class="box-list-label">${box.label}</div>
            <div class="box-list-meta">
              <span class="box-list-dept" style="background: ${dept.color};">${box.department}</span>
              <span class="status-dot ${box.status}"></span>
            </div>
          </div>
          <div class="box-list-actions">
            <button class="box-action-btn" onclick="event.stopPropagation(); App.showBoxIn3D('${box.id}')" title="In 3D zeigen">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  onItemClick(event, boxId) {
    // If clicking on checkbox area, don't open detail
    if (event.target.closest('.box-list-checkbox')) return;
    App.showBoxDetail(boxId);
  },

  toggleSelect(boxId) {
    if (this.selectedBoxes.has(boxId)) {
      this.selectedBoxes.delete(boxId);
    } else {
      this.selectedBoxes.add(boxId);
    }
    this.render();
    this.updateBulkActions();
  },

  selectAll() {
    getBoxes().forEach(box => this.selectedBoxes.add(box.id));
    this.render();
    this.updateBulkActions();
  },

  selectNone() {
    this.selectedBoxes.clear();
    this.render();
    this.updateBulkActions();
  },

  updateBulkActions() {
    // Could show a floating action bar when items are selected
    const count = this.selectedBoxes.size;
    if (count > 0) {
      console.log(`${count} Boxen ausgewählt`);
    }
  },

  getSelectedBoxes() {
    return Array.from(this.selectedBoxes).map(id => findBoxById(id)).filter(Boolean);
  },
};
