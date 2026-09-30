const PDFDocument = require('pdfkit');
const { centralTimestamp, dateDisplay } = require('./time');
const { SECTIONS } = require('./store');

const COLORS = {
  ink: '#17283a',
  muted: '#66758a',
  line: '#d5dde7',
  first: '#205a78',
  firstSoft: '#e8f4f9',
  second: '#68447d',
  secondSoft: '#f2ebf7',
  highlight: '#fff1a8'
};

function exportPdf(day, response) {
  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 42, right: 42, bottom: 44, left: 42 }, bufferPages: true });
  doc.pipe(response);

  drawHeader(doc, day);
  drawAssignments(doc, day.header);

  for (const section of SECTIONS) {
    drawSection(doc, section, day.entries.filter(entry => entry.section === section));
  }

  const pages = doc.bufferedPageRange();
  for (let i = pages.start; i < pages.start + pages.count; i += 1) {
    doc.switchToPage(i);
    doc.fontSize(8).fillColor(COLORS.muted)
      .text(`Load Desk Daily Notes  •  ${dateDisplay(day.date)}  •  Page ${i + 1} of ${pages.count}`, 42, 731, {
        align: 'center',
        width: 528,
        lineBreak: false
      });
  }
  doc.end();
}

function ensureRoom(doc, height) {
  if (doc.y + height > 724) doc.addPage();
}

function drawHeader(doc, day) {
  doc.roundedRect(42, 42, 528, 58, 5).fill(COLORS.first);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20).text('LOAD DESK DAILY NOTES', 56, 59);
  doc.fontSize(11).text(dateDisplay(day.date), 440, 64, { width: 112, align: 'right' });
  doc.y = 116;
  doc.fillColor(COLORS.ink).fontSize(10).text(day.filename, 42, doc.y, { align: 'center', width: 528 });
  doc.moveDown(1.2);
}

function drawAssignments(doc, header) {
  const rows = [
    ['1ST SHIFT LOAD DESK WOL', header.firstShiftLoadDeskWol || '—'],
    ['MID-SHIFT WOL', header.midShiftWol || '—'],
    ['2ND SHIFT LOAD DESK WOL', header.secondShiftLoadDeskWol || '—'],
    ['LOADING WOL', header.loadingWol || '—']
  ];
  const startY = doc.y;
  rows.forEach((row, index) => {
    const x = index % 2 === 0 ? 42 : 312;
    const y = startY + Math.floor(index / 2) * 34;
    doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(7).text(row[0], x, y, { width: 245 });
    doc.fillColor(COLORS.ink).font('Helvetica').fontSize(10).text(row[1], x, y + 10, { width: 245 });
  });
  doc.y = startY + 76;
}

function drawSection(doc, section, entries) {
  ensureRoom(doc, 58);
  const titleY = doc.y;
  doc.roundedRect(42, titleY, 528, 25, 3).fill('#eaf0f5');
  doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(10).text(section.toUpperCase(), 52, titleY + 8, { width: 500 });
  doc.y = titleY + 34;

  if (!entries.length) {
    doc.fillColor(COLORS.muted).font('Helvetica-Oblique').fontSize(9).text('No entries', 52, doc.y);
    doc.y += 23;
    return;
  }

  for (const entry of entries) drawEntry(doc, entry);
  doc.y += 7;
}

function drawEntry(doc, entry) {
  const meta = `${centralTimestamp(entry.createdAt)}  •  ${entry.shift === 1 ? '1st Shift' : '2nd Shift'}${entry.enteredBy ? `  •  ${entry.enteredBy}` : ''}`;
  const textHeight = doc.font('Helvetica').fontSize(9.5).heightOfString(entry.text, { width: 480, lineGap: 2 });
  const height = Math.max(48, textHeight + 29);
  ensureRoom(doc, height + 8);
  const y = doc.y;
  const fill = entry.highlighted ? COLORS.highlight : entry.shift === 1 ? COLORS.firstSoft : COLORS.secondSoft;
  const accent = entry.shift === 1 ? COLORS.first : COLORS.second;
  doc.roundedRect(42, y, 528, height, 4).fill(fill);
  doc.rect(42, y, 5, height).fill(accent);
  doc.fillColor(accent).font('Helvetica-Bold').fontSize(7.5).text(meta, 56, y + 9, { width: 495 });
  doc.fillColor(COLORS.ink).font('Helvetica').fontSize(9.5).text(entry.text, 56, y + 23, { width: 490, lineGap: 2 });
  doc.y = y + height + 7;
}

module.exports = { exportPdf };
