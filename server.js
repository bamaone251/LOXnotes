const path = require('node:path');
const express = require('express');
const cron = require('node-cron');
const { NotesStore, SECTIONS } = require('./lib/store');
const { TIME_ZONE, dateKey, shiftAt, safeFilename } = require('./lib/time');
const { exportPdf } = require('./lib/pdf');

const app = express();
const port = Number(process.env.PORT || 8083);
const dataDir = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const store = new NotesStore(dataDir);

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/config', (req, res) => {
  res.json({ sections: SECTIONS, timeZone: TIME_ZONE, shiftBoundary: '15:30' });
});

app.get('/api/today', (req, res) => {
  const now = new Date();
  res.json({ day: store.ensureDay(dateKey(now)), currentShift: shiftAt(now), serverTime: now.toISOString() });
});

app.get('/api/days', (req, res) => res.json({ days: store.listDays() }));

app.get('/api/days/:date', (req, res) => {
  const day = store.getDay(req.params.date);
  if (!day) return res.status(404).json({ error: 'Daily notes not found.' });
  return res.json({ day });
});

app.patch('/api/today/header', (req, res, next) => {
  try {
    res.json({ day: store.updateHeader(dateKey(), req.body || {}) });
  } catch (error) { next(error); }
});

app.post('/api/today/entries', (req, res, next) => {
  try {
    const now = new Date();
    const entry = store.addEntry(dateKey(now), { ...req.body, shift: shiftAt(now) });
    res.status(201).json({ entry });
  } catch (error) { next(error); }
});

app.patch('/api/entries/:id', (req, res, next) => {
  try {
    const entry = store.updateEntry(req.params.id, req.body || {});
    if (!entry) return res.status(404).json({ error: 'Note entry not found.' });
    return res.json({ entry });
  } catch (error) { next(error); }
});

app.delete('/api/entries/:id', (req, res) => {
  const entry = store.deleteEntry(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Note entry not found.' });
  return res.status(204).end();
});

app.get('/api/days/:date/pdf', (req, res, next) => {
  try {
    const day = store.getDay(req.params.date);
    if (!day) return res.status(404).json({ error: 'Daily notes not found.' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(day.date, '.pdf')}"`);
    return exportPdf(day, res);
  } catch (error) { return next(error); }
});

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  return res.status(400).json({ error: error.message || 'Request could not be completed.' });
});

cron.schedule('50 23 * * *', () => {
  const day = store.archiveDay(dateKey());
  console.log(`Archived ${day.filename}`);
}, { timezone: TIME_ZONE });

cron.schedule('0 0 * * *', () => {
  const day = store.ensureDay(dateKey());
  console.log(`Created ${day.filename}`);
}, { timezone: TIME_ZONE });

app.listen(port, '0.0.0.0', () => {
  console.log(`Load Desk Daily Notes is running at http://0.0.0.0:${port}`);
  console.log(`Daily archive: 11:50 PM ${TIME_ZONE}`);
});
