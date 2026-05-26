// ─── Folders ──────────────────────────────────────────────────────────────────
async function loadFolders(companyId, companyName) {
  state.currentCompany = { id: companyId, name: companyName };
  state.currentFolder = null;
  updateBreadcrumb();
  showView('view-folders');
  document.getElementById('folders-title').textContent = `${companyName} — Folders`;

  const res = await apiFetch(`/api/admin/companies/${companyId}/folders`);
  if (!res) return;
  const folders = await res.json();
  const list = document.getElementById('folders-list');

  if (!folders.length) {
    list.innerHTML = '<div class="empty-state">No folders yet. Create one to organize assets.</div>';
    return;
  }

  list.innerHTML = folders.map(f => `
    <div class="card" data-id="${f.id}" data-name="${escHtml(f.name)}">
      <div class="card-name">📁 ${escHtml(f.name)}</div>
      <div class="card-meta">${new Date(f.created_at).toLocaleDateString()}</div>
      <div class="card-actions">
        <button class="btn-open">Open</button>
        <button class="btn-link">Link</button>
        <button class="btn-del">Delete</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.card').forEach(card => {
    const id = card.dataset.id;
    const name = card.dataset.name;
    card.addEventListener('click', () => loadAssets(id, name));
    card.querySelector('.btn-open').addEventListener('click', (e) => { e.stopPropagation(); loadAssets(id, name); });
    card.querySelector('.btn-link').addEventListener('click', (e) => { e.stopPropagation(); showFolderLink(id); });
    card.querySelector('.btn-del').addEventListener('click', (e) => { e.stopPropagation(); deleteFolder(id); });
  });
}

document.getElementById('btn-new-folder').addEventListener('click', () => {
  showModal('New Folder', '<input type="text" id="input-folder-name" placeholder="Folder name" />', async () => {
    const name = document.getElementById('input-folder-name').value.trim();
    if (!name || !state.currentCompany) return;
    const res = await apiFetch('/api/admin/folders', {
      method: 'POST',
      body: JSON.stringify({ company_id: state.currentCompany.id, name })
    });
    if (res?.ok) { hideModal(); loadFolders(state.currentCompany.id, state.currentCompany.name); }
  });
});

async function deleteFolder(id) {
  const card = document.querySelector(`.card[data-id="${id}"]`);
  if (card) { card.style.transition = 'opacity 0.15s, transform 0.15s'; card.style.opacity = '0'; card.style.transform = 'scale(0.95)'; }
  const res = await apiFetch(`/api/admin/folders/${id}`, { method: 'DELETE' });
  if (res?.ok) { showDeleteToast('Folder'); loadFolders(state.currentCompany.id, state.currentCompany.name); }
  else if (card) { card.style.opacity = '1'; card.style.transform = ''; }
}

document.getElementById('btn-company-link').addEventListener('click', () => {
  if (state.currentCompany) showCompanyLink(state.currentCompany.id);
});
