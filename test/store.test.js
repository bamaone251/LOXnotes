const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { NotesStore } = require('../lib/store');

test('creates, updates, highlights, archives, and deletes a daily entry', () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'load-desk-notes-'));
  const store = new NotesStore(dataDir);
  const key = '2026-09-14';

  const day = store.ensureDay(key);
  assert.equal(day.filename, 'DAILY LOAD NOTES 09/14/26');

  store.updateHeader(key, { firstShiftLoadDeskWol: 'Andy' });
  const entry = store.addEntry(key, {
    section: 'Shipment Issues',
    text: 'Run 421 reviewed.',
    enteredBy: 'Andy',
    shift: 1
  });
  assert.equal(entry.shift, 1);

  const updated = store.updateEntry(entry.id, { highlighted: true, text: 'Run 421 resolved.' });
  assert.equal(updated.highlighted, true);
  assert.equal(updated.text, 'Run 421 resolved.');

  store.archiveDay(key);
  const archivePath = path.join(dataDir, 'archives', 'DAILY LOAD NOTES 09-14-26.json');
  assert.equal(fs.existsSync(archivePath), true);
  assert.equal(JSON.parse(fs.readFileSync(archivePath, 'utf8')).entries[0].highlighted, true);

  store.deleteEntry(entry.id);
  assert.equal(store.getDay(key).entries.length, 0);
  assert.equal(JSON.parse(fs.readFileSync(archivePath, 'utf8')).entries.length, 0);
});
