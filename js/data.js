// ==========================================
// DEMO DATA - ArchivBox Manager Messe
// ==========================================

const DEPARTMENTS = {
  "Finanzen":         { color: "#00A99D", color3d: 0x00A99D },
  "Personal":         { color: "#E8913A", color3d: 0xE8913A },
  "Bauamt":           { color: "#5B6ABF", color3d: 0x5B6ABF },
  "Gemeinderat":      { color: "#C94040", color3d: 0xC94040 },
  "Einwohnerdienste": { color: "#4A9B4A", color3d: 0x4A9B4A },
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

// Content templates
const LABELS = [
  "Jahresabschlüsse 2018–2022",
  "Personalakten A–F",
  "Baugesuche 2021",
  "Sitzungsprotokolle 2022",
  "Einbürgerungsakten 2019–2023",
  "Steuerunterlagen 2020",
  "Lohnabrechnungen 2021–2023",
  "Zonenplan-Revisionen",
  "Wahlunterlagen 2023",
  "Aufenthaltsbewilligungen 2020–22",
  "Revisionsberichte 2019",
  "Budgetplanung 2024",
  "Personalakten G–M",
  "Bauland-Verzeichnis",
  "Kommissionsberichte 2023",
  "Inventar Kulturgüter",
  "Versicherungspolicen",
  "Mietverträge Liegenschaften",
  "Schulratsprotokolle 2021",
  "Steuerdossiers N–Z",
];

const CONTENTS_POOL = [
  ["Jahresabschluss 2018", "Jahresabschluss 2019", "Jahresabschluss 2020", "Revisionsberichte 2018–2020"],
  ["Personalakten Ammann–Fischer", "Arbeitsverträge 2020", "Zeugnisse", "Weiterbildungsnachweise"],
  ["Baugesuche Quartier West", "Baubewilligungen 2021", "Planungsdokumente", "Einsprachen"],
  ["Sitzungsprotokolle Q1–Q4 2022", "Beschlüsse 2022", "Traktandenlisten"],
  ["Einbürgerungsakten 2019–2023", "Meldedaten", "Korrespondenz Bund"],
  ["Steuerunterlagen Juridische Personen", "Veranlagungen 2020", "Einsprachen"],
  ["Lohnabrechnungen Jan–Dez 2021", "Lohnabrechnungen 2022", "Lohnabrechnungen 2023", "Sozialversicherungen"],
  ["Zonenplan Revision 2019", "Umweltverträglichkeitsberichte", "Stellungnahmen Kanton"],
  ["Wahlunterlagen Gemeinderat 2023", "Abstimmungsresultate", "Stimmrechtsregister"],
  ["Aufenthaltsbewilligungen B 2020–2022", "Niederlassungsbewilligungen C", "Korrespondenz SEM"],
];

const STATUS_LABELS = {
  eingelagert: "Eingelagert",
  angefordert: "Angefordert",
  zur_entsorgung: "Zur Entsorgung",
};

const STATUS_COLORS = {
  eingelagert: "#00A99D",
  angefordert: "#E8913A",
  zur_entsorgung: "#C94040",
};

// Generate boxes
function generateDemoBoxes() {
  const boxes = [];
  let num = 1;
  const deptNames = Object.keys(DEPARTMENTS);
  const racks = Object.keys(DEPOT_CONFIG.racks);

  for (const rack of racks) {
    const cfg = DEPOT_CONFIG.racks[rack];
    const boxesPerTray = cfg.boxesPerTray || 1;  // Default 1 for ghost racks
    
    for (let s = 1; s <= cfg.shelves; s++) {
      for (let t = 1; t <= cfg.trays; t++) {
        for (let b = 1; b <= boxesPerTray; b++) {
          // ~85% filled
          if (Math.random() > 0.85) { num++; continue; }

          const dept = deptNames[num % deptNames.length];
          const label = LABELS[num % LABELS.length];
          const contents = CONTENTS_POOL[num % CONTENTS_POOL.length];

          // Realistic dates
          const storeYear = 2020 + Math.floor(Math.random() * 5);
          const storeMonth = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
          const storeDay = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
          const retentionYear = storeYear + 10;

          // Status distribution: 88% eingelagert, 5% angefordert, 7% zur_entsorgung
          let status = "eingelagert";
          const r = Math.random();
          if (r > 0.95) status = "angefordert";
          else if (r > 0.88) status = "zur_entsorgung";

          boxes.push({
            id: `DS-756-0126-${String(num).padStart(4, '0')}`,
            position: { rack, shelf: s, tray: t, slot: b },  // Added slot for position within tray
            department: dept,
            label: label,
            contents: [...contents],
            status: status,
            storedSince: `${storeYear}-${storeMonth}-${storeDay}`,
            retentionUntil: `${retentionYear}-12-31`,
            photos: [],
          });
          num++;
        }
      }
    }
  }
  return boxes;
}

// Singleton
const DEMO_BOXES = generateDemoBoxes();

// Lookup helpers
function findBoxById(id) {
  return DEMO_BOXES.find(b => b.id === id) || null;
}

function findBoxesByRackShelf(rack, shelf) {
  return DEMO_BOXES.filter(b => b.position.rack === rack && b.position.shelf === shelf);
}

function searchBoxes(query) {
  if (!query || query.trim().length === 0) return [];
  const q = query.toLowerCase().trim();
  return DEMO_BOXES.filter(b =>
    b.id.toLowerCase().includes(q) ||
    b.label.toLowerCase().includes(q) ||
    b.department.toLowerCase().includes(q) ||
    b.contents.some(c => c.toLowerCase().includes(q)) ||
    `${b.position.rack}-S${b.position.shelf}-T${String(b.position.tray).padStart(2,'0')}`.toLowerCase().includes(q)
  );
}

function getStats() {
  const total = Object.keys(DEPOT_CONFIG.racks).reduce((sum, r) => {
    const cfg = DEPOT_CONFIG.racks[r];
    return sum + cfg.shelves * cfg.trays;
  }, 0);
  return {
    totalCapacity: total,
    used: DEMO_BOXES.length,
    byDept: Object.keys(DEPARTMENTS).map(d => ({
      name: d,
      count: DEMO_BOXES.filter(b => b.department === d).length,
      color: DEPARTMENTS[d].color,
    })),
    byStatus: Object.keys(STATUS_LABELS).map(s => ({
      key: s,
      label: STATUS_LABELS[s],
      count: DEMO_BOXES.filter(b => b.status === s).length,
      color: STATUS_COLORS[s],
    })),
  };
}

function formatDate(dateStr) {
  if (!dateStr) return '–';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

function positionString(pos) {
  return `${pos.rack} · S${String(pos.shelf).padStart(2,'0')} · T${String(pos.tray).padStart(2,'0')}`;
}
