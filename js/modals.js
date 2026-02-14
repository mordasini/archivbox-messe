// ==========================================
// MODALS - ArchivBox Manager v2
// ==========================================

const Modals = {
  signaturePad: null,

  // Generic modal functions
  show(content) {
    const container = document.getElementById('modal-container');
    const contentEl = document.getElementById('modal-content');
    if (container && contentEl) {
      contentEl.innerHTML = content;
      container.classList.remove('hidden');
      
      // Initialize signature pad if present
      const canvas = document.getElementById('signature-canvas');
      if (canvas) {
        this.signaturePad = new SignaturePad(canvas, {
          backgroundColor: 'rgb(255, 255, 255)',
          penColor: 'rgb(0, 0, 0)',
        });
        this.resizeSignatureCanvas();
      }
    }
  },

  close() {
    const container = document.getElementById('modal-container');
    if (container) {
      container.classList.add('hidden');
    }
    if (this.signaturePad) {
      this.signaturePad = null;
    }
  },

  resizeSignatureCanvas() {
    const canvas = document.getElementById('signature-canvas');
    if (canvas && this.signaturePad) {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d').scale(ratio, ratio);
      this.signaturePad.clear();
    }
  },

  clearSignature() {
    if (this.signaturePad) {
      this.signaturePad.clear();
    }
  },

  // Box Detail Modal
  showBoxDetail(boxId) {
    const box = findBoxById(boxId);
    if (!box) return;

    const dept = DEPARTMENTS[box.department];
    const status = STATUSES[box.status];
    const pos = box.position;

    this.show(`
      <div class="modal-header">
        <div class="modal-title">${box.label}</div>
        <button class="modal-close" onclick="App.closeModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <!-- RST Hero Display -->
        <div class="box-detail-rst">
          <div class="rst-label">Standort</div>
          <div class="rst-code">
            <span class="rack">R${pos.rack.replace('R','')}</span><span class="sep"> / </span>S${String(pos.shelf).padStart(2,'0')}<span class="sep"> / </span>T${String(pos.tray).padStart(2,'0')}
          </div>
          <div class="rst-box-id">${box.id}</div>
        </div>

        <div style="display: flex; gap: 8px; margin-bottom: 20px;">
          <span class="status-badge ${box.status}">
            <span class="status-dot ${box.status}"></span>
            ${status.label}
          </span>
          <span class="dept-badge" style="background: ${dept.color};">${box.department}</span>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
          <div class="form-group" style="margin-bottom: 0;">
            <div class="form-label">Eingelagert</div>
            <div style="font-size: 15px; font-weight: 500;">${formatDate(box.storedSince)}</div>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <div class="form-label">Aufbewahren bis</div>
            <div style="font-size: 15px; font-weight: 500;">${formatDate(box.retentionUntil)}</div>
          </div>
        </div>
        
        <div class="form-group">
          <div class="form-label">Zugriffe</div>
          <div style="font-size: 15px;">${box.accessCount}x ${box.lastAccessed ? '(zuletzt ' + formatDate(box.lastAccessed) + ')' : ''}</div>
        </div>
        
        <div class="form-group">
          <div class="form-label">Inhalt</div>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            ${box.contents.map(c => `<div style="font-size: 14px; padding: 8px 0; border-bottom: 1px solid var(--gray-200);">${c}</div>`).join('')}
          </div>
        </div>
        
        <div class="form-group">
          <div class="form-label">Fotos</div>
          <div class="photo-grid">
            ${box.photos.map(p => `<div class="photo-item"><img src="${p}" alt=""></div>`).join('')}
            <div class="photo-item add" onclick="Modals.addPhoto('${box.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="form-group">
          <div class="form-label">Verlauf</div>
          <div class="timeline">
            <div class="timeline-item">
              <div class="timeline-dot"></div>
              <div class="timeline-date">${formatDate(box.storedSince)}</div>
              <div class="timeline-text">Eingelagert</div>
            </div>
            ${box.lastAccessed ? `
            <div class="timeline-item">
              <div class="timeline-dot"></div>
              <div class="timeline-date">${formatDate(box.lastAccessed)}</div>
              <div class="timeline-text">Letzter Zugriff</div>
            </div>
            ` : ''}
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.showBoxIn3D('${box.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
          </svg>
          3D
        </button>
        <button class="btn btn-primary" style="flex: 1;" onclick="Modals.editBox('${box.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>
          </svg>
          Bearbeiten
        </button>
      </div>
    `);
  },

  addPhoto(boxId) {
    alert('Foto-Upload wird implementiert');
  },

  editBox(boxId) {
    const box = findBoxById(boxId);
    if (!box) return;

    this.show(`
      <div class="modal-header">
        <div class="modal-title">Box bearbeiten</div>
        <button class="modal-close" onclick="App.closeModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Box-ID</label>
          <input type="text" class="form-input" value="${box.id}" disabled>
        </div>
        
        <div class="form-group">
          <label class="form-label">Bezeichnung</label>
          <input type="text" class="form-input" id="edit-label" value="${box.label}">
        </div>
        
        <div class="form-group">
          <label class="form-label">Abteilung</label>
          <select class="form-select" id="edit-department">
            ${Object.keys(DEPARTMENTS).map(d => `
              <option value="${d}" ${d === box.department ? 'selected' : ''}>${d}</option>
            `).join('')}
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" id="edit-status">
            ${Object.entries(STATUSES).map(([key, val]) => `
              <option value="${key}" ${key === box.status ? 'selected' : ''}>${val.label}</option>
            `).join('')}
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label">Notizen</label>
          <textarea class="form-textarea" id="edit-notes" placeholder="Interne Notizen...">${box.notes || ''}</textarea>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modals.showBoxDetail('${box.id}')">Abbrechen</button>
        <button class="btn btn-primary" onclick="Modals.saveBox('${box.id}')">Speichern</button>
      </div>
    `);
  },

  saveBox(boxId) {
    const box = findBoxById(boxId);
    if (!box) return;

    const label = document.getElementById('edit-label')?.value;
    const department = document.getElementById('edit-department')?.value;
    const status = document.getElementById('edit-status')?.value;
    const notes = document.getElementById('edit-notes')?.value;

    if (label) box.label = label;
    if (department) box.department = department;
    if (status) box.status = status;
    if (notes !== undefined) box.notes = notes;

    Dashboard.updateStats();
    Dashboard.renderAlerts();
    Dashboard.renderHitlist();
    
    this.showBoxDetail(boxId);
  },

  // Disposal Audit Modal
  showDisposalAudit() {
    const boxes = getBoxesForDisposal();

    this.show(`
      <div class="modal-header">
        <div class="modal-title">Entsorgungsfreigabe</div>
        <button class="modal-close" onclick="App.closeModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <p style="margin-bottom: 16px; color: var(--gray-600);">
          ${boxes.length} Boxen sind zur Entsorgung markiert. Bitte prüfen und mit Unterschrift bestätigen.
        </p>
        
        <div style="max-height: 200px; overflow-y: auto; margin-bottom: 20px;">
          ${boxes.slice(0, 10).map(box => `
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--gray-200);">
              <div>
                <div style="font-size: 12px; font-family: monospace; color: var(--gray-600);">${box.id}</div>
                <div style="font-size: 14px;">${box.label}</div>
              </div>
              <div style="font-size: 12px; color: var(--gray-500);">bis ${formatDate(box.retentionUntil)}</div>
            </div>
          `).join('')}
          ${boxes.length > 10 ? `<div style="padding: 10px; text-align: center; color: var(--gray-500);">+ ${boxes.length - 10} weitere</div>` : ''}
        </div>
        
        <div class="form-group">
          <label class="form-label">Freigabe durch</label>
          <input type="text" class="form-input" id="audit-name" placeholder="Vor- und Nachname">
        </div>
        
        <div class="form-group">
          <label class="form-label">Unterschrift</label>
          <div class="signature-wrapper">
            <canvas id="signature-canvas" class="signature-pad"></canvas>
            <div class="signature-actions">
              <button class="signature-clear" onclick="Modals.clearSignature()">Löschen</button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Abbrechen</button>
        <button class="btn btn-danger" onclick="Modals.confirmDisposal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18"/>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
          Entsorgung freigeben
        </button>
      </div>
    `);
  },

  confirmDisposal() {
    const name = document.getElementById('audit-name')?.value?.trim();
    
    if (!name) {
      alert('Bitte Namen eingeben');
      return;
    }
    
    if (!this.signaturePad || this.signaturePad.isEmpty()) {
      alert('Bitte unterschreiben');
      return;
    }

    const signatureData = this.signaturePad.toDataURL();
    const boxes = getBoxesForDisposal();
    
    boxes.forEach(box => {
      box.status = 'entsorgt';
    });

    alert(`${boxes.length} Boxen wurden zur Entsorgung freigegeben.\nProtokolliert für: ${name}`);
    
    Dashboard.updateStats();
    Dashboard.renderAlerts();
    App.closeModal();
  },

  // Emergency Mode Modal
  showEmergencyMode() {
    this.show(`
      <div class="modal-header" style="background: var(--danger); color: white; border: none;">
        <div class="modal-title" style="color: white; display: flex; align-items: center; gap: 8px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Notfall-Inventarisierung
        </div>
        <button class="modal-close" onclick="App.closeModal()" style="color: white;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <p style="margin-bottom: 20px; color: var(--gray-700);">
          Schnellerfassung bei Wasserschaden oder anderen Notfällen. Daten werden für Export an DocuSave vorbereitet.
        </p>
        
        <div class="form-group">
          <label class="form-label">Schadensort</label>
          <select class="form-select" id="emergency-location">
            <option value="">Bitte wählen...</option>
            ${Object.keys(DEPOT_CONFIG.racks).map(r => `
              <option value="${r}">${r} – ${DEPOT_CONFIG.racks[r].isMesse ? 'Messe' : 'Lager'}</option>
            `).join('')}
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label">Schadensart</label>
          <select class="form-select" id="emergency-type">
            <option value="water">Wasserschaden</option>
            <option value="fire">Brandschaden</option>
            <option value="mold">Schimmelbefall</option>
            <option value="other">Anderer Schaden</option>
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label">Beschreibung</label>
          <textarea class="form-textarea" id="emergency-description" placeholder="Kurze Beschreibung des Schadens..."></textarea>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Abbrechen</button>
        <button class="btn btn-primary" onclick="Modals.startEmergencyScan()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
            <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
            <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
            <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
          </svg>
          Boxen scannen
        </button>
      </div>
    `);
  },

  startEmergencyScan() {
    const location = document.getElementById('emergency-location')?.value;
    if (!location) {
      alert('Bitte Schadensort wählen');
      return;
    }

    window.emergencyContext = {
      location: location,
      type: document.getElementById('emergency-type')?.value,
      description: document.getElementById('emergency-description')?.value,
      boxes: [],
      timestamp: new Date().toISOString(),
    };

    App.closeModal();
    App.switchTab('scan');
    Scanner.setEmergencyMode(true);
  },

  addEmergencyBox(boxId) {
    if (!window.emergencyContext) return;
    
    const box = findBoxById(boxId);
    if (box && !window.emergencyContext.boxes.includes(boxId)) {
      window.emergencyContext.boxes.push(boxId);
    }
  },

  exportEmergencyData() {
    if (!window.emergencyContext || window.emergencyContext.boxes.length === 0) {
      alert('Keine Boxen erfasst');
      return;
    }

    const data = {
      ...window.emergencyContext,
      exportedAt: new Date().toISOString(),
      boxDetails: window.emergencyContext.boxes.map(id => findBoxById(id)),
    };

    const csv = this.generateEmergencyCSV(data);
    this.downloadCSV(csv, `notfall-export-${new Date().toISOString().split('T')[0]}.csv`);

    window.emergencyContext = null;
    Scanner.setEmergencyMode(false);
  },

  generateEmergencyCSV(data) {
    const headers = ['Box-ID', 'Bezeichnung', 'Abteilung', 'Standort', 'Status', 'Schadensart', 'Erfasst'];
    const rows = data.boxDetails.map(box => [
      box.id,
      box.label,
      box.department,
      positionString(box.position),
      box.status,
      data.type,
      data.timestamp,
    ]);
    
    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  },

  downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  },

  // Bulk Edit Modal
  showBulkEdit() {
    this.show(`
      <div class="modal-header">
        <div class="modal-title">Massenbearbeitung</div>
        <button class="modal-close" onclick="App.closeModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <p style="margin-bottom: 20px; color: var(--gray-600);">
          Wählen Sie Boxen nach Kriterien aus und ändern Sie diese gemeinsam.
        </p>
        
        <div class="form-group">
          <label class="form-label">Boxen auswählen nach</label>
          <select class="form-select" id="bulk-select-by" onchange="Modals.updateBulkSelection()">
            <option value="">Bitte wählen...</option>
            <option value="department">Abteilung</option>
            <option value="status">Status</option>
            <option value="rack">Rack</option>
            <option value="retention">Aufbewahrungsfrist abgelaufen</option>
          </select>
        </div>
        
        <div id="bulk-select-value" class="form-group" style="display: none;">
          <label class="form-label">Wert</label>
          <select class="form-select" id="bulk-value"></select>
        </div>
        
        <div id="bulk-preview" style="display: none; margin-bottom: 20px;">
          <div class="form-label">Ausgewählt: <span id="bulk-count">0</span> Boxen</div>
          <div id="bulk-preview-list" style="max-height: 120px; overflow-y: auto; background: var(--gray-100); border-radius: var(--radius-md); padding: 8px; font-size: 13px;"></div>
        </div>
        
        <div id="bulk-actions" style="display: none; border-top: 1px solid var(--gray-200); padding-top: 20px;">
          <div class="form-group">
            <label class="form-label">Aktion</label>
            <select class="form-select" id="bulk-action" onchange="Modals.updateBulkAction()">
              <option value="">Bitte wählen...</option>
              <option value="status">Status ändern</option>
              <option value="department">Abteilung ändern</option>
              <option value="mark_disposal">Zur Entsorgung markieren</option>
            </select>
          </div>
          
          <div id="bulk-action-value" class="form-group" style="display: none;">
            <label class="form-label">Neuer Wert</label>
            <select class="form-select" id="bulk-new-value"></select>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Abbrechen</button>
        <button class="btn btn-primary" id="bulk-apply-btn" onclick="Modals.applyBulkEdit()" disabled>Änderungen anwenden</button>
      </div>
    `);
  },

  updateBulkSelection() {
    const selectBy = document.getElementById('bulk-select-by')?.value;
    const valueContainer = document.getElementById('bulk-select-value');
    const valueSelect = document.getElementById('bulk-value');
    const preview = document.getElementById('bulk-preview');
    const actions = document.getElementById('bulk-actions');
    
    if (!selectBy) {
      valueContainer.style.display = 'none';
      preview.style.display = 'none';
      actions.style.display = 'none';
      return;
    }

    valueContainer.style.display = 'block';
    
    let options = '';
    switch (selectBy) {
      case 'department':
        options = Object.keys(DEPARTMENTS).map(d => `<option value="${d}">${d}</option>`).join('');
        break;
      case 'status':
        options = Object.entries(STATUSES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
        break;
      case 'rack':
        options = Object.keys(DEPOT_CONFIG.racks).map(r => `<option value="${r}">${r}</option>`).join('');
        break;
      case 'retention':
        valueContainer.style.display = 'none';
        this.showBulkPreview('retention', null);
        return;
    }
    
    valueSelect.innerHTML = `<option value="">Bitte wählen...</option>${options}`;
    valueSelect.onchange = () => this.showBulkPreview(selectBy, valueSelect.value);
  },

  showBulkPreview(selectBy, value) {
    let boxes = [];
    
    switch (selectBy) {
      case 'department':
        boxes = value ? findBoxesByDepartment(value) : [];
        break;
      case 'status':
        boxes = value ? findBoxesByStatus(value) : [];
        break;
      case 'rack':
        boxes = value ? getBoxes().filter(b => b.position.rack === value) : [];
        break;
      case 'retention':
        const today = new Date().toISOString().split('T')[0];
        boxes = getBoxes().filter(b => b.retentionUntil < today);
        break;
    }

    window.bulkSelectedBoxes = boxes;
    
    const preview = document.getElementById('bulk-preview');
    const count = document.getElementById('bulk-count');
    const list = document.getElementById('bulk-preview-list');
    const actions = document.getElementById('bulk-actions');
    const applyBtn = document.getElementById('bulk-apply-btn');
    
    if (boxes.length > 0) {
      preview.style.display = 'block';
      actions.style.display = 'block';
      count.textContent = boxes.length;
      list.innerHTML = boxes.slice(0, 10).map(b => `${b.id} – ${b.label}`).join('<br>');
      if (boxes.length > 10) {
        list.innerHTML += `<br><em>+ ${boxes.length - 10} weitere...</em>`;
      }
    } else {
      preview.style.display = 'none';
      actions.style.display = 'none';
    }
    
    applyBtn.disabled = boxes.length === 0;
  },

  updateBulkAction() {
    const action = document.getElementById('bulk-action')?.value;
    const valueContainer = document.getElementById('bulk-action-value');
    const valueSelect = document.getElementById('bulk-new-value');
    
    if (!action || action === 'mark_disposal') {
      valueContainer.style.display = 'none';
      return;
    }

    valueContainer.style.display = 'block';
    
    let options = '';
    switch (action) {
      case 'status':
        options = Object.entries(STATUSES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
        break;
      case 'department':
        options = Object.keys(DEPARTMENTS).map(d => `<option value="${d}">${d}</option>`).join('');
        break;
    }
    
    valueSelect.innerHTML = options;
  },

  applyBulkEdit() {
    const boxes = window.bulkSelectedBoxes;
    if (!boxes || boxes.length === 0) return;
    
    const action = document.getElementById('bulk-action')?.value;
    const newValue = document.getElementById('bulk-new-value')?.value;
    
    if (!action) {
      alert('Bitte Aktion wählen');
      return;
    }

    let changed = 0;
    boxes.forEach(box => {
      switch (action) {
        case 'status':
          if (newValue) { box.status = newValue; changed++; }
          break;
        case 'department':
          if (newValue) { box.department = newValue; changed++; }
          break;
        case 'mark_disposal':
          box.status = 'zur_entsorgung';
          changed++;
          break;
      }
    });

    alert(`${changed} Boxen wurden geändert`);
    
    Dashboard.updateStats();
    Dashboard.renderAlerts();
    App.closeModal();
  },

  // Hitlist Modal
  showHitlist() {
    const topBoxes = getTopAccessedBoxes(20);
    
    this.show(`
      <div class="modal-header">
        <div class="modal-title">Zugriffsstatistik</div>
        <button class="modal-close" onclick="App.closeModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <p style="margin-bottom: 16px; color: var(--gray-600);">
          Die am häufigsten angeforderten Archivboxen.
        </p>
        
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${topBoxes.map((box, i) => {
            const maxCount = topBoxes[0].accessCount || 1;
            const barWidth = (box.accessCount / maxCount) * 100;
            
            return `
              <div class="hitlist-item" onclick="App.showBoxDetail('${box.id}')" style="position: relative; overflow: hidden;">
                <div style="position: absolute; left: 0; top: 0; bottom: 0; width: ${barWidth}%; background: var(--primary-light); z-index: 0;"></div>
                <div class="hitlist-rank ${i < 3 ? 'top' : ''}" style="position: relative; z-index: 1;">${i + 1}</div>
                <div class="hitlist-content" style="position: relative; z-index: 1;">
                  <div class="hitlist-id">${box.id}</div>
                  <div class="hitlist-label">${box.label}</div>
                </div>
                <div class="hitlist-count" style="position: relative; z-index: 1;">${box.accessCount}x</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Schliessen</button>
        <button class="btn btn-primary" onclick="Modals.exportHitlist()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Exportieren
        </button>
      </div>
    `);
  },

  exportHitlist() {
    const topBoxes = getTopAccessedBoxes(50);
    const csv = [
      ['Rang', 'Box-ID', 'Bezeichnung', 'Abteilung', 'Zugriffe', 'Letzter Zugriff'],
      ...topBoxes.map((box, i) => [
        i + 1,
        box.id,
        box.label,
        box.department,
        box.accessCount,
        box.lastAccessed || '',
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    this.downloadCSV(csv, `zugriffsstatistik-${new Date().toISOString().split('T')[0]}.csv`);
  },

  // Requested Boxes Modal
  showRequested() {
    const boxes = getRequestedBoxes();
    
    this.show(`
      <div class="modal-header">
        <div class="modal-title">Angeforderte Boxen</div>
        <button class="modal-close" onclick="App.closeModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <p style="margin-bottom: 16px; color: var(--gray-600);">
          ${boxes.length} Boxen warten auf Abholung.
        </p>
        
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${boxes.map(box => {
            const dept = DEPARTMENTS[box.department];
            return `
              <div class="search-result-item" onclick="App.showBoxDetail('${box.id}')">
                <div class="result-dept-bar" style="background: ${dept.color};"></div>
                <div class="result-content">
                  <div class="result-id">${box.id}</div>
                  <div class="result-label">${box.label}</div>
                  <div class="result-meta">
                    <span>${box.department}</span>
                    <span>${positionString(box.position)}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Schliessen</button>
      </div>
    `);
  },
};
