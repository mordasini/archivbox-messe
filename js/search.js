// ==========================================
// SEARCH - ArchivBox Manager v2
// ==========================================

const Search = {
  currentFilter: 'all',
  debounceTimer: null,

  init() {
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear');
    
    if (input) {
      input.addEventListener('input', () => this.onInput());
      input.addEventListener('focus', () => this.onFocus());
    }
    
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearSearch());
    }

    // Filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => this.setFilter(chip.dataset.filter));
    });
  },

  onInput() {
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear');
    const query = input?.value || '';
    
    if (clearBtn) {
      clearBtn.style.display = query.length > 0 ? 'flex' : 'none';
    }

    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.doSearch(query), 150);
  },

  onFocus() {
    const input = document.getElementById('search-input');
    if (input && !input.value) {
      this.showRecentOrSuggestions();
    }
  },

  clearSearch() {
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear');
    
    if (input) input.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    
    this.showRecentOrSuggestions();
  },

  setFilter(filter) {
    this.currentFilter = filter;
    
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.filter === filter);
    });

    const input = document.getElementById('search-input');
    const query = input?.value || '';
    
    if (query || filter !== 'all') {
      this.doSearch(query);
    }
  },

  doSearch(query) {
    const results = document.getElementById('search-results');
    if (!results) return;

    let boxes = [];
    
    if (query.trim()) {
      boxes = searchBoxes(query);
    } else if (this.currentFilter !== 'all') {
      boxes = findBoxesByStatus(this.currentFilter);
    }

    // Apply filter
    if (this.currentFilter !== 'all' && query.trim()) {
      boxes = boxes.filter(b => b.status === this.currentFilter);
    }

    if (boxes.length === 0 && !query.trim() && this.currentFilter === 'all') {
      this.showRecentOrSuggestions();
      return;
    }

    if (boxes.length === 0) {
      results.innerHTML = `
        <div class="search-hint">Keine Ergebnisse gefunden</div>
      `;
      return;
    }

    results.innerHTML = boxes.slice(0, 50).map(box => {
      const dept = DEPARTMENTS[box.department];
      const status = STATUSES[box.status];
      const pos = box.position;
      
      return `
        <div class="search-result-item" onclick="App.showBoxDetail('${box.id}')">
          <div class="result-rst">
            <span class="r">R${pos.rack.replace('R','')}</span>
            S${String(pos.shelf).padStart(2,'0')}
          </div>
          <div class="result-content">
            <div class="result-id">${box.id}</div>
            <div class="result-label">${box.label}</div>
            <div class="result-meta">
              <span class="status-dot ${box.status}"></span>
              ${box.department}
            </div>
          </div>
          <div class="result-dept" style="background: ${dept.color};"></div>
        </div>
      `;
    }).join('');

    if (boxes.length > 50) {
      results.innerHTML += `
        <div class="search-hint">+ ${boxes.length - 50} weitere Ergebnisse</div>
      `;
    }
  },

  showRecentOrSuggestions() {
    const results = document.getElementById('search-results');
    if (!results) return;

    // Show department stats as quick filters
    const deptStats = {};
    getBoxes().forEach(box => {
      deptStats[box.department] = (deptStats[box.department] || 0) + 1;
    });

    results.innerHTML = `
      <div class="search-hint">Suchbegriff eingeben oder Abteilung wählen</div>
      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 16px;">
        ${Object.entries(deptStats).map(([dept, count]) => {
          const deptInfo = DEPARTMENTS[dept];
          return `
            <div class="search-result-item" onclick="Search.searchDepartment('${dept}')">
              <div class="result-dept-bar" style="background: ${deptInfo.color};"></div>
              <div class="result-content">
                <div class="result-label">${dept}</div>
                <div class="result-meta">${count} Boxen</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  searchDepartment(dept) {
    const input = document.getElementById('search-input');
    if (input) {
      input.value = dept;
      this.doSearch(dept);
    }
  },
};
