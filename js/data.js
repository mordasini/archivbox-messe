// ==========================================
// DATA LAYER - ArchivBox Manager v2
// ==========================================

const DEPARTMENTS = {
  "Finanzen":         { color: "#00A99D", colorLight: "#E6F9F7" },
  "Personal":         { color: "#E8913A", colorLight: "#FEF3E2" },
  "Bauamt":           { color: "#5B6ABF", colorLight: "#EDEFFA" },
  "Gemeinderat":      { color: "#C94040", colorLight: "#FDEAEA" },
  "Einwohnerdienste": { color: "#4A9B4A", colorLight: "#E8F5E8" },
};

const DEPOT_CONFIG = {
  name: "Muster-Archiv – Gemeinde Musterlingen",
  racks: {
    R01: { shelves: 5, trays: 6, isMesse: false, height: 2.5, length: 6.0 },
    R02: { shelves: 3, trays: 1, isMesse: true,  height: 0.9, length: 1.0, boxesPerTray: 8 },
    R03: { shelves: 3, trays: 1, isMesse: true,  height: 0.9, length: 1.0, boxesPerTray: 8 },
    R04: { shelves: 5, trays: 6, isMesse: false, height: 2.5, length: 6.0 },
  },
};

const STATUSES = {
  eingelagert: { label: "Eingelagert", color: "#10B981" },
  angefordert: { label: "Angefordert", color: "#F59E0B" },
  zur_entsorgung: { label: "Zur Entsorgung", color: "#EF4444" },
};

const LABELS = [
  "Jahresabschlüsse 2018–2022",
  "Steuerakten Unternehmen A-K",
  "Lohnabrechnungen 2020",
  "Baugesuche Quartier Nord",
  "Protokolle Gemeinderat 2019",
  "Einbürgerungsdossiers 2021",
  "Personalakten A–F",
  "Rechnungen Lieferanten Q1-Q4",
  "Bauabnahmen Gewerbegebiet",
  "Sitzungsprotokolle 2020–2022",
  "Steuererklärungen Privat L-Z",
  "Weiterbildungsnachweise",
  "Baubewilligungen 2022",
  "Abstimmungsprotokolle",
  "Meldewesen Zu- und Wegzüge",
  "Budgetunterlagen 2023",
  "Arbeitsverträge Archiv",
  "Planunterlagen Schulhaus",
  "Kommissionsakten Kultur",
  "Zivilstandsregister Backup",
];

const CONTENTS_POOL = [
  ["Bilanz 2018", "Bilanz 2019", "Bilanz 2020", "Erfolgsrechnung", "Anhang"],
  ["Steuerdossier Firma Müller AG", "Steuerdossier Meier GmbH", "Steuerdossier Schmidt & Co"],
  ["Lohnausweise Jan–Dez", "Sozialversicherungsabrechnungen", "Quellensteuer"],
  ["Baugesuch 2022-001", "Baugesuch 2022-002", "Statikbericht", "Umweltverträglichkeitsprüfung"],
  ["Protokoll Sitzung 12/2019", "Beschlussliste", "Anwesenheitsliste"],
  ["Dossier Antragsteller A", "Dossier Antragsteller B", "Sprachzertifikate"],
];

// Generate demo boxes
function generateDemoBoxes() {
  const boxes = [];
  let num = 1;
  const deptNames = Object.keys(DEPARTMENTS);
  const racks = Object.keys(DEPOT_CONFIG.racks);

  for (const rack of racks) {
    const cfg = DEPOT_CONFIG.racks[rack];
    const boxesPerTray = cfg.boxesPerTray || 1;
    
    for (let s = 1; s <= cfg.shelves; s++) {
      for (let t = 1; t <= cfg.trays; t++) {
        for (let b = 1; b <= boxesPerTray; b++) {
          if (Math.random() > 0.85) { num++; continue; }

          const dept = deptNames[num % deptNames.length];
          const label = LABELS[num % LABELS.length];
          const contents = CONTENTS_POOL[num % CONTENTS_POOL.length];

          const storeYear = 2020 + Math.floor(Math.random() * 5);
          const storeMonth = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
          const storeDay = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
          const retentionYear = storeYear + 10;

          let status = "eingelagert";
          const r = Math.random();
          if (r > 0.95) status = "angefordert";
          else if (r > 0.88) status = "zur_entsorgung";

          // Generate access count for hitlist
          const accessCount = Math.floor(Math.random() * 60);

          boxes.push({
            id: `DS-756-0126-${String(num).padStart(4, '0')}`,
            position: { rack, shelf: s, tray: t, slot: b },
            department: dept,
            label: label,
            contents: [...contents],
            status: status,
            storedSince: `${storeYear}-${storeMonth}-${storeDay}`,
            retentionUntil: `${retentionYear}-12-31`,
            accessCount: accessCount,
            lastAccessed: accessCount > 0 ? `2025-${String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')}-${String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')}` : null,
            photos: [],
            documents: [],
            notes: "",
          });
          num++;
        }
      }
    }
  }
  return boxes;
}

// Singleton data store
let DEMO_BOXES = null;

function getBoxes() {
  if (!DEMO_BOXES) {
    DEMO_BOXES = generateDemoBoxes();
  }
  return DEMO_BOXES;
}

// Helper functions
function findBoxById(id) {
  return getBoxes().find(b => b.id === id);
}

function findBoxesByRackShelf(rack, shelf) {
  return getBoxes().filter(b => b.position.rack === rack && b.position.shelf === shelf);
}

function findBoxesByStatus(status) {
  return getBoxes().filter(b => b.status === status);
}

function findBoxesByDepartment(dept) {
  return getBoxes().filter(b => b.department === dept);
}

function searchBoxes(query) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  
  return getBoxes().filter(b => 
    b.id.toLowerCase().includes(q) ||
    b.label.toLowerCase().includes(q) ||
    b.department.toLowerCase().includes(q) ||
    b.contents.some(c => c.toLowerCase().includes(q))
  );
}

function getTopAccessedBoxes(limit = 5) {
  return [...getBoxes()]
    .sort((a, b) => b.accessCount - a.accessCount)
    .slice(0, limit);
}

function getBoxesForDisposal() {
  return getBoxes().filter(b => b.status === "zur_entsorgung");
}

function getRequestedBoxes() {
  return getBoxes().filter(b => b.status === "angefordert");
}

function positionString(pos) {
  return `R${pos.rack.replace('R', '')} / S${String(pos.shelf).padStart(2, '0')} / T${String(pos.tray).padStart(2, '0')}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "–";
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

// Stats
function getStats() {
  const boxes = getBoxes();
  return {
    total: boxes.length,
    requested: boxes.filter(b => b.status === "angefordert").length,
    disposal: boxes.filter(b => b.status === "zur_entsorgung").length,
    departments: Object.keys(DEPARTMENTS).length,
  };
}
