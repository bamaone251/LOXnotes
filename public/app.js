const state = { day: null, sections: [], currentShift: 1, editId: null };
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Request failed.');
  return body;
}

async function init() {
  try {
    const [config, today] = await Promise.all([request('/api/config'), request('/api/today')]);
    state.sections = config.sections;
    state.day = today.day;
    state.currentShift = today.currentShift;
    populateSelects();
    fillHeader();
    render();
    updateClock();
    setInterval(updateClock, 1000);
    bindEvents();
  } catch (error) {
    toast(error.message);
  }
}

function populateSelects() {
  for (const select of [$('#sectionInput'), $('#editSection')]) {
    select.replaceChildren(...state.sections.map(section => new Option(section, section)));
  }
}

function fillHeader() {
  for (const [field, value] of Object.entries(state.day.header)) {
    const input = document.querySelector(`[name="${field}"]`);
    if (input) input.value = value;
  }
}

function render() {
  $('#filename').textContent = state.day.filename;
  $('#pdfButton').href = `/api/days/${state.day.date}/pdf`;
  const container = $('#sections');
  container.replaceChildren(...state.sections.map(renderSection));
}

function renderSection(section) {
  const entries = state.day.entries.filter(entry => entry.section === section);
  const wrapper = el('section', 'note-section');
  const header = el('div', 'note-section-header');
  const title = el('h2'); title.textContent = section;
  const count = el('span', 'count'); count.textContent = entries.length;
  header.append(title, count);
  const list = el('div', 'entry-list');
  if (!entries.length) {
    const empty = el('p', 'empty'); empty.textContent = 'No entries yet'; list.append(empty);
  } else {
    list.append(...entries.map(renderEntry));
  }
  wrapper.append(header, list);
  return wrapper;
}

function renderEntry(entry) {
  const article = el('article', `entry shift-${entry.shift}${entry.highlighted ? ' highlighted' : ''}`);
  const accent = el('div', 'entry-accent');
  const body = el('div');
  const meta = el('div', 'entry-meta');
  const timestamp = el('span'); timestamp.textContent = formatTimestamp(entry.createdAt);
  const shift = el('span'); shift.textContent = `${ordinal(entry.shift)} Shift`;
  meta.append(timestamp, shift);
  if (entry.enteredBy) { const by = el('span'); by.textContent = entry.enteredBy; meta.append(by); }
  if (entry.updatedAt !== entry.createdAt) { const edited = el('span'); edited.textContent = 'Edited'; meta.append(edited); }
  const text = el('p', 'entry-text'); text.textContent = entry.text;
  body.append(meta, text);
  const actions = el('div', 'entry-actions');
  const highlight = actionButton(entry.highlighted ? 'Unhighlight' : 'Highlight', () => toggleHighlight(entry));
  const edit = actionButton('Edit', () => openEdit(entry));
  const remove = actionButton('Delete', () => deleteEntry(entry), 'delete');
  actions.append(highlight, edit, remove);
  article.append(accent, body, actions);
  return article;
}

function bindEvents() {
  $('#noteForm').addEventListener('submit', addEntry);
  $('#editForm').addEventListener('submit', saveEdit);
  $('#archivesButton').addEventListener('click', openArchives);
  $$('[data-close]').forEach(button => button.addEventListener('click', () => $(`#${button.dataset.close}`).close()));
  let headerTimer;
  $$('.assignment-grid input').forEach(input => input.addEventListener('input', () => {
    $('#saveStatus').textContent = 'Saving…'; $('#saveStatus').classList.add('saving');
    clearTimeout(headerTimer);
    headerTimer = setTimeout(saveHeader, 500);
  }));
}

async function addEntry(event) {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  try {
    const result = await request('/api/today/entries', {
      method: 'POST',
      body: JSON.stringify({ section: $('#sectionInput').value, enteredBy: $('#enteredByInput').value, text: $('#noteInput').value })
    });
    state.day.entries.push(result.entry);
    $('#noteInput').value = '';
    render();
    toast(`Note added to ${result.entry.section}.`);
  } catch (error) { toast(error.message); }
  finally { button.disabled = false; }
}

async function saveHeader() {
  const header = {};
  $$('.assignment-grid input').forEach(input => { header[input.name] = input.value; });
  try {
    const result = await request('/api/today/header', { method: 'PATCH', body: JSON.stringify(header) });
    state.day.header = result.day.header;
    $('#saveStatus').textContent = 'Saved'; $('#saveStatus').classList.remove('saving');
  } catch (error) { $('#saveStatus').textContent = 'Not saved'; toast(error.message); }
}

async function toggleHighlight(entry) {
  try {
    const result = await request(`/api/entries/${entry.id}`, { method: 'PATCH', body: JSON.stringify({ highlighted: !entry.highlighted }) });
    replaceEntry(result.entry); render();
  } catch (error) { toast(error.message); }
}

function openEdit(entry) {
  state.editId = entry.id;
  $('#editSection').value = entry.section;
  $('#editEnteredBy').value = entry.enteredBy;
  $('#editText').value = entry.text;
  $('#editDialog').showModal();
}

async function saveEdit(event) {
  event.preventDefault();
  try {
    const result = await request(`/api/entries/${state.editId}`, {
      method: 'PATCH',
      body: JSON.stringify({ section: $('#editSection').value, enteredBy: $('#editEnteredBy').value, text: $('#editText').value })
    });
    replaceEntry(result.entry); render(); $('#editDialog').close(); toast('Note updated.');
  } catch (error) { toast(error.message); }
}

async function deleteEntry(entry) {
  if (!confirm('Delete this note? This cannot be undone.')) return;
  try {
    await request(`/api/entries/${entry.id}`, { method: 'DELETE' });
    state.day.entries = state.day.entries.filter(item => item.id !== entry.id);
    render(); toast('Note deleted.');
  } catch (error) { toast(error.message); }
}

async function openArchives() {
  try {
    const result = await request('/api/days');
    const list = $('#archiveList');
    list.replaceChildren(...result.days.map(day => {
      const item = el('div', 'archive-item');
      const info = el('div');
      const name = el('strong'); name.textContent = day.filename;
      const detail = el('small'); detail.textContent = `${day.entries} ${day.entries === 1 ? 'entry' : 'entries'}${day.archivedAt ? ' • Archived' : ' • Current'}`;
      info.append(name, detail);
      const link = el('a'); link.href = `/api/days/${day.date}/pdf`; link.textContent = 'PDF';
      item.append(info, link); return item;
    }));
    $('#archivesDialog').showModal();
  } catch (error) { toast(error.message); }
}

function updateClock() {
  const now = new Date();
  $('#clock').textContent = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(now);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const shift = Number(values.hour) * 60 + Number(values.minute) >= 930 ? 2 : 1;
  const badge = $('#shiftBadge'); badge.textContent = `${ordinal(shift)} Shift`; badge.classList.toggle('shift-2', shift === 2);
}

function replaceEntry(updated) {
  state.day.entries = state.day.entries.map(entry => entry.id === updated.id ? updated : entry);
}

function formatTimestamp(iso) {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' }).format(new Date(iso));
}

function ordinal(number) { return number === 1 ? '1st' : '2nd'; }
function el(tag, className = '') { const node = document.createElement(tag); if (className) node.className = className; return node; }
function actionButton(text, handler, className = '') { const button = el('button', className); button.type = 'button'; button.textContent = text; button.addEventListener('click', handler); return button; }
let toastTimer;
function toast(message) { const node = $('#toast'); node.textContent = message; node.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('show'), 2800); }

init();
