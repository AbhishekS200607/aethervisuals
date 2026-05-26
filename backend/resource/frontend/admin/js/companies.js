// ─── View switcher ────────────────────────────────────────────────────────────
function showView(viewId) {
  ['view-companies', 'view-folders', 'view-assets', 'view-logs'].forEach(id =>
    document.getElementById(id).classList.add('hidden')
  );
  document.getElementById(viewId).classList.remove('hidden');
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────
function updateBreadcrumb() {
  const bc = document.getElementById('breadcrumb');
  let html = '<a id="bc-home">Companies</a>';
  if (state.currentCompany) {
    html += '<span class="breadcrumb-sep">/</span>';
    html += `<a id="bc-company">${escHtml(state.currentCompany.name)}</a>`;
  }
  if (state.currentFolder) {
    html += '<span class="breadcrumb-sep">/</span>';
    html += `<span>${escHtml(state.currentFolder.name)}</span>`;
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
    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏢</div><p>No companies yet. Create one to get started.</p></div>';
    document.getElementById('companies-count').textContent = '';
    return;
  }

  document.getElementById('companies-count').textContent = `${companies.length}`;

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
  const card = document.querySelector(`.card[data-id="${id}"]`);
  if (card) { card.style.transition = 'opacity 0.15s, transform 0.15s'; card.style.opacity = '0'; card.style.transform = 'scale(0.95)'; }
  const res = await apiFetch(`/api/admin/companies/${id}`, { method: 'DELETE' });
  if (res?.ok) { showDeleteToast('Company'); loadCompanies(); }
  else if (card) { card.style.opacity = '1'; card.style.transform = ''; }
}
