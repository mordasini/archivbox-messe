// ==========================================
// 3D VIEW TAB - Komplett neu geschrieben
// ==========================================

const View3D = {
  // Three.js Objekte
  scene: null,
  camera: null,
  renderer: null,
  initialized: false,
  
  // Interaktion
  clickableObjects: [],
  tablarMeshes: {},
  currentHighlight: null,
  lookTarget: null,

  // ==========================================
  // LAYOUT KONSTANTEN
  // ==========================================
  
  // Koordinatensystem (Three.js Standard):
  // Y = Höhe (nach oben)
  // X = Breite (Länge der Regale, links/rechts)
  // Z = Tiefe (Gang bei Z=0, Kamera bei +Z)
  
  GANG_WIDTH: 1.5,     // Gangbreite in Metern
  RACK_DEPTH: 0.4,     // Regaltiefe (40cm)
  
  // Box-Dimensionen (echte DocuSave Archivbox)
  BOX_W: 0.12,  // 12cm Breite (Frontansicht)
  BOX_H: 0.27,  // 27cm Höhe
  BOX_D: 0.33,  // 33cm Tiefe (ins Regal)

  // ==========================================
  // INIT
  // ==========================================
  
  init() {
    if (typeof THREE === 'undefined') {
      console.error('Three.js not loaded');
      return;
    }
    if (this.initialized) {
      this.onResize();
      return;
    }
    this.waitForContainer();
  },

  waitForContainer(attempts = 0) {
    const container = document.getElementById('3d-viewport');
    if (!container) return;

    // Setze Höhe per JS (Safari-Fix)
    const headerH = 56, tabbarH = 76, toolbarH = 44, legendH = 44;
    const availableH = window.innerHeight - headerH - tabbarH - toolbarH - legendH;
    container.style.height = Math.max(availableH, 300) + 'px';

    const W = container.offsetWidth;
    const H = container.offsetHeight;
    
    console.log('3D container size:', W, 'x', H, 'attempt:', attempts);

    if ((W === 0 || H < 100) && attempts < 30) {
      setTimeout(() => this.waitForContainer(attempts + 1), 100);
      return;
    }

    if (W > 0 && H >= 100) {
      this.setup(W, H);
    }
  },

  // ==========================================
  // SETUP - Scene, Camera, Lights, Floor
  // ==========================================
  
  setup(W, H) {
    const container = document.getElementById('3d-viewport');
    const loading = document.getElementById('3d-loading');
    if (loading) loading.style.display = 'none';

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xE8EAED);
    this.scene.fog = new THREE.Fog(0xE8EAED, 15, 35);

    // Camera - Übersicht von FRONT (+X), erhöht, im Gang (Z=0)
    this.camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    this.lookTarget = new THREE.Vector3(0, 1, 0);
    this.camera.position.set(6, 3, 0);
    this.camera.lookAt(this.lookTarget);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(W, H);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    this.scene.add(dirLight);

    // Floor
    const floorGeo = new THREE.PlaneGeometry(20, 15);
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: 0xD0D4D8, 
      roughness: 0.9 
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;  // Flach auf XZ-Ebene
    floor.position.y = 0;
    this.scene.add(floor);

    // ==========================================
    // RACK POSITIONEN BERECHNEN
    // ==========================================
    
    const gangHalf = this.GANG_WIDTH / 2;  // 0.75
    const depthHalf = this.RACK_DEPTH / 2; // 0.2
    
    // Z-Positionen (Mitte jedes Racks)
    // Von Kamera aus gesehen: links = +Z, rechts = -Z
    this.rackZ = {
      R01: +(gangHalf + this.RACK_DEPTH + depthHalf), // +1.35 (Ghost, hinten links)
      R02: +(gangHalf + depthHalf),                    // +0.95 (Messe, am Gang links)
      R03: -(gangHalf + depthHalf),                    // -0.95 (Messe, am Gang rechts)
      R04: -(gangHalf + this.RACK_DEPTH + depthHalf), // -1.35 (Ghost, hinten rechts)
    };
    
    // Offene Seite: +1 = nach +Z, -1 = nach -Z
    // R02 öffnet zum Gang (nach -Z)
    // R03 öffnet zum Gang (nach +Z)
    this.rackOpenDir = {
      R01: +1,  // offen nach +Z (weg vom Gang)
      R02: -1,  // offen nach -Z (zum Gang)
      R03: +1,  // offen nach +Z (zum Gang)
      R04: -1,  // offen nach -Z (weg vom Gang)
    };

    // Racks bauen
    this.rackGroups = {};
    ['R01', 'R02', 'R03', 'R04'].forEach(id => this.buildRack(id));
    
    // Labels
    this.rackLabels = {};
    this.addLabels();

    // Interaktion
    this.selectedTablar = null;
    this.selectedRack = null;
    this.hoverMesh = null;
    this.renderer.domElement.addEventListener('pointerdown', e => this.onTap(e));
    this.renderer.domElement.addEventListener('mousemove', e => this.onMouseMove(e));

    // Render Loop starten
    this.initialized = true;
    this.animate();
    
    console.log('3D setup complete');
  },

  // ==========================================
  // BUILD RACK
  // ==========================================
  
  buildRack(rackId) {
    const cfg = DEPOT_CONFIG.racks[rackId];
    const isGhost = !cfg.isMesse;
    const opacity = isGhost ? 0.25 : 1.0;
    
    const zPos = this.rackZ[rackId];
    const openDir = this.rackOpenDir[rackId];
    
    const length = cfg.length;      // X-Richtung
    const height = cfg.height;      // Y-Richtung
    const depth = this.RACK_DEPTH;  // Z-Richtung
    const shelfCount = cfg.shelves;
    const shelfSpacing = height / shelfCount;
    
    console.log(`Building ${rackId}: z=${zPos.toFixed(2)}, open=${openDir > 0 ? '+Z' : '-Z'}, ghost=${isGhost}`);

    const group = new THREE.Group();
    group.position.set(0, 0, zPos);

    // Materialien
    const frameMat = new THREE.MeshStandardMaterial({
      color: isGhost ? 0x888888 : 0x505050,
      transparent: isGhost, opacity,
      metalness: 0.3, roughness: 0.7,
    });
    const shelfMat = new THREE.MeshStandardMaterial({
      color: isGhost ? 0xA0A0A0 : 0x707070,
      transparent: isGhost, opacity,
      roughness: 0.8,
    });
    const backMat = new THREE.MeshStandardMaterial({
      color: isGhost ? 0x999999 : 0x606060,
      transparent: isGhost, 
      opacity: isGhost ? 0.15 : 0.6,
      roughness: 0.9,
    });

    // --- RÜCKWAND (geschlossene Seite) ---
    const backZ = -openDir * depth / 2;
    const backGeo = new THREE.BoxGeometry(length, height, 0.01);
    const back = new THREE.Mesh(backGeo, backMat);
    back.position.set(0, height / 2, backZ);
    group.add(back);

    // --- SEITENWÄNDE ---
    const sideGeo = new THREE.BoxGeometry(0.02, height, depth);
    [-1, +1].forEach(side => {
      const sidePanel = new THREE.Mesh(sideGeo, frameMat);
      sidePanel.position.set(side * length / 2, height / 2, 0);
      group.add(sidePanel);
    });

    // --- REGALBÖDEN + BOXEN ---
    for (let s = 0; s < shelfCount; s++) {
      const shelfY = s * shelfSpacing + 0.01;
      
      // Regalboden
      const shelfGeo = new THREE.BoxGeometry(length - 0.04, 0.02, depth - 0.02);
      const shelf = new THREE.Mesh(shelfGeo, shelfMat);
      shelf.position.set(0, shelfY, 0);
      group.add(shelf);

      // Klickbarer Bereich (nur Messe-Racks)
      if (!isGhost) {
        const tabH = shelfSpacing - 0.04;
        const tabGeo = new THREE.BoxGeometry(length - 0.08, tabH, depth - 0.04);
        const tabMat = new THREE.MeshStandardMaterial({
          color: 0x00A99D, 
          transparent: true, 
          opacity: 0,
          depthWrite: false,
        });
        const tablar = new THREE.Mesh(tabGeo, tabMat);
        tablar.position.set(0, shelfY + 0.02 + tabH/2, 0);
        tablar.userData = { rackId, shelf: s + 1, type: 'tablar' };
        group.add(tablar);
        this.clickableObjects.push(tablar);
        this.tablarMeshes[`${rackId}-S${s+1}`] = tablar;
      }

      // Boxen auf diesem Shelf
      const boxes = findBoxesByRackShelf(rackId, s + 1);
      const trayWidth = length / cfg.trays;
      const boxesPerTray = cfg.boxesPerTray || 1;
      const boxSpacing = trayWidth / boxesPerTray;
      
      boxes.forEach(box => {
        const trayIdx = box.position.tray - 1;
        const slotIdx = (box.position.slot || 1) - 1;
        
        // X position: tray position + slot position within tray
        const trayStartX = -length/2 + trayIdx * trayWidth;
        const boxX = trayStartX + slotIdx * boxSpacing + boxSpacing/2;
        const boxY = shelfY + 0.02 + this.BOX_H/2 + 0.01;
        
        // Box-Körper - einheitlich hellgrau wie DocuSave Boxen
        const boxGeo = new THREE.BoxGeometry(this.BOX_W, this.BOX_H, this.BOX_D);
        const boxMat = new THREE.MeshStandardMaterial({
          color: isGhost ? 0xCCCCCC : 0xE8E6E3,  // Hellgrau
          transparent: isGhost, opacity,
          roughness: 0.9,
        });
        const boxMesh = new THREE.Mesh(boxGeo, boxMat);
        boxMesh.position.set(boxX, boxY, 0);
        group.add(boxMesh);

        // QR-Code Andeutung unten auf der Frontseite (nur Messe-Racks)
        if (!isGhost) {
          // Kleines dunkles Quadrat (QR-Code)
          const qrSize = 0.02;
          const qrGeo = new THREE.BoxGeometry(qrSize, qrSize, 0.002);
          const qrMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
          const qr = new THREE.Mesh(qrGeo, qrMat);
          qr.position.set(boxX, boxY - this.BOX_H/2 + 0.03, openDir * (this.BOX_D/2 + 0.001));
          group.add(qr);
          
          // Nummer-Andeutung (kleiner Strich über QR)
          const numGeo = new THREE.BoxGeometry(0.03, 0.005, 0.002);
          const numMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
          const num = new THREE.Mesh(numGeo, numMat);
          num.position.set(boxX, boxY - this.BOX_H/2 + 0.045, openDir * (this.BOX_D/2 + 0.001));
          group.add(num);
        }
      });
    }

    // --- OBERE ABSCHLUSSLEISTE ---
    const topGeo = new THREE.BoxGeometry(length, 0.03, depth);
    const topBar = new THREE.Mesh(topGeo, frameMat);
    topBar.position.set(0, height, 0);
    group.add(topBar);

    this.scene.add(group);
    this.rackGroups[rackId] = group;  // Store reference for show/hide
  },

  // ==========================================
  // LABELS
  // ==========================================
  
  addLabels() {
    const makeLabel = (text, x, y, z, isGhost, size = 64) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      ctx.font = `bold ${size}px sans-serif`;
      ctx.fillStyle = isGhost ? 'rgba(120,120,120,0.5)' : '#374151';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 256, 64);
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: texture, transparent: true })
      );
      sprite.position.set(x, y, z);
      sprite.scale.set(2.5, 0.6, 1);
      this.scene.add(sprite);
      return sprite;
    };

    // Two-line label (e.g., "Rack" + "02")
    const makeTwoLineLabel = (line1, line2, x, y, z, scale = 0.4) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      
      // Line 1 (smaller, e.g., "Rack")
      ctx.font = 'bold 48px sans-serif';
      ctx.fillStyle = '#374151';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(line1, 128, 80);
      
      // Line 2 (larger, e.g., "02")
      ctx.font = 'bold 96px sans-serif';
      ctx.fillText(line2, 128, 170);
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: texture, transparent: true })
      );
      sprite.position.set(x, y, z);
      sprite.scale.set(scale, scale, 1);
      this.scene.add(sprite);
      return sprite;
    };

    this.rackLabels = {};
    this.detailLabels = {};  // Shelf/Tray labels, hidden by default
    
    for (const [id, cfg] of Object.entries(DEPOT_CONFIG.racks)) {
      const z = this.rackZ[id];
      const isGhost = !cfg.isMesse;
      const rackNum = id.replace('R', '');
      
      if (isGhost) {
        // Ghost racks: simple label
        const labelX = -cfg.length / 2 - 0.3;
        const labelY = cfg.height + 0.2;
        const label = makeLabel(id, labelX, labelY, z, true);
        this.rackLabels[id] = label;
      } else {
        // Messe racks: Rack label at rack position (for overview)
        const openDir = this.rackOpenDir[id];
        const labelZ = z + openDir * 0.4;  // Slightly in front of rack (towards gang)
        
        const rackLabel = makeTwoLineLabel('Rack', rackNum, -cfg.length / 2 - 0.35, cfg.height + 0.2, z, 0.35);
        this.rackLabels[id] = rackLabel;
        
        // Store rack label position for switching between overview/detail
        rackLabel.userData = { 
          overviewZ: z, 
          detailZ: labelZ,
          x: -cfg.length / 2 - 0.35,
          y: cfg.height + 0.2
        };
        
        // Detail labels (Shelf/Tray) - hidden by default
        const detailLabels = [];
        
        // "Shelf 01" - TOP center, in front of rack
        const shelfLabel = makeTwoLineLabel('Shelf', '01', 0, cfg.height + 0.2, labelZ, 0.3);
        shelfLabel.visible = false;
        detailLabels.push({ sprite: shelfLabel, type: 'shelf' });
        
        // "Tray XX" - right side of each tray, in front of rack
        // Numbered from top (01) to bottom
        for (let s = 1; s <= cfg.shelves; s++) {
          const shelfY = (s - 0.5) * (cfg.height / cfg.shelves);
          // Flip numbering: top shelf (s=3) = Tray 01, bottom shelf (s=1) = Tray 03
          const trayNum = String(cfg.shelves - s + 1).padStart(2, '0');
          const trayLabel = makeTwoLineLabel('Tray', trayNum, cfg.length / 2 + 0.3, shelfY, labelZ, 0.15);
          trayLabel.visible = false;
          detailLabels.push({ sprite: trayLabel, type: 'tray', shelf: s });
        }
        
        this.detailLabels[id] = detailLabels;
      }
    }
  },
  
  showDetailLabels(rackId, selectedShelf = null) {
    // Show Shelf/Tray labels for this rack
    if (this.detailLabels[rackId]) {
      this.detailLabels[rackId].forEach(item => {
        item.sprite.visible = true;
        // Make selected tray bigger
        if (item.type === 'tray') {
          if (selectedShelf !== null && item.shelf === selectedShelf) {
            item.sprite.scale.set(0.25, 0.25, 1);  // Selected: bigger
          } else {
            item.sprite.scale.set(0.15, 0.15, 1);  // Not selected: smaller
          }
        }
      });
    }
  },
  
  hideDetailLabels(rackId) {
    // Hide Shelf/Tray labels for this rack
    if (this.detailLabels[rackId]) {
      this.detailLabels[rackId].forEach(item => item.sprite.visible = false);
    }
  },
  
  hideAllDetailLabels() {
    for (const labels of Object.values(this.detailLabels)) {
      labels.forEach(item => item.sprite.visible = false);
    }
  },

  // ==========================================
  // CAMERA CONTROLS
  // ==========================================
  
  animateCamera(toPos, toTarget, duration = 1.0) {
    if (typeof gsap === 'undefined') {
      // Fallback ohne Animation
      this.camera.position.set(toPos.x, toPos.y, toPos.z);
      this.lookTarget.set(toTarget.x, toTarget.y, toTarget.z);
      this.camera.lookAt(this.lookTarget);
      return;
    }
    
    gsap.to(this.camera.position, {
      x: toPos.x, y: toPos.y, z: toPos.z,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => this.camera.lookAt(this.lookTarget),
    });
    gsap.to(this.lookTarget, {
      x: toTarget.x, y: toTarget.y, z: toTarget.z,
      duration,
      ease: 'power2.inOut',
    });
  },

  resetCamera() {
    // Übersicht: von FRONT (+X), erhöht, im Gang (Z=0)
    this.animateCamera(
      { x: 6, y: 3, z: 0 },
      { x: 0, y: 1, z: 0 }
    );
    this.clearHighlight();
    this.hideInfoPanel();
    this.showAllRacks();
  },

  flyToGang() {
    // Im Gang stehend, Augenhöhe, schaut entlang -X
    this.animateCamera(
      { x: 3, y: 1.5, z: 0 },
      { x: 0, y: 1, z: 0 }
    );
    this.clearHighlight();
    this.hideInfoPanel();
    this.showAllRacks();
  },

  // ==========================================
  // INTERACTION
  // ==========================================
  
  onTap(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
    const hits = raycaster.intersectObjects(this.clickableObjects);

    // Filter hits to only visible objects (parent rack must be visible)
    const visibleHits = hits.filter(hit => {
      const rackId = hit.object.userData.rackId;
      return this.rackGroups[rackId] && this.rackGroups[rackId].visible;
    });

    if (visibleHits.length > 0) {
      const data = visibleHits[0].object.userData;
      if (data.type === 'tablar') {
        const newKey = `${data.rackId}-S${data.shelf}`;
        
        // Click on already selected tablar → back to overview
        if (this.selectedTablar === newKey) {
          this.resetCamera();
          this.selectedTablar = null;
          this.selectedRack = null;
          return;
        }
        
        // Check if same rack (for tray switching within rack)
        const sameRack = this.selectedRack === data.rackId;
        
        this.highlightTablar(data.rackId, data.shelf);
        this.showTablarInfo(data.rackId, data.shelf);
        this.selectedTablar = newKey;
        this.selectedRack = data.rackId;
        
        if (sameRack) {
          // Same rack: just move camera Y to new shelf, keep perspective
          // Make sure current rack is visible
          if (this.rackGroups[data.rackId]) {
            this.rackGroups[data.rackId].visible = true;
          }
          if (this.rackLabels[data.rackId]) {
            this.rackLabels[data.rackId].visible = true;
          }
          // Update tray label sizes for new selection
          this.showDetailLabels(data.rackId, data.shelf);
          
          const cfg = DEPOT_CONFIG.racks[data.rackId];
          const shelfY = (data.shelf - 0.5) * (cfg.height / cfg.shelves);
          const rackZ = this.rackZ[data.rackId];
          const openDir = this.rackOpenDir[data.rackId];
          const cameraZ = rackZ + openDir * 4;
          
          this.animateCamera(
            { x: 0, y: shelfY + 0.5, z: cameraZ },
            { x: 0, y: shelfY, z: rackZ },
            0.4
          );
        } else {
          // Different rack → hide others and full rotation
          this.hideOtherRacks(data.rackId, data.shelf);
          
          const cfg = DEPOT_CONFIG.racks[data.rackId];
          const shelfY = (data.shelf - 0.5) * (cfg.height / cfg.shelves);
          const rackZ = this.rackZ[data.rackId];
          const openDir = this.rackOpenDir[data.rackId];
          const cameraZ = rackZ + openDir * 4;
          
          this.animateCamera(
            { x: 0, y: shelfY + 0.5, z: cameraZ },
            { x: 0, y: shelfY, z: rackZ },
            0.8
          );
        }
        return;
      }
    }
    
    // Click on empty space → back to overview
    if (this.selectedTablar) {
      this.resetCamera();
      this.selectedTablar = null;
      this.selectedRack = null;
    }
  },

  onMouseMove(event) {
    if (!this.renderer) return;
    
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
    const hits = raycaster.intersectObjects(this.clickableObjects);

    // Clear previous hover
    if (this.hoverMesh && this.hoverMesh !== this.currentHighlight) {
      this.hoverMesh.material.opacity = 0;
      this.hoverMesh.material.color.setHex(0x00A99D);  // Reset color
    }
    this.hoverMesh = null;

    if (hits.length > 0) {
      const mesh = hits[0].object;
      if (mesh !== this.currentHighlight) {
        mesh.material.opacity = 0.35;  // Stronger hover highlight
        mesh.material.color.setHex(0x00D4C8);  // Brighter teal
        this.hoverMesh = mesh;
      }
      this.renderer.domElement.style.cursor = 'pointer';
    } else {
      this.renderer.domElement.style.cursor = 'default';
    }
  },

  hideOtherRacks(keepRackId, selectedShelf = null) {
    for (const [id, group] of Object.entries(this.rackGroups)) {
      if (id !== keepRackId) {
        group.visible = false;
        const label = this.rackLabels[id];
        if (label) label.visible = false;
      }
    }
    // Move kept rack's label to detail position
    const label = this.rackLabels[keepRackId];
    if (label && label.userData && label.userData.detailZ !== undefined) {
      label.position.z = label.userData.detailZ;
    }
    // Show detail labels for the kept rack
    this.showDetailLabels(keepRackId, selectedShelf);
  },

  showAllRacks() {
    for (const [id, group] of Object.entries(this.rackGroups)) {
      group.visible = true;
      const label = this.rackLabels[id];
      if (label) {
        label.visible = true;
        // Move label back to rack position (overview)
        if (label.userData && label.userData.overviewZ !== undefined) {
          label.position.z = label.userData.overviewZ;
        }
      }
    }
    // Hide all detail labels
    this.hideAllDetailLabels();
  },

  highlightTablar(rackId, shelf) {
    this.clearHighlight();
    const mesh = this.tablarMeshes[`${rackId}-S${shelf}`];
    if (mesh && typeof gsap !== 'undefined') {
      gsap.to(mesh.material, { opacity: 0.25, duration: 0.3 });
      this.currentHighlight = mesh;
    }
  },

  clearHighlight() {
    if (this.currentHighlight && typeof gsap !== 'undefined') {
      gsap.to(this.currentHighlight.material, { opacity: 0, duration: 0.2 });
      this.currentHighlight = null;
    }
  },

  showTablarInfo(rackId, shelf) {
    const boxes = findBoxesByRackShelf(rackId, shelf);
    const panel = document.getElementById('3d-info-panel');
    if (!panel) return;

    let html = `<div class="panel-label">${rackId} · Ebene ${shelf}</div>`;
    html += `<div class="panel-title">${boxes.length} Boxen</div>`;
    
    boxes.slice(0, 4).forEach(box => {
      const dept = DEPARTMENTS[box.department];
      html += `
        <div class="panel-item" onclick="App.showBoxDetail('${box.id}')">
          <span class="info-badge">${box.id}</span>
          <span class="dept-badge-sm" style="background:${dept.color}">${box.department}</span>
        </div>`;
    });
    
    if (boxes.length > 4) {
      html += `<div class="panel-more">+ ${boxes.length - 4} weitere</div>`;
    }

    panel.innerHTML = html;
    panel.classList.add('visible');
  },

  hideInfoPanel() {
    const panel = document.getElementById('3d-info-panel');
    if (panel) panel.classList.remove('visible');
  },

  // ==========================================
  // RENDER LOOP & RESIZE
  // ==========================================
  
  animate() {
    requestAnimationFrame(() => this.animate());
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  },

  onResize() {
    const container = document.getElementById('3d-viewport');
    if (!container || !this.renderer) return;
    
    const headerH = 56, tabbarH = 76, toolbarH = 44, legendH = 44;
    const availableH = window.innerHeight - headerH - tabbarH - toolbarH - legendH;
    container.style.height = Math.max(availableH, 300) + 'px';
    
    const w = container.offsetWidth;
    const h = container.offsetHeight;
    if (w > 0 && h > 0) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }
  },
};
