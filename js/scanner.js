// ==========================================
// QR SCANNER TAB
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

  init() {
    const container = document.getElementById('scanner-area');
    if (!container) return;
    if (this.scanning) return;

    const testBoxes = DEMO_BOXES.slice(0, 3).map(b => b.id);

    container.innerHTML = `
      <div class="scanner-wrapper">
        <video id="scanner-video" playsinline autoplay muted></video>
        <canvas id="scanner-canvas" style="display:none"></canvas>
        <div class="scanner-overlay">
          <div class="scanner-frame">
            <div class="scanner-corner tl"></div>
            <div class="scanner-corner tr"></div>
            <div class="scanner-corner bl"></div>
            <div class="scanner-corner br"></div>
          </div>
          <div class="scanner-line"></div>
        </div>
        <div class="scanner-hint" id="scanner-hint">QR-Code in den Rahmen halten</div>
      </div>
      <div id="scanner-result" class="scanner-result"></div>
      <div class="scanner-manual">
        <div class="scanner-manual-label">Oder Box-ID eingeben:</div>
        <div class="scanner-manual-input">
          <input type="text" id="scanner-manual-id" placeholder="DS-756-0126-0001" autocomplete="off" autocapitalize="characters">
          <button onclick="Scanner.manualLookup()">→</button>
        </div>
      </div>
      <div class="scanner-test-section">
        <div class="scanner-test-label">Test-IDs zum schnellen Ausprobieren:</div>
        <div class="scanner-test-chips" id="test-chip-area">
          ${testBoxes.map(id => `
            <button class="scanner-test-chip" onclick="Scanner.quickLookup('${id}')">${id}</button>
          `).join('')}
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
    // 1. Try native BarcodeDetector (Chrome 83+, Edge, NOT Safari)
    if (typeof BarcodeDetector !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const formats = await BarcodeDetector.getSupportedFormats();
        if (formats && formats.includes('qr_code')) {
          this.detector = new BarcodeDetector({ formats: ['qr_code'] });
          this.setHint('✓ QR-Scanner bereit (Native)');
          console.log('Using native BarcodeDetector');
          return;
        }
      } catch (e) { 
        console.warn('BarcodeDetector error:', e);
      }
    }

    // 2. Fallback: jsQR library
    if (typeof jsQR !== 'undefined') {
      this.detector = 'jsqr';
      this.setHint('✓ QR-Scanner bereit (jsQR)');
      console.log('Using jsQR fallback');
      return;
    }

    // 3. No decoder available
    this.detector = null;
    this.setHint('⚠️ Kein QR-Scanner – bitte ID manuell eingeben');
    console.warn('No QR decoder available');
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
          <span class="scanner-no-camera-icon">📷</span>
          <div>Kamera nicht verfügbar</div>
          <div class="scanner-no-camera-hint">Box-ID manuell eingeben oder Test-ID unten antippen</div>
        </div>
      `;
    }
  },

  async scanLoop() {
    if (!this.scanning) return;
    this.animFrame = requestAnimationFrame(() => this.scanLoop());

    if (!this.video || this.video.readyState !== this.video.HAVE_ENOUGH_DATA) return;

    // Throttle: max 10 scans/sec
    const now = Date.now();
    if (now - this.lastScan < 100) return;
    this.lastScan = now;

    // No detector available
    if (!this.detector) return;

    try {
      if (this.detector !== 'jsqr' && typeof this.detector.detect === 'function') {
        // Native BarcodeDetector
        const barcodes = await this.detector.detect(this.video);
        if (barcodes.length > 0) {
          console.log('Native detector found:', barcodes[0].rawValue);
          this.onScanResult(barcodes[0].rawValue);
        }
      } else if (this.detector === 'jsqr' && typeof jsQR !== 'undefined') {
        // jsQR fallback
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
          console.log('jsQR found:', code.data);
          this.onScanResult(code.data);
        }
      }
    } catch (err) {
      // Only log once per second to avoid spam
      if (!this._lastErrorLog || now - this._lastErrorLog > 1000) {
        console.error('Scan error:', err);
        this._lastErrorLog = now;
      }
    }
  },

  onScanResult(data) {
    // Debounce same result
    if (this._lastResult === data && Date.now() - this._lastResultTime < 3000) return;
    this._lastResult = data;
    this._lastResultTime = Date.now();

    let boxId = data.trim();

    // URL handling
    if (boxId.includes('/')) boxId = boxId.split('/').pop();

    // Normalize prefix
    if (!boxId.startsWith('DS-') && boxId.match(/^\d{3}-/)) {
      boxId = 'DS-' + boxId;
    }

    // Exact match
    let box = findBoxById(boxId);

    // Partial match fallback
    if (!box) {
      box = DEMO_BOXES.find(b =>
        b.id.includes(boxId) || boxId.includes(b.id)
      );
    }

    if (box) {
      this.showScanSuccess(box);
      if (navigator.vibrate) navigator.vibrate(100);
    } else {
      this.showScanError(boxId);
    }
  },

  showScanSuccess(box) {
    const result = document.getElementById('scanner-result');
    if (!result) return;
    const dept = DEPARTMENTS[box.department];

    // Visual feedback - flash the scanner frame green
    const frame = document.querySelector('.scanner-frame');
    if (frame) {
      frame.style.borderColor = '#00C853';
      frame.style.boxShadow = '0 0 20px rgba(0, 200, 83, 0.5)';
      setTimeout(() => {
        frame.style.borderColor = '';
        frame.style.boxShadow = '';
      }, 500);
    }

    // Stop camera after successful scan
    this.stop();

    result.innerHTML = `
      <div class="scanner-found" onclick="App.showBoxDetail('${box.id}')">
        <div class="scanner-found-header">
          <span class="scanner-found-check">✓</span>
          <span class="scanner-found-id">${box.id}</span>
        </div>
        <div class="scanner-found-label">${box.label}</div>
        <div class="scanner-found-meta">
          <span class="dept-badge-sm" style="background:${dept.color}">${box.department}</span>
          <span class="scanner-found-pos">${positionString(box.position)}</span>
        </div>
        <div class="scanner-found-cta">Details anzeigen →</div>
      </div>
      <button class="scanner-rescan-btn" onclick="Scanner.init()">Neuer Scan</button>
    `;
  },

  showScanError(id) {
    const result = document.getElementById('scanner-result');
    if (!result) return;
    result.innerHTML = `
      <div class="scanner-not-found">
        <span>⚠️</span> Box „${id}" nicht gefunden
      </div>
    `;
    setTimeout(() => {
      if (result.querySelector('.scanner-not-found')) result.innerHTML = '';
    }, 2500);
  },

  quickLookup(id) {
    const box = findBoxById(id);
    if (box) {
      this.showScanSuccess(box);
      setTimeout(() => App.showBoxDetail(box.id), 600);
    }
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
      App.showBoxDetail(box.id);
    } else {
      const partial = DEMO_BOXES.find(b =>
        b.id.includes(val) || b.id.replace(/-/g, '').includes(val.replace(/-/g, ''))
      );
      if (partial) {
        App.showBoxDetail(partial.id);
      } else {
        this.showScanError(val);
      }
    }
    input.value = '';
  },

  stop() {
    this.scanning = false;
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    if (this.video && this.video.srcObject) {
      this.video.srcObject.getTracks().forEach(t => t.stop());
    }
  }
};
