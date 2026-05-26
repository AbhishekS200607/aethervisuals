// ─── Link modal ───────────────────────────────────────────────────────────────
let _linkType = null;
let _linkId   = null;

async function showCompanyLink(companyId) {
  _linkType = 'company';
  _linkId   = companyId;
  const res = await apiFetch(`/api/admin/link/company/${companyId}`);
  if (!res) return;
  const { link } = await res.json();
  openLinkModal(link);
}

async function showFolderLink(folderId) {
  _linkType = 'folder';
  _linkId   = folderId;
  const res = await apiFetch(`/api/admin/link/folder/${folderId}`);
  if (!res) return;
  const { link } = await res.json();
  openLinkModal(link);
}

function openLinkModal(link) {
  document.getElementById('link-output').value = link;
  document.getElementById('link-modal-overlay').classList.remove('hidden');
}

document.getElementById('btn-copy-link').addEventListener('click', () => {
  const val = document.getElementById('link-output').value;
  navigator.clipboard.writeText(val).then(() => {
    const btn = document.getElementById('btn-copy-link');
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
  });
});

document.getElementById('btn-regen-link').addEventListener('click', () => {
  showModal(
    'Regenerate Link',
    '<p style="color:var(--text-muted)">The old link stops working immediately. Continue?</p>',
    async () => {
      const res = await apiFetch(`/api/admin/link/regenerate/${_linkType}/${_linkId}`, { method: 'POST' });
      if (!res) return;
      const { link } = await res.json();
      document.getElementById('link-output').value = link;
      hideModal();
    }
  );
});

document.getElementById('link-modal-close').addEventListener('click', () => {
  document.getElementById('link-modal-overlay').classList.add('hidden');
});
document.getElementById('link-modal-close-btn').addEventListener('click', () => {
  document.getElementById('link-modal-overlay').classList.add('hidden');
});

// ─── Generic modal helpers ────────────────────────────────────────────────────
function showModal(title, bodyHtml, onConfirm) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-confirm').onclick = onConfirm;
  document.getElementById('modal-overlay').classList.remove('hidden');
  setTimeout(() => document.querySelector('#modal-body input')?.focus(), 50);
}

function hideModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

document.getElementById('modal-cancel').addEventListener('click', hideModal);
document.getElementById('modal-x').addEventListener('click', hideModal);
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'modal-overlay') hideModal();
});
