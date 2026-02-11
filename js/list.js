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
      const isSelected = this.selectedBoxes.has(box.id);
      
      return `
        <div class="box-list-item" onclick="List.onItemClick(event, '${box.id}')">
          <div class="box-list-checkbox ${isSelected ? 'checked' : ''}" onclick="event.stopPropagation(); List.toggleSelect('${box.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div class="box-dept-indicator" style="background: ${dept.color};"></div>
          <div class="box-list-content">
            <div class="box-list-id">${box.id}</div>
            <div class="box-list-label">${box.label}</div>
            <div class="box-list-meta">${box.department} · ${positionString(box.position)}</div>
          </div>
          <div class="box-list-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
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
