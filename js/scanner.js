// ==========================================
// QR SCANNER - ArchivBox Manager v2
// ==========================================

const Scanner = {
  video: null,
  canvas: null,
  ctx: null,
  scanning: false,
  animFrame: null,
  detector: null,
  lastScan: 0,
  _lastResult: null,
  _lastResultTime: 0,
  emergencyMode: false,
  emergencyBoxes: [],

  init() {
    const container = document.getElementById('scanner-area');
    if (!container) return;
    if (this.scanning) return;

    const emergencyBanner = this.emergencyMode ? `
      <div class="emergency-banner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span>Notfall-Modus: ${this.emergencyBoxes.length} Boxen erfasst</span>
        <button class="emergency-export-btn" onclick="Modals.exportEmergencyData()">Exportieren</button>
      </div>
    ` : '';

    container.innerHTML = `
      ${emergencyBanner}
      <div class="scanner-wrapper">
        <video id="scanner-video" playsinline autoplay muted></video>
        <canvas id="scanner-canvas" style="display:none"></canvas>
        <div class="scanner-overlay">
          <div class="scanner-frame" id="scanner-frame">
            <div class="scanner-line"></div>
          </div>
        </div>
        <div class="scanner-hint" id="scanner-hint">QR-Code in den Rahmen halten</div>
      </div>
      <div class="scanner-result" id="scanner-result"></div>
      <div class="scanner-manual">
        <div class="scanner-manual-label">Oder Box-ID eingeben:</div>
        <div class="scanner-manual-input">
          <input type="text" id="scanner-manual-id" placeholder="DS-756-0126-0001" autocomplete="off" autocapitalize="characters">
          <button onclick="Scanner.manualLookup()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    this.video = document.getElementById('scanner-video');
    this.canvas = document.getElementById('scanner-canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

    document.getElementById('scanner-manual-id').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.manualLookup();
    });

    this.initDetector().then(() => this.startCamera());
  },

  async initDetector() {
    if (typeof BarcodeDetector !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const formats = await BarcodeDetector.getSupportedFormats();
        if (formats && formats.includes('qr_code')) {
          this.detector = new BarcodeDetector({ formats: ['qr_code'] });
          this.setHint('Scanner bereit');
          return;
        }
      } catch (e) { 
        console.warn('BarcodeDetector error:', e);
      }
    }

    if (typeof jsQR !== 'undefined') {
      this.detector = 'jsqr';
      this.setHint('Scanner bereit');
      return;
    }

    this.detector = null;
    this.setHint('Kein Scanner verfügbar');
  },

  setHint(text) {
    const el = document.getElementById('scanner-hint');
    if (el) el.textContent = text;
  },

  async startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      });
      this.video.srcObject = stream;
      await this.video.play();
      this.scanning = true;
      this.scanLoop();
    } catch (err) {
      console.warn('Camera error:', err);
      document.getElementById('scanner-result').innerHTML = `
        <div class="scanner-no-camera">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
          <h3>Kamera nicht verfügbar</h3>
          <p>Box-ID manuell eingeben</p>
        </div>
      `;
    }
  },

  async scanLoop() {
    if (!this.scanning) return;
    this.animFrame = requestAnimationFrame(() => this.scanLoop());

    if (!this.video || this.video.readyState !== this.video.HAVE_ENOUGH_DATA) return;

    const now = Date.now();
    if (now - this.lastScan < 100) return;
    this.lastScan = now;

    if (!this.detector) return;

    try {
      if (this.detector !== 'jsqr' && typeof this.detector.detect === 'function') {
        const barcodes = await this.detector.detect(this.video);
        if (barcodes.length > 0) {
          this.onScanResult(barcodes[0].rawValue);
        }
      } else if (this.detector === 'jsqr' && typeof jsQR !== 'undefined') {
        if (this.canvas.width !== this.video.videoWidth || this.canvas.height !== this.video.videoHeight) {
          this.canvas.width = this.video.videoWidth;
          this.canvas.height = this.video.videoHeight;
        }
        
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        const imgData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'attemptBoth',
        });
        
        if (code && code.data) {
          this.onScanResult(code.data);
        }
      }
    } catch (err) {
      // Silent fail
    }
  },

  onScanResult(data) {
    if (this._lastResult === data && Date.now() - this._lastResultTime < 3000) return;
    this._lastResult = data;
    this._lastResultTime = Date.now();

    let boxId = data.trim();
    if (boxId.includes('/')) boxId = boxId.split('/').pop();
    if (!boxId.startsWith('DS-') && boxId.match(/^\d{3}-/)) {
      boxId = 'DS-' + boxId;
    }

    let box = findBoxById(boxId);
    if (!box) {
      box = getBoxes().find(b => b.id.includes(boxId) || boxId.includes(b.id));
    }

    if (box) {
      this.showScanSuccess(box);
      if (navigator.vibrate) navigator.vibrate(100);
      
      // Emergency mode: add to list
      if (this.emergencyMode) {
        Modals.addEmergencyBox(box.id);
        this.emergencyBoxes = window.emergencyContext?.boxes || [];
        this.updateEmergencyBanner();
      }
    } else {
      this.showScanError(boxId);
    }
  },

  showScanSuccess(box) {
    const result = document.getElementById('scanner-result');
    if (!result) return;
    
    const dept = DEPARTMENTS[box.department];
    const pos = box.position;
    const frame = document.getElementById('scanner-frame');
    if (frame) {
      frame.classList.add('success');
      setTimeout(() => frame.classList.remove('success'), 500);
    }

    if (!this.emergencyMode) {
      this.stop();
    }

    result.innerHTML = `
      <div class="scanner-found">
        <div class="scanner-found-rst">
          <div class="rst-label">Standort</div>
          <div class="rst-code">
            <span class="rack">R${pos.rack.replace('R','')}</span><span class="sep"> / </span>S${String(pos.shelf).padStart(2,'0')}<span class="sep"> / </span>T${String(pos.tray).padStart(2,'0')}
          </div>
          <div class="rst-box-id">${box.id}</div>
        </div>
        <div class="scanner-found-label">${box.label}</div>
        <div class="scanner-actions">
          <button class="scanner-btn secondary" onclick="Scanner.init()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            Weiter
          </button>
          <button class="scanner-btn primary" onclick="App.showBoxDetail('${box.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
            Details
          </button>
        </div>
      </div>
    `;
  },

  showScanError(id) {
    const result = document.getElementById('scanner-result');
    if (!result) return;
    result.innerHTML = `
      <div class="scanner-not-found">
        Box "${id}" nicht gefunden
      </div>
    `;
    setTimeout(() => {
      if (result.querySelector('.scanner-not-found')) result.innerHTML = '';
    }, 2500);
  },

  manualLookup() {
    const input = document.getElementById('scanner-manual-id');
    if (!input) return;
    const val = input.value.trim().toUpperCase();
    if (!val) return;

    let boxId = val;
    if (!boxId.startsWith('DS-')) boxId = 'DS-' + boxId;

    const box = findBoxById(boxId);
    if (box) {
      if (this.emergencyMode) {
        this.showScanSuccess(box);
        Modals.addEmergencyBox(box.id);
        this.emergencyBoxes = window.emergencyContext?.boxes || [];
        this.updateEmergencyBanner();
      } else {
        App.showBoxDetail(box.id);
      }
    } else {
      const partial = getBoxes().find(b =>
        b.id.includes(val) || b.id.replace(/-/g, '').includes(val.replace(/-/g, ''))
      );
      if (partial) {
        if (this.emergencyMode) {
          this.showScanSuccess(partial);
          Modals.addEmergencyBox(partial.id);
          this.emergencyBoxes = window.emergencyContext?.boxes || [];
          this.updateEmergencyBanner();
        } else {
          App.showBoxDetail(partial.id);
        }
      } else {
        this.showScanError(val);
      }
    }
    input.value = '';
  },

  setEmergencyMode(enabled) {
    this.emergencyMode = enabled;
    this.emergencyBoxes = [];
    if (enabled) {
      this.init();
    }
  },

  updateEmergencyBanner() {
    const banner = document.querySelector('.emergency-banner span');
    if (banner) {
      banner.textContent = `Notfall-Modus: ${this.emergencyBoxes.length} Boxen erfasst`;
    }
  },

  stop() {
    this.scanning = false;
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    if (this.video && this.video.srcObject) {
      this.video.srcObject.getTracks().forEach(t => t.stop());
    }
  }
};
