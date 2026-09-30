const test = require('node:test');
const assert = require('node:assert/strict');
const { dateKey, dateDisplay, logicalFilename, safeFilename, shiftAt } = require('../lib/time');

test('formats daily document names', () => {
  assert.equal(dateDisplay('2026-09-14'), '09/14/26');
  assert.equal(logicalFilename('2026-09-14'), 'DAILY LOAD NOTES 09/14/26');
  assert.equal(safeFilename('2026-09-14', '.pdf'), 'DAILY LOAD NOTES 09-14-26.pdf');
});

test('uses Central Time for dates', () => {
  assert.equal(dateKey(new Date('2026-09-15T04:59:00.000Z')), '2026-09-14');
  assert.equal(dateKey(new Date('2026-09-15T05:01:00.000Z')), '2026-09-15');
});

test('changes to second shift at exactly 3:30 PM Central', () => {
  assert.equal(shiftAt(new Date('2026-09-14T20:29:59.000Z')), 1);
  assert.equal(shiftAt(new Date('2026-09-14T20:30:00.000Z')), 2);
});
