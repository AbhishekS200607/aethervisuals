// ─── View switcher ────────────────────────────────────────────────────────────
function showView(viewId) {
  ['view-companies', 'view-folders', 'view-assets'].forEach(id =>
    document.getElementById(id).classList.add('hidden')
  );
  document.getElementById(viewId).classList.remove('hidden');
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────
function updateBreadcrumb() {
  const bc = document.getElementById('breadcrumb');
  let html = '<a id="bc-home">Companies</a>';
  if (state.currentCompany) {
    html += ` / <a id="bc-company">${escHtml(state.currentCompany.name)}</a>`;
  }
  if (state.currentFolder) {
    html += ` / ${escHtml(state.currentFolder.name)}`;
  }
  bc.innerHTML = html;

  document.getElementById('bc-home')?.addEventListener('click', loadCompanies);
  document.getElementById('bc-company')?.addEventListener('click', () =>
    loadFolders(state.currentCompany.id, state.currentCompany.name)
  );
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Companies ────────────────────────────────────────────────────────────────
async function loadCompanies() {
  state.currentCompany = null;
  state.currentFolder = null;
  updateBreadcrumb();
  showView('view-companies');

  const res = await apiFetch('/api/admin/companies');
  if (!res) return;
  const companies = await res.json();
  const list = document.getElementById('companies-list');

  if (!companies.length) {
    list.innerHTML = '<div class="empty-state">No companies yet. Create one to get started.</div>';
    return;
  }

  list.innerHTML = companies.map(c => `
    <div class="card" data-id="${c.id}" data-name="${escHtml(c.name)}">
      <div class="card-name">${escHtml(c.name)}</div>
      <div class="card-meta">${escHtml(c.slug)}</div>
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
    card.addEventListener('click', () => loadFolders(id, name));
    card.querySelector('.btn-open').addEventListener('click', (e) => { e.stopPropagation(); loadFolders(id, name); });
    card.querySelector('.btn-link').addEventListener('click', (e) => { e.stopPropagation(); showCompanyLink(id); });
    card.querySelector('.btn-del').addEventListener('click', (e) => { e.stopPropagation(); deleteCompany(id); });
  });
}

document.getElementById('btn-new-company').addEventListener('click', () => {
  showModal('New Company', '<input type="text" id="input-company-name" placeholder="Company name" />', async () => {
    const name = document.getElementById('input-company-name').value.trim();
    if (!name) return;
    const res = await apiFetch('/api/admin/companies', { method: 'POST', body: JSON.stringify({ name }) });
    if (res?.ok) { hideModal(); loadCompanies(); }
  });
});

async function deleteCompany(id) {
  showModal(
    'Delete Company',
    '<p style="color:var(--text-muted)">This will delete all folders and assets. Cannot be undone.</p>',
    async () => {
      const res = await apiFetch(`/api/admin/companies/${id}`, { method: 'DELETE' });
      if (res?.ok) { hideModal(); loadCompanies(); }
    }
  );
}
