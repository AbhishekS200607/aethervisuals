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
  const card = document.querySelector(`.asset-card[data-id="${id}"]`);
  if (card) { card.style.transition = 'opacity 0.15s, transform 0.15s'; card.style.opacity = '0'; card.style.transform = 'scale(0.95)'; }
  const res = await apiFetch(`/api/admin/assets/${id}`, { method: 'DELETE' });
  if (res?.ok) { showDeleteToast('Asset'); await renderAssets(state.currentFolder.id); }
  else if (card) { card.style.opacity = '1'; card.style.transform = ''; }
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

  progressWrap.classList.add('hidden');
  progressBar.style.width = '0%';
  fileInput.value = '';
  await renderAssets(state.currentFolder.id);
  showUploadToast(done);
}

function showUploadToast(count) {
  showToast(
    `<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="8.5" stroke="#4ade80" stroke-width="1"/>
      <path d="M5 9.5l3 3 5-5" stroke="#4ade80" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
        stroke-dasharray="12" stroke-dashoffset="12">
        <animate attributeName="stroke-dashoffset" from="12" to="0" dur="0.35s" begin="0.1s" fill="freeze"/>
      </path>
    </svg>`,
    `${count} file${count > 1 ? 's' : ''} uploaded successfully`
  );
}

document.getElementById('btn-folder-link').addEventListener('click', () => {
  if (state.currentFolder) showFolderLink(state.currentFolder.id);
});

function showDeleteToast(label) {
  showToast(
    `<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="8.5" stroke="#f87171" stroke-width="1"/>
      <path d="M6 7h6M7.5 7V5.5h3V7M8 10v3M10 10v3" stroke="#f87171" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
        stroke-dasharray="20" stroke-dashoffset="20">
        <animate attributeName="stroke-dashoffset" from="20" to="0" dur="0.3s" begin="0.05s" fill="freeze"/>
      </path>
    </svg>`,
    `${label} deleted`
  );
}

function showToast(iconSvg, message) {
  const existing = document.getElementById('av-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'av-toast';
  toast.innerHTML = `${iconSvg}<span>${message}</span>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-show'));
  setTimeout(() => {
    toast.classList.remove('toast-show');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 3000);
}
