(function() {
  'use strict';

  document.addEventListener('contextmenu', e => e.preventDefault());

  document.addEventListener('keydown', e => {
    const blocked = [
      e.ctrlKey && e.key === 's',
      e.ctrlKey && e.key === 'u',
      e.ctrlKey && e.key === 'c',
      e.ctrlKey && e.key === 'p',
      e.metaKey && e.key === 's',
      e.metaKey && e.key === 'c',
      e.key === 'PrintScreen',
      e.key === 'F12',
    ];
    if (blocked.some(Boolean)) e.preventDefault();
  });

  document.addEventListener('dragstart', e => {
    if (e.target.tagName === 'IMG') e.preventDefault();
  });

  // Apply protection styles — exclude lightbox image so clicks still work
  const style = document.createElement('style');
  style.textContent = `
    .asset-wrapper img {
      user-select: none !important;
      -webkit-user-select: none !important;
      -webkit-touch-callout: none !important;
      pointer-events: none !important;
    }
    #lightbox-img {
      user-select: none !important;
      -webkit-user-select: none !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);

  // Overlay intercepts right-click and drag but forwards left-click to open lightbox
  function protectImages() {
    document.querySelectorAll('.asset-wrapper').forEach(wrapper => {
      if (wrapper.querySelector('.asset-overlay')) return;
      const overlay = document.createElement('div');
      overlay.className = 'asset-overlay';

      // Forward clicks through overlay to the img underneath
      overlay.addEventListener('click', () => {
        const img = wrapper.querySelector('img');
        if (img) img.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      wrapper.appendChild(overlay);
    });
  }

  window.addEventListener('load', protectImages);
  new MutationObserver(protectImages).observe(document.body, { childList: true, subtree: true });

  // DevTools detection
  window.addEventListener('resize', () => {
    const threshold = 160;
    if (window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold) {
      document.body.innerHTML = '<div class="expired-overlay">Please close DevTools to view this content.</div>';
    }
  });

})();
