const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { dateKey, logicalFilename, safeFilename } = require('./time');

const SECTIONS = [
  'Notes',
  'Equipment Moves',
  'Shipment Issues',
  'PLB Info',
  'Dock Talk',
  'Must Do',
  'Handoff to 2nd Shift',
  'End-of-Day / Next-Day Carryover'
];

const HEADER_FIELDS = [
  'firstShiftLoadDeskWol',
  'midShiftWol',
  'secondShiftLoadDeskWol',
  'loadingWol'
];

class NotesStore {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.archiveDir = path.join(dataDir, 'archives');
    this.dbPath = path.join(dataDir, 'notes-db.json');
    fs.mkdirSync(this.archiveDir, { recursive: true });
    this.db = this.load();
    this.archiveMissedDays();
    this.ensureDay(dateKey());
  }

  load() {
    if (!fs.existsSync(this.dbPath)) return { version: 1, days: {} };
    try {
      const parsed = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
      if (!parsed.days || typeof parsed.days !== 'object') throw new Error('Invalid database shape');
      return parsed;
    } catch (error) {
      const backup = `${this.dbPath}.corrupt-${Date.now()}`;
      fs.copyFileSync(this.dbPath, backup);
      console.error(`Could not read notes database. A backup was saved to ${backup}.`, error);
      return { version: 1, days: {} };
    }
  }

  save() {
    const tempPath = `${this.dbPath}.tmp`;
    fs.writeFileSync(tempPath, `${JSON.stringify(this.db, null, 2)}\n`, 'utf8');
    fs.renameSync(tempPath, this.dbPath);
  }

  ensureDay(key = dateKey()) {
    if (!this.db.days[key]) {
      const now = new Date().toISOString();
      this.db.days[key] = {
        date: key,
        filename: logicalFilename(key),
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
        header: {
          firstShiftLoadDeskWol: '',
          midShiftWol: '',
          secondShiftLoadDeskWol: '',
          loadingWol: ''
        },
        entries: []
      };
      this.save();
    }
    return this.db.days[key];
  }

  getDay(key) {
    return this.db.days[key] || null;
  }

  listDays() {
    return Object.values(this.db.days)
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(day => ({
        date: day.date,
        filename: day.filename,
        archivedAt: day.archivedAt,
        entries: day.entries.length,
        updatedAt: day.updatedAt
      }));
  }

  updateHeader(key, changes) {
    const day = this.ensureDay(key);
    for (const field of HEADER_FIELDS) {
      if (Object.hasOwn(changes, field)) day.header[field] = String(changes[field]).trim().slice(0, 80);
    }
    day.updatedAt = new Date().toISOString();
    this.saveAndRefreshArchive(day);
    return day;
  }

  addEntry(key, { section, text, enteredBy, shift }) {
    if (!SECTIONS.includes(section)) throw new Error('Invalid section');
    const cleanedText = String(text || '').trim();
    if (!cleanedText) throw new Error('Note text is required');
    const now = new Date().toISOString();
    const day = this.ensureDay(key);
    const entry = {
      id: crypto.randomUUID(),
      section,
      text: cleanedText.slice(0, 2000),
      enteredBy: String(enteredBy || '').trim().slice(0, 80),
      shift,
      highlighted: false,
      createdAt: now,
      updatedAt: now
    };
    day.entries.push(entry);
    day.updatedAt = now;
    this.saveAndRefreshArchive(day);
    return entry;
  }

  updateEntry(id, changes) {
    const found = this.findEntry(id);
    if (!found) return null;
    if (Object.hasOwn(changes, 'text')) {
      const text = String(changes.text || '').trim();
      if (!text) throw new Error('Note text is required');
      found.entry.text = text.slice(0, 2000);
    }
    if (Object.hasOwn(changes, 'section')) {
      if (!SECTIONS.includes(changes.section)) throw new Error('Invalid section');
      found.entry.section = changes.section;
    }
    if (Object.hasOwn(changes, 'enteredBy')) {
      found.entry.enteredBy = String(changes.enteredBy || '').trim().slice(0, 80);
    }
    if (Object.hasOwn(changes, 'highlighted')) found.entry.highlighted = Boolean(changes.highlighted);
    found.entry.updatedAt = new Date().toISOString();
    found.day.updatedAt = found.entry.updatedAt;
    this.saveAndRefreshArchive(found.day);
    return found.entry;
  }

  deleteEntry(id) {
    for (const day of Object.values(this.db.days)) {
      const index = day.entries.findIndex(entry => entry.id === id);
      if (index !== -1) {
        const [deleted] = day.entries.splice(index, 1);
        day.updatedAt = new Date().toISOString();
        this.saveAndRefreshArchive(day);
        return deleted;
      }
    }
    return null;
  }

  findEntry(id) {
    for (const day of Object.values(this.db.days)) {
      const entry = day.entries.find(item => item.id === id);
      if (entry) return { day, entry };
    }
    return null;
  }

  archiveDay(key = dateKey()) {
    const day = this.ensureDay(key);
    if (!day.archivedAt) day.archivedAt = new Date().toISOString();
    day.updatedAt = new Date().toISOString();
    this.save();
    this.writeArchive(day);
    return day;
  }

  archiveMissedDays() {
    const today = dateKey();
    let changed = false;
    for (const day of Object.values(this.db.days)) {
      if (day.date < today && !day.archivedAt) {
        day.archivedAt = new Date().toISOString();
        this.writeArchive(day);
        changed = true;
      }
    }
    if (changed) this.save();
  }

  saveAndRefreshArchive(day) {
    this.save();
    if (day.archivedAt) this.writeArchive(day);
  }

  writeArchive(day) {
    const archivePath = path.join(this.archiveDir, safeFilename(day.date, '.json'));
    fs.writeFileSync(archivePath, `${JSON.stringify(day, null, 2)}\n`, 'utf8');
  }
}

module.exports = { NotesStore, SECTIONS, HEADER_FIELDS };
