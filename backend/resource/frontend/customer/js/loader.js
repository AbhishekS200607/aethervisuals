(async function() {
  const token = new URLSearchParams(window.location.search).get('token');

  if (!token) { showError('No access token provided. Please use the link sent by your designer.'); return; }

  try {
    const res = await fetch(`/api/client/view?token=${encodeURIComponent(token)}`);
    if (res.status === 429) { showError('Too many requests. Please wait a moment.'); return; }
    if (!res.ok) { showError('Invalid or expired link. Contact your designer.'); return; }

    const data = await res.json();
    document.getElementById('company-name').textContent = data.company.name;
    document.title = `${data.company.name} — AetherVisuals`;

    const grid = document.getElementById('asset-grid');
    grid.innerHTML = '';

    if (!data.assets.length) {
      grid.innerHTML = '<div class="loading-state">No assets available.</div>';
      return;
    }

    // Group by folder
    const byFolder = {};
    const folderNames = {};
    data.assets.forEach(a => {
      if (!byFolder[a.folder_id]) byFolder[a.folder_id] = [];
      byFolder[a.folder_id].push(a);
      folderNames[a.folder_id] = a.folder_name;
    });

    Object.entries(byFolder).forEach(([folderId, assets]) => {
      const header = document.createElement('h3');
      header.className = 'folder-header';
      header.textContent = folderNames[folderId] || 'Assets';
      grid.appendChild(header);

      assets.forEach(asset => {
        const wrapper = document.createElement('div');
        wrapper.className = 'asset-wrapper';

        if (asset.mime_type?.startsWith('image/')) {
          const proxyUrl = `/api/client/image/${asset.id}?token=${encodeURIComponent(token)}`;

          const img = document.createElement('img');
          img.src = proxyUrl;
          img.alt = asset.file_name;
          img.loading = 'lazy';
          wrapper.appendChild(img);

          // Click on wrapper (catches both img and overlay clicks)
          wrapper.style.cursor = 'pointer';
          wrapper.addEventListener('click', () => openLightbox(proxyUrl, asset.file_name));
        } else {
          const icon = document.createElement('div');
          icon.className = 'file-placeholder';
          icon.textContent = getFileIcon(asset.mime_type);
          wrapper.appendChild(icon);
        }

        const label = document.createElement('span');
        label.className = 'asset-label';
        label.textContent = asset.file_name;
        wrapper.appendChild(label);

        grid.appendChild(wrapper);
      });
    });

    startExpiryTimer(data.expires_in);

  } catch (err) {
    showError('Something went wrong. Please try again.');
  }

  // ── Lightbox ────────────────────────────────────────────────────────────────
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxName = document.getElementById('lightbox-name');

  function openLightbox(src, name) {
    lightboxImg.src = src;
    lightboxName.textContent = name;
    lightbox.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.add('hidden');
    lightboxImg.src = '';
    document.body.style.overflow = '';
  }

  document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function showError(msg) {
    document.getElementById('asset-grid').innerHTML = `<div class="error-state">${msg}</div>`;
    document.getElementById('company-name').textContent = 'AetherVisuals';
  }

  function getFileIcon(mimeType) {
    if (!mimeType) return '📄';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return '🗜';
    if (mimeType.includes('video')) return '🎬';
    if (mimeType.includes('font')) return '🔤';
    return '📄';
  }

  function startExpiryTimer(seconds) {
    const el = document.getElementById('expiry-timer');
    const elMobile = document.getElementById('mobile-timer');
    if (elMobile) elMobile.classList.remove('hidden');
    let remaining = seconds;
    const interval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(interval);
        document.body.innerHTML = '<div class="expired-overlay">This link has expired. Please request a new one from your designer.</div>';
        return;
      }
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      const text = `Assets available for ${m}m ${s.toString().padStart(2, '0')}s`;
      if (el) el.textContent = text;
      if (elMobile) elMobile.textContent = text;
    }, 1000);
  }
})();
