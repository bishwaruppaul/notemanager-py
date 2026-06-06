/* ── State ── */
let state = {
  notes: [],
  tags: [],
  selectedId: null,
  activeTag: '',
  searchQuery: '',
};

let saveTimer = null;
let isSaving = false;
let currentNoteContent = { tags: [], content: '', title: '' };
let ignoreNextNoteSelect = false;

/* ── API ── */
const api = {
  notes: {
    list: (params = {}) => {
      const qs = new URLSearchParams();
      if (params.q) qs.set('q', params.q);
      if (params.tag) qs.set('tag', params.tag);
      const q = qs.toString();
      return fetch('/api/notes' + (q ? '?' + q : '')).then(r => r.json());
    },
    get: (id) => fetch('/api/notes/' + encodeURIComponent(id)).then(r => {
      if (!r.ok) throw new Error('Not found');
      return r.json();
    }),
    create: (data) => fetch('/api/notes', {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
    }).then(r => r.json()),
    update: (id, data) => fetch('/api/notes/' + encodeURIComponent(id), {
      method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
    }).then(r => r.json()),
    delete: (id) => fetch('/api/notes/' + encodeURIComponent(id), {
      method: 'DELETE'
    }).then(r => r.json()),
  },
  tags: {
    list: () => fetch('/api/tags').then(r => r.json()),
  }
};

/* ── DOM refs ── */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const noteList = $('#note-list');
const tagList = $('#tag-list');
const editorEmpty = $('#editor-empty');
const editorContent = $('#editor-content');
const noteTitle = $('#note-title');
const tagPills = $('#tag-pills');
const tagInput = $('#tag-input');
const tagSuggestions = $('#tag-suggestions');
const noteContent = $('#note-content');
const notePreview = $('#note-preview');
const saveStatus = $('#save-status');
const searchInput = $('#search-input');
const newNoteBtn = $('#new-note-btn');
const deleteBtn = $('#delete-btn');
const allCount = $('#all-count');
const sidebarAll = document.querySelector('.sidebar-item[data-tag=""]');
const themeBtn = $('#theme-btn');
const themeDropdown = $('#theme-dropdown');
const themeLabel = $('#theme-label');
const themeOptions = $$('.theme-option');
const sidebarFooter = document.querySelector('.sidebar-footer');

/* ── Render Functions ── */

function renderTagList() {
  let html = '';
  for (const t of state.tags) {
    const active = state.activeTag === t.tag ? ' active' : '';
    html += `<div class="tag-item ripple${active}" data-tag="${escapeHtml(t.tag)}">
      <span class="tag-dot"></span>${escapeHtml(t.tag)}
      <span class="count">${t.count}</span>
    </div>`;
  }
  tagList.innerHTML = html;

  // highlight sidebar "All Notes"
  sidebarAll.classList.toggle('active', state.activeTag === '');
  allCount.textContent = state.notes.length;
}

function renderNoteList() {
  if (state.notes.length === 0) {
    noteList.innerHTML = '<div class="empty-list">No notes yet. Click "+ New Note" to create one.</div>';
    return;
  }
  let html = '';
  for (const n of state.notes) {
    const active = n.id === state.selectedId ? ' active' : '';
    const tagsHtml = n.tags.map(t => `<span class="tag-pill">${escapeHtml(t)}</span>`).join('');
    const date = n.created ? n.created.split(',')[0] : '';
    html += `<div class="note-card ripple${active}" data-id="${escapeHtml(n.id)}">
      <div class="note-card-title">${escapeHtml(n.title)}</div>
      <div class="note-card-preview">${escapeHtml(n.preview || 'Empty note')}</div>
      <div class="note-card-meta">
        ${n.tags.length ? `<span class="note-card-tags">${tagsHtml}</span>` : ''}
        <span class="note-card-date">${escapeHtml(date)}</span>
      </div>
    </div>`;
  }
  noteList.innerHTML = html;
}

function renderTagPills() {
  tagPills.innerHTML = currentNoteContent.tags.map(t =>
    `<span class="tag-pill">${escapeHtml(t)}<span class="remove-tag" data-tag="${escapeHtml(t)}">&times;</span></span>`
  ).join('');
}

/* ── Editor ── */

function showEditor(note) {
  editorEmpty.style.display = 'none';
  editorContent.style.display = 'flex';

  ignoreNextNoteSelect = true;
  noteTitle.value = note.title || '';
  currentNoteContent = { tags: [...(note.tags || [])], content: note.content || '', title: note.title || '' };
  renderTagPills();
  noteContent.value = note.content || '';
  notePreview.innerHTML = note.content_html || '';
  saveStatus.className = '';
  saveStatus.textContent = '';
  ignoreNextNoteSelect = false;

  // mode
  const editBtn = document.querySelector('.tb-btn[data-mode="edit"]');
  const previewBtn = document.querySelector('.tb-btn[data-mode="preview"]');
  if (document.querySelector('.tb-btn.active')?.dataset.mode === 'preview') {
    noteContent.style.display = 'none';
    notePreview.style.display = 'block';
    editBtn.classList.remove('active');
    previewBtn.classList.add('active');
  } else {
    noteContent.style.display = 'block';
    notePreview.style.display = 'none';
    editBtn.classList.add('active');
    previewBtn.classList.remove('active');
  }
}

function showEmptyState() {
  editorEmpty.style.display = 'flex';
  editorContent.style.display = 'none';
  state.selectedId = null;
}

function selectNote(id) {
  if (id === state.selectedId) return;
  state.selectedId = id;
  if (!id) { showEmptyState(); renderNoteList(); return; }
  api.notes.get(id).then(note => {
    if (!note || note.error) { showEmptyState(); return; }
    showEditor(note);
    renderNoteList();
  }).catch(() => showEmptyState());
}

/* ── Auto-save ── */

function scheduleSave() {
  if (ignoreNextNoteSelect) return;
  if (!state.selectedId && !noteTitle.value.trim()) return;
  clearTimeout(saveTimer);
  saveStatus.className = '';
  saveStatus.textContent = 'Unsaved';
  saveTimer = setTimeout(doSave, 800);
}

function doSave() {
  const title = noteTitle.value.trim() || 'untitled';
  const content = noteContent.value || '';
  const tags = currentNoteContent.tags;

  if (!state.selectedId) {
    // create
    saveStatus.className = '';
    saveStatus.textContent = 'Saving...';
    api.notes.create({ title, tags, content }).then(result => {
      state.selectedId = result.id;
      currentNoteContent.title = result.id;
      saveStatus.className = 'saved';
      saveStatus.textContent = 'Saved';
      loadNotes();
    }).catch(() => { saveStatus.className = 'error'; saveStatus.textContent = 'Error'; });
  } else {
    saveStatus.className = '';
    saveStatus.textContent = 'Saving...';
    api.notes.update(state.selectedId, { title, tags, content }).then(result => {
      if (result.id !== state.selectedId) {
        state.selectedId = result.id;
        currentNoteContent.title = result.id;
      }
      saveStatus.className = 'saved';
      saveStatus.textContent = 'Saved';
      loadNotes();
    }).catch(() => { saveStatus.className = 'error'; saveStatus.textContent = 'Error'; });
  }
}

/* ── Load ── */

function loadNotes() {
  const params = {};
  if (state.activeTag) params.tag = state.activeTag;
  if (state.searchQuery) params.q = state.searchQuery;
  api.notes.list(params).then(notes => {
    state.notes = notes;
    renderNoteList();
    allCount.textContent = notes.length;
    if (state.selectedId && !notes.find(n => n.id === state.selectedId)) {
      showEmptyState();
    }
  });
}

function loadTags() {
  api.tags.list().then(tags => {
    state.tags = tags;
    renderTagList();
  });
}

function loadAll() {
  loadNotes();
  loadTags();
}

/* ── Helpers ── */
function escapeHtml(s) {
  if (typeof s !== 'string') return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

/* ── Theme System ── */

const THEMES = {
  'light':          { label: 'Light',     group: 'light' },
  'sepia':          { label: 'Sepia',     group: 'light' },
  'solarized-light':{ label: 'Solarized', group: 'light' },
  'one-dark':       { label: 'One Dark',  group: 'dark' },
  'nord':           { label: 'Nord',      group: 'dark' },
  'dracula':        { label: 'Dracula',   group: 'dark' },
};

function getSavedTheme() {
  return localStorage.getItem('nm-theme') || 'light';
}

function applyTheme(name) {
  document.documentElement.setAttribute('data-theme', name);
  localStorage.setItem('nm-theme', name);
  themeLabel.textContent = THEMES[name].label;
  themeOptions.forEach(el => el.classList.toggle('active', el.dataset.theme === name));
  // sun/moon icon visibility
  const isDark = THEMES[name].group === 'dark';
  document.querySelector('.theme-btn .icon-sun').style.display = isDark ? 'none' : '';
  document.querySelector('.theme-btn .icon-moon').style.display = isDark ? '' : 'none';
}

function initTheme() {
  const saved = getSavedTheme();
  applyTheme(saved);
}

/* ── Event Handlers ── */

// Sidebar - All Notes
sidebarAll.addEventListener('click', () => {
  state.activeTag = '';
  sidebarAll.classList.add('active');
  document.querySelectorAll('.tag-item.active').forEach(el => el.classList.remove('active'));
  searchInput.value = '';
  state.searchQuery = '';
  loadNotes();
});

// Sidebar - tag items (delegated)
tagList.addEventListener('click', (e) => {
  const item = e.target.closest('.tag-item');
  if (!item) return;
  const tag = item.dataset.tag;
  state.activeTag = tag;
  document.querySelectorAll('.tag-item.active').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.sidebar-item.active').forEach(el => el.classList.remove('active'));
  item.classList.add('active');
  searchInput.value = '';
  state.searchQuery = '';
  loadNotes();
});

// Note list click (delegated)
noteList.addEventListener('click', (e) => {
  const card = e.target.closest('.note-card');
  if (!card) return;
  selectNote(card.dataset.id);
});

// New note
newNoteBtn.addEventListener('click', () => {
  state.selectedId = null;
  currentNoteContent = { tags: [], content: '', title: '' };
  showEditor({ title: '', tags: [], content: '', content_html: '' });
  noteTitle.focus();
  renderNoteList();
});

// Delete
deleteBtn.addEventListener('click', () => {
  if (!state.selectedId) return;
  if (!confirm('Delete this note?')) return;
  api.notes.delete(state.selectedId).then(() => {
    showEmptyState();
    loadNotes();
    loadTags();
  });
});

// Search
searchInput.addEventListener('input', () => {
  state.searchQuery = searchInput.value.trim();
  if (!state.searchQuery && !state.activeTag) {
    loadNotes();
    return;
  }
  loadNotes();
});

// Title change
noteTitle.addEventListener('input', scheduleSave);

// Content change
noteContent.addEventListener('input', scheduleSave);

// Tag input
tagInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const val = tagInput.value.trim().replace(/,/g, '').replace(/\s+/g, ' ');
    if (val && !currentNoteContent.tags.includes(val)) {
      currentNoteContent.tags.push(val);
      renderTagPills();
      tagInput.value = '';
      tagSuggestions.style.display = 'none';
      scheduleSave();
    }
  }
  if (e.key === 'Backspace' && !tagInput.value && currentNoteContent.tags.length) {
    currentNoteContent.tags.pop();
    renderTagPills();
    scheduleSave();
  }
});

tagInput.addEventListener('input', () => {
  const val = tagInput.value.trim().toLowerCase();
  if (!val) { tagSuggestions.style.display = 'none'; return; }
  const matches = state.tags
    .map(t => t.tag)
    .filter(t => t.toLowerCase().startsWith(val) && !currentNoteContent.tags.includes(t));
  if (!matches.length) { tagSuggestions.style.display = 'none'; return; }
  tagSuggestions.innerHTML = matches.map(t => `<div data-tag="${escapeHtml(t)}">${escapeHtml(t)}</div>`).join('');
  tagSuggestions.style.display = 'block';
});

tagSuggestions.addEventListener('click', (e) => {
  const div = e.target.closest('[data-tag]');
  if (!div) return;
  const tag = div.dataset.tag;
  if (!currentNoteContent.tags.includes(tag)) {
    currentNoteContent.tags.push(tag);
    renderTagPills();
    scheduleSave();
  }
  tagInput.value = '';
  tagSuggestions.style.display = 'none';
});

// Remove tag (delegated)
tagPills.addEventListener('click', (e) => {
  const rem = e.target.closest('.remove-tag');
  if (!rem) return;
  const tag = rem.dataset.tag;
  currentNoteContent.tags = currentNoteContent.tags.filter(t => t !== tag);
  renderTagPills();
  scheduleSave();
});

// Edit/Preview toggle
document.querySelectorAll('.tb-btn[data-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tb-btn[data-mode]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const mode = btn.dataset.mode;
    if (mode === 'edit') {
      noteContent.style.display = 'block';
      notePreview.style.display = 'none';
    } else {
      noteContent.style.display = 'none';
      notePreview.style.display = 'block';
      // refresh preview
      if (state.selectedId) {
        api.notes.get(state.selectedId).then(n => {
          if (n && n.content_html) notePreview.innerHTML = n.content_html;
        });
      } else {
        // render locally
        notePreview.innerHTML = '<p><em>Save the note first to see the preview.</em></p>';
      }
    }
  });
});

// Theme dropdown toggle
themeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  themeDropdown.classList.toggle('open');
  themeBtn.querySelector('.chevron').classList.toggle('open');
});

// Theme option click
themeOptions.forEach(el => {
  el.addEventListener('click', () => {
    applyTheme(el.dataset.theme);
    themeDropdown.classList.remove('open');
    themeBtn.querySelector('.chevron').classList.remove('open');
  });
});

// Close dropdown on outside click
document.addEventListener('click', () => {
  themeDropdown.classList.remove('open');
  themeBtn.querySelector('.chevron')?.classList.remove('open');
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    clearTimeout(saveTimer);
    doSave();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    newNoteBtn.click();
  }
});

// Click outside tag suggestions
document.addEventListener('click', (e) => {
  if (!e.target.closest('#note-tags')) {
    tagSuggestions.style.display = 'none';
  }
});

/* ── Init ── */
initTheme();
loadAll();
