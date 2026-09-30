const TIME_ZONE = 'America/Chicago';

function parts(date = new Date()) {
  const values = {};
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') values[part.type] = part.value;
  }
  return values;
}

function dateKey(date = new Date()) {
  const p = parts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

function dateDisplay(key) {
  const [year, month, day] = key.split('-');
  return `${month}/${day}/${year.slice(-2)}`;
}

function logicalFilename(key) {
  return `DAILY LOAD NOTES ${dateDisplay(key)}`;
}

function safeFilename(key, extension = '') {
  const [year, month, day] = key.split('-');
  return `DAILY LOAD NOTES ${month}-${day}-${year.slice(-2)}${extension}`;
}

function shiftAt(date = new Date()) {
  const p = parts(date);
  const minutes = Number(p.hour) * 60 + Number(p.minute);
  return minutes >= 15 * 60 + 30 ? 2 : 1;
}

function centralTimestamp(isoString) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short'
  }).format(new Date(isoString));
}

module.exports = {
  TIME_ZONE,
  parts,
  dateKey,
  dateDisplay,
  logicalFilename,
  safeFilename,
  shiftAt,
  centralTimestamp
};
