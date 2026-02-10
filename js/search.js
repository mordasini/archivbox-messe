// ==========================================
// SEARCH TAB
// ==========================================

const Search = {
  debounceTimer: null,

  init() {
    const container = document.getElementById('search-area');
    if (!container) return;

    container.innerHTML = `
      <div class="search-input-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" id="search-input"
          placeholder="Box-ID, Inhalt oder Abteilung…"
          autocomplete="off" autocapitalize="none"
          oninput="Search.onInput(this.value)">
        <button class="search-clear" id="search-clear" onclick="Search.clear()" style="display:none">✕</button>
      </div>
      <div id="search-results" class="search-results">
        <div class="search-empty">
          <div class="search-empty-icon">🔍</div>
          <div>Suchbegriff eingeben</div>
          <div class="search-empty-hint">z.B. «Jahresabschluss», «Finanzen» oder «DS-756»</div>
        </div>
      </div>
    `;

    // Focus input
    setTimeout(() => {
      const input = document.getElementById('search-input');
      if (input) input.focus();
    }, 100);
  },

  onInput(value) {
    clearTimeout(this.debounceTimer);

    const clearBtn = document.getElementById('search-clear');
    if (clearBtn) clearBtn.style.display = value.length > 0 ? 'flex' : 'none';

    this.debounceTimer = setTimeout(() => {
      this.doSearch(value);
    }, 150);
  },

  doSearch(query) {
    const results = searchBoxes(query);
    const container = document.getElementById('search-results');
    if (!container) return;

    if (!query || query.trim().length === 0) {
      container.innerHTML = `
        <div class="search-empty">
          <div class="search-empty-icon">🔍</div>
          <div>Suchbegriff eingeben</div>
          <div class="search-empty-hint">z.B. «Jahresabschluss», «Finanzen» oder «DS-756»</div>
        </div>
      `;
      return;
    }

    if (results.length === 0) {
      container.innerHTML = `
        <div class="search-empty">
          <div class="search-empty-icon">🤷</div>
          <div>Keine Ergebnisse für «${query}»</div>
          <div class="search-empty-hint">Versuchen Sie einen anderen Suchbegriff</div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="search-count">${results.length} ${results.length === 1 ? 'Ergebnis' : 'Ergebnisse'}</div>
      ${results.map(box => this.renderResult(box, query)).join('')}
    `;
  },

  renderResult(box, query) {
    const dept = DEPARTMENTS[box.department];
    const statusColor = STATUS_COLORS[box.status];

    return `
      <div class="search-result-card" onclick="App.showBoxDetail('${box.id}')">
        <div class="search-result-top">
          <span class="search-result-id">${this.highlight(box.id, query)}</span>
          <span class="status-dot-sm" style="background:${statusColor}" title="${STATUS_LABELS[box.status]}"></span>
        </div>
        <div class="search-result-label">${this.highlight(box.label, query)}</div>
        <div class="search-result-meta">
          <span class="dept-badge-sm" style="background:${dept.color}">${box.department}</span>
          <span class="search-result-pos">${positionString(box.position)}</span>
        </div>
      </div>
    `;
  },

  highlight(text, query) {
    if (!query || query.length < 2) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  },

  clear() {
    const input = document.getElementById('search-input');
    if (input) {
      input.value = '';
      input.focus();
    }
    const clearBtn = document.getElementById('search-clear');
    if (clearBtn) clearBtn.style.display = 'none';
    this.doSearch('');
  },
};
