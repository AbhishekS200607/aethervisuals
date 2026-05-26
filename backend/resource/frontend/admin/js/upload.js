// ─── Assets ───────────────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function getFileIcon(mimeType) {
  if (!mimeType) return '📄';
  if (mimeType.includes('pdf')) return '📕';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return '🗜';
  if (mimeType.includes('video')) return '🎬';
  if (mimeType.includes('font')) return '🔤';
  return '📄';
}

async function loadAssets(folderId, folderName) {
  state.currentFolder = { id: folderId, name: folderName };
  updateBreadcrumb();
  showView('view-assets');
  document.getElementById('assets-title').textContent = `${folderName} — Assets`;
  await renderAssets(folderId);
}

async function renderAssets(folderId) {
  const res = await apiFetch(`/api/admin/folders/${folderId}/assets`);
  if (!res) return;
  const assets = await res.json(); // preview_url already included from backend
  const grid = document.getElementById('assets-list');

  if (!assets.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1">No assets yet. Upload files above.</div>';
    return;
  }

  grid.innerHTML = assets.map(a => `
    <div class="asset-card" data-id="${a.id}">
      ${a.mime_type?.startsWith('image/')
        ? `<img class="asset-thumb" src="${a.preview_url || ''}" alt="${escHtml(a.file_name)}" loading="lazy" />`
        : `<div class="asset-file-icon">${getFileIcon(a.mime_type)}</div>`
      }
      <div class="asset-info">
        <div class="asset-name" title="${escHtml(a.file_name)}">${escHtml(a.file_name)}</div>
        <div class="asset-size">${formatBytes(a.size_bytes)}</div>
      </div>
      <button class="asset-del">Delete</button>
    </div>
  `).join('');

  grid.querySelectorAll('.asset-card').forEach(card => {
    card.querySelector('.asset-del').addEventListener('click', () => deleteAsset(card.dataset.id));
  });
}

async function deleteAsset(id) {
  showModal(
    'Delete Asset',
    '<p style="color:var(--text-muted)">This will permanently delete this file.</p>',
    async () => {
      const res = await apiFetch(`/api/admin/assets/${id}`, { method: 'DELETE' });
      if (res?.ok) { hideModal(); await renderAssets(state.currentFolder.id); }
    }
  );
}

// ─── Drop zone & upload ───────────────────────────────────────────────────────
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  uploadFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', () => uploadFiles(fileInput.files));

async function uploadFiles(files) {
  if (!files.length || !state.currentFolder) return;

  const progressWrap = document.getElementById('upload-progress');
  const progressBar  = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');

  progressWrap.classList.remove('hidden');
  let done = 0;

  for (const file of files) {
    progressText.textContent = `Uploading ${file.name}…`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder_id', state.currentFolder.id);
    formData.append('company_id', state.currentCompany.id);

    const res = await apiFetch('/api/admin/assets', { method: 'POST', body: formData });
    if (!res) return;
    done++;
    progressBar.style.width = `${(done / files.length) * 100}%`;
  }

  progressText.textContent = `Done! ${done} file(s) uploaded.`;
  setTimeout(() => { progressWrap.classList.add('hidden'); progressBar.style.width = '0%'; }, 2000);

  fileInput.value = '';
  await renderAssets(state.currentFolder.id);
}

document.getElementById('btn-folder-link').addEventListener('click', () => {
  if (state.currentFolder) showFolderLink(state.currentFolder.id);
});
