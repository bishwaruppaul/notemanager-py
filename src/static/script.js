/* ── State ── */
let state = {
  notes: [],
  tags: [],
  folders: [],
  selectedId: null,
  activeTag: '',
  activeFolder: '',
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
    delete: (tag) => fetch('/api/tags/' + encodeURIComponent(tag), {
      method: 'DELETE'
    }).then(r => r.json()),
  },
  folders: {
    list: () => fetch('/api/folders').then(r => r.json()),
    create: (name) => fetch('/api/folders', {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name})
    }).then(r => r.json()),
    delete: (name) => fetch('/api/folders/' + encodeURIComponent(name), {
      method: 'DELETE'
    }).then(r => r.json()),
  }
};

/* ── DOM refs ── */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const noteList = $('#note-list');
const tagList = $('#tag-list');
const folderList = $('#folder-list');
const editorEmpty = $('#editor-empty');
const editorContent = $('#editor-content');
const noteTitle = $('#note-title');
const tagPills = $('#tag-pills');
const tagInput = $('#tag-input');
const tagSuggestions = $('#tag-suggestions');
const noteContent = $('#note-content');
const notePreview = $('#note-preview');
const noteFolder = $('#note-folder');
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
      <span class="tag-dot"></span><span class="item-label">${escapeHtml(t.tag)}</span>
      <span class="count">${t.count}</span>
      <button class="item-remove" title="Remove tag">&times;</button>
    </div>`;
  }
  tagList.innerHTML = html;

  // highlight sidebar "All Notes"
  sidebarAll.classList.toggle('active', state.activeTag === '' && state.activeFolder === '');
  allCount.textContent = state.notes.length;
}

function renderFolderList() {
  let html = '';
  for (const f of state.folders) {
    const active = state.activeFolder === f.name ? ' active' : '';
    html += `<div class="folder-item ripple${active}" data-folder="${escapeHtml(f.name)}">
      <span class="folder-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
      </span><span class="item-label">${escapeHtml(f.name)}</span>
      <span class="count">${f.count}</span>
      <button class="item-remove" title="Remove folder">&times;</button>
    </div>`;
  }
  if (folderList) folderList.innerHTML = html;
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
    const folderBadge = n.folder ? `<span class="folder-pill"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg> ${escapeHtml(n.folder)}</span>` : '';
    html += `<div class="note-card ripple${active}" data-id="${escapeHtml(n.id)}">
      <div class="note-card-title">${escapeHtml(n.title)}</div>
      <div class="note-card-preview">${escapeHtml(n.preview || 'Empty note')}</div>
      <div class="note-card-meta">
        ${n.tags.length ? `<span class="note-card-tags">${tagsHtml}</span>` : ''}
        ${folderBadge}
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

function renderFolderSelector() {
  if (!noteFolder) return;
  const current = currentNoteContent.folder || '';
  let html = '<option value="">No folder</option>';
  for (const f of state.folders) {
    const sel = f.name === current ? ' selected' : '';
    html += `<option value="${escapeHtml(f.name)}"${sel}>${escapeHtml(f.name)}</option>`;
  }
  noteFolder.innerHTML = html;
  noteFolder.value = current;
}

/* ── Editor ── */

function showEditor(note) {
  editorEmpty.style.display = 'none';
  editorContent.style.display = 'flex';

  ignoreNextNoteSelect = true;
  noteTitle.value = note.title || '';
  currentNoteContent = { tags: [...(note.tags || [])], content: note.content || '', title: note.title || '', folder: note.folder || '' };
  renderTagPills();
  renderFolderSelector();
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
  const folder = noteFolder ? noteFolder.value : '';

  if (!state.selectedId) {
    saveStatus.className = '';
    saveStatus.textContent = 'Saving...';
    api.notes.create({ title, tags, content, folder }).then(result => {
      state.selectedId = result.id;
      currentNoteContent.title = result.id;
      currentNoteContent.folder = result.folder || '';
      saveStatus.className = 'saved';
      saveStatus.textContent = 'Saved';
      loadNotes();
      loadTags();
      loadFolders();
    }).catch(() => { saveStatus.className = 'error'; saveStatus.textContent = 'Error'; });
  } else {
    saveStatus.className = '';
    saveStatus.textContent = 'Saving...';
    api.notes.update(state.selectedId, { title, tags, content, folder }).then(result => {
      if (result.id !== state.selectedId) {
        state.selectedId = result.id;
        currentNoteContent.title = result.id;
      }
      currentNoteContent.folder = result.folder || '';
      saveStatus.className = 'saved';
      saveStatus.textContent = 'Saved';
      loadNotes();
      loadTags();
      loadFolders();
    }).catch(() => { saveStatus.className = 'error'; saveStatus.textContent = 'Error'; });
  }
}

/* ── Load ── */

function loadNotes() {
  const params = {};
  if (state.activeTag) params.tag = state.activeTag;
  if (state.activeFolder) params.folder = state.activeFolder;
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

function loadFolders() {
  api.folders.list().then(folders => {
    state.folders = folders;
    renderFolderList();
    renderFolderSelector();
  });
}

function loadAll() {
  loadNotes();
  loadTags();
  loadFolders();
}

/* ── Confirm dialog ── */

function showConfirm(msg) {
  return new Promise(resolve => {
    const modal = $('#confirm-modal');
    const msgEl = $('#confirm-msg');
    const okBtn = $('#confirm-ok');
    const cancelBtn = $('#confirm-cancel');
    msgEl.textContent = msg;
    modal.style.display = 'flex';
    function cleanup(result) {
      modal.style.display = 'none';
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      modal.removeEventListener('click', onBackdrop);
    }
    function onOk() { cleanup(true); resolve(true); }
    function onCancel() { cleanup(false); resolve(false); }
    function onBackdrop(e) { if (e.target === modal) { cleanup(false); resolve(false); } }
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    modal.addEventListener('click', onBackdrop);
  });
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
  if (themeLabel) themeLabel.textContent = THEMES[name].label;
  themeOptions.forEach(el => el.classList.toggle('active', el.dataset.value === name));
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
  state.activeFolder = '';
  sidebarAll.classList.add('active');
  document.querySelectorAll('.tag-item.active').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.folder-item.active').forEach(el => el.classList.remove('active'));
  searchInput.value = '';
  state.searchQuery = '';
  loadNotes();
});

// Sidebar - tag items (delegated)
tagList.addEventListener('click', (e) => {
  const remove = e.target.closest('.item-remove');
  if (remove) {
    const item = remove.closest('.tag-item');
    if (!item) return;
    const tag = item.dataset.tag;
    (async () => {
      if (!await showConfirm(`Remove tag "${tag}"? This will remove it from all notes.`)) return;
      api.tags.delete(tag).then(() => loadAll());
    })();
    return;
  }
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

// Sidebar - folder items (delegated)
if (folderList) {
  folderList.addEventListener('click', (e) => {
    const remove = e.target.closest('.item-remove');
    if (remove) {
      const item = remove.closest('.folder-item');
      if (!item) return;
      const folder = item.dataset.folder;
      const count = state.folders.find(f => f.name === folder)?.count || 0;
      const msg = count ? `Delete folder "${folder}" and all ${count} note(s) inside it?` : `Delete folder "${folder}"?`;
      (async () => {
        if (!await showConfirm(msg)) return;
        api.folders.delete(folder).then(() => {
          if (state.activeFolder === folder) {
            state.activeFolder = '';
            document.querySelectorAll('.sidebar-item.active').forEach(el => el.classList.remove('active'));
          }
          loadAll();
        });
      })();
      return;
    }
    const item = e.target.closest('.folder-item');
    if (!item) return;
    const folder = item.dataset.folder;
    state.activeFolder = folder;
    document.querySelectorAll('.folder-item.active').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sidebar-item.active').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    searchInput.value = '';
    state.searchQuery = '';
    loadNotes();
  });
}

// New folder button
const newFolderBtn = $('#new-folder-btn');
const newFolderInput = $('#new-folder-input');
if (newFolderBtn && newFolderInput) {
  newFolderBtn.addEventListener('click', () => {
    const name = newFolderInput.value.trim();
    if (!name) return;
    api.folders.create(name).then(() => {
      newFolderInput.value = '';
      loadFolders();
    }).catch(() => {});
  });
  newFolderInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') newFolderBtn.click();
  });
}

// Note list click (delegated)
noteList.addEventListener('click', (e) => {
  const card = e.target.closest('.note-card');
  if (!card) return;
  selectNote(card.dataset.id);
});

// New note
newNoteBtn.addEventListener('click', () => {
  state.selectedId = null;
  currentNoteContent = { tags: [], content: '', title: '', folder: '' };
  showEditor({ title: '', tags: [], content: '', content_html: '', folder: '' });
  noteTitle.focus();
  renderNoteList();
});

// Delete
deleteBtn.addEventListener('click', async () => {
  if (!state.selectedId) return;
  if (!await showConfirm('Delete this note?')) return;
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

// Folder change
if (noteFolder) {
  noteFolder.addEventListener('change', () => {
    currentNoteContent.folder = noteFolder.value;
    scheduleSave();
  });
}

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
    applyTheme(el.dataset.value);
    themeDropdown.classList.remove('open');
    themeBtn.querySelector('.chevron').classList.remove('open');
  });
});

// Close dropdown on outside click
document.addEventListener('click', () => {
  themeDropdown.classList.remove('open');
  themeBtn.querySelector('.chevron')?.classList.remove('open');
});

// Sidebar toggle on tablets
const menuBtn = $('#menu-btn');
const backdrop = $('#sidebar-backdrop');
if (menuBtn) {
  menuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    backdrop.classList.toggle('open');
  });
  backdrop.addEventListener('click', () => {
    sidebar.classList.remove('open');
    backdrop.classList.remove('open');
  });
}

// Markdown help modal
const mdHelpBtn = $('#md-help-btn');
const mdModal = $('#markdown-modal');
if (mdHelpBtn && mdModal) {
  mdHelpBtn.addEventListener('click', () => { mdModal.style.display = 'flex'; });
  mdModal.querySelector('.modal-close')?.addEventListener('click', () => { mdModal.style.display = 'none'; });
  mdModal.addEventListener('click', (e) => { if (e.target === mdModal) mdModal.style.display = 'none'; });
}

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

// Keep-alive heartbeat — server shuts down ~120s after last heartbeat
setInterval(() => { fetch('/api/heartbeat'); }, 30000);

// Update check
const updateBanner = $('#update-banner');
const updateText = updateBanner?.querySelector('.update-banner-text');
const updateLink = updateBanner?.querySelector('.update-banner-link');
const updateClose = updateBanner?.querySelector('.update-banner-close');

function checkForUpdate() {
  if (!updateBanner) return;
  fetch('/api/check-update')
    .then(r => r.json())
    .then(data => {
      if (!data.update_available) return;
      if (data.current_version === data.latest_version) return;
      const dismissed = localStorage.getItem('nm-update-dismissed');
      if (dismissed === data.latest_version) return;
      updateText.textContent = `A new version (v${data.latest_version}) is available.`;
      updateLink.href = data.download_url;
      updateBanner.style.display = 'flex';
    })
    .catch(() => {});
}

if (updateClose) {
  updateClose.addEventListener('click', () => {
    updateBanner.style.display = 'none';
    // Don't show again for this version
    fetch('/api/check-update')
      .then(r => r.json())
      .then(data => {
        if (data.latest_version) {
          localStorage.setItem('nm-update-dismissed', data.latest_version);
        }
      })
      .catch(() => {});
  });
}

// Shutdown server when tab closes
window.addEventListener('beforeunload', () => {
  navigator.sendBeacon('/api/shutdown');
});

/* ── Init ── */
initTheme();
loadAll();
checkForUpdate();
