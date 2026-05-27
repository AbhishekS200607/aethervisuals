(function() {
  'use strict';

  const SHIELD_ID = 'security-shield';
  const PRINTING_CLASS = 'is-printing';
  const BLOCKED_SHORTCUTS = new Set(['s', 'u', 'p', 'c', 'a', 'x']);
  const BLOCKED_DEVTOOLS_SHORTCUTS = new Set(['i', 'j', 'c', 'k']);
  const DEVTOOLS_SIZE_THRESHOLD = 160;
  const DEVTOOLS_TIMING_THRESHOLD = 100;

  let shieldTimer = null;
  let devtoolsOpen = false;

  const style = document.createElement('style');
  style.textContent = `
    html, body, img, .asset-wrapper, .lightbox {
      -webkit-user-select: none !important;
      user-select: none !important;
      -webkit-touch-callout: none !important;
    }

    .asset-wrapper img,
    #lightbox-img {
      pointer-events: none !important;
    }

    #${SHIELD_ID} {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(0, 0, 0, 0.96);
      color: #e8e8ed;
      font: 600 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      text-align: center;
    }

    body.${PRINTING_CLASS} > :not(#${SHIELD_ID}) {
      visibility: hidden !important;
    }

    @media print {
      body > :not(#${SHIELD_ID}) {
        display: none !important;
      }

      #${SHIELD_ID} {
        display: flex !important;
        position: fixed;
        inset: 0;
        background: #000 !important;
        color: #000 !important;
      }
    }
  `;
  document.head.appendChild(style);

  function ensureShield() {
    let shield = document.getElementById(SHIELD_ID);
    if (shield) return shield;

    shield = document.createElement('div');
    shield.id = SHIELD_ID;
    shield.setAttribute('role', 'alert');
    shield.setAttribute('aria-live', 'assertive');
    document.body.appendChild(shield);
    return shield;
  }

  function showShield(message, duration = 1800) {
    const shield = ensureShield();
    shield.textContent = message;
    shield.style.display = 'flex';

    if (shieldTimer) window.clearTimeout(shieldTimer);
    if (duration > 0) {
      shieldTimer = window.setTimeout(() => {
        if (!devtoolsOpen && !document.body.classList.contains(PRINTING_CLASS)) {
          shield.style.display = 'none';
        }
      }, duration);
    }
  }

  function hideShield() {
    if (shieldTimer) window.clearTimeout(shieldTimer);
    if (!devtoolsOpen && !document.body.classList.contains(PRINTING_CLASS)) {
      const shield = document.getElementById(SHIELD_ID);
      if (shield) shield.style.display = 'none';
    }
  }

  function blockEvent(event, message) {
    event.preventDefault();
    event.stopPropagation();
    showShield(message);
    return false;
  }

  function isBlockedShortcut(event) {
    const key = event.key.toLowerCase();
    const hasCommandKey = event.ctrlKey || event.metaKey;

    return (
      key === 'f12' ||
      key === 'printscreen' ||
      (hasCommandKey && BLOCKED_SHORTCUTS.has(key)) ||
      (hasCommandKey && event.shiftKey && BLOCKED_DEVTOOLS_SHORTCUTS.has(key)) ||
      (event.metaKey && event.altKey && BLOCKED_DEVTOOLS_SHORTCUTS.has(key))
    );
  }

  document.addEventListener('contextmenu', event => {
    blockEvent(event, 'Right click is disabled for protected assets.');
  });

  document.addEventListener('selectstart', event => {
    if (event.target.closest('input, textarea')) return;
    event.preventDefault();
  });

  document.addEventListener('copy', event => {
    blockEvent(event, 'Copy is disabled for protected assets.');
  });

  document.addEventListener('cut', event => {
    blockEvent(event, 'Cut is disabled for protected assets.');
  });

  document.addEventListener('dragstart', event => {
    if (event.target.closest('img, .asset-wrapper, .lightbox')) {
      blockEvent(event, 'Dragging protected assets is disabled.');
    }
  });

  document.addEventListener('keydown', event => {
    if (!isBlockedShortcut(event)) return;

    const key = event.key.toLowerCase();
    const message = key === 'printscreen'
      ? 'Screenshots are disabled for this protected view.'
      : 'This shortcut is disabled for protected assets.';

    blockEvent(event, message);
  }, true);

  document.addEventListener('keyup', event => {
    if (event.key.toLowerCase() !== 'printscreen') return;

    showShield('Screenshots are disabled for this protected view.');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText('Screenshots are disabled for this protected view.').catch(() => {});
    }
  }, true);

  window.addEventListener('beforeprint', event => {
    document.body.classList.add(PRINTING_CLASS);
    showShield('Printing is disabled for this protected view.', 0);
    event.preventDefault();
  });

  window.addEventListener('afterprint', () => {
    document.body.classList.remove(PRINTING_CLASS);
    hideShield();
  });

  function protectImages() {
    document.querySelectorAll('.asset-wrapper').forEach(wrapper => {
      wrapper.setAttribute('draggable', 'false');

      const img = wrapper.querySelector('img');
      if (img) {
        img.setAttribute('draggable', 'false');
        img.setAttribute('data-protected-asset', 'true');
      }

      if (wrapper.querySelector('.asset-overlay')) return;

      const overlay = document.createElement('div');
      overlay.className = 'asset-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.addEventListener('click', event => {
        event.stopPropagation();
        wrapper.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      wrapper.appendChild(overlay);
    });
  }

  function checkDevtoolsBySize() {
    const widthGap = window.outerWidth - window.innerWidth;
    const heightGap = window.outerHeight - window.innerHeight;
    return widthGap > DEVTOOLS_SIZE_THRESHOLD || heightGap > DEVTOOLS_SIZE_THRESHOLD;
  }

  function checkDevtoolsByTiming() {
    const start = performance.now();
    debugger;
    return performance.now() - start > DEVTOOLS_TIMING_THRESHOLD;
  }

  function checkDevtools() {
    const detected = checkDevtoolsBySize() || checkDevtoolsByTiming();
    if (detected === devtoolsOpen) return;

    devtoolsOpen = detected;
    if (devtoolsOpen) {
      showShield('Please close developer tools to view this protected content.', 0);
    } else {
      hideShield();
    }
  }

  window.addEventListener('load', () => {
    ensureShield();
    protectImages();
    checkDevtools();
  });

  window.addEventListener('resize', checkDevtools);

  new MutationObserver(protectImages).observe(document.body, {
    childList: true,
    subtree: true,
  });

  window.setInterval(checkDevtools, 1500);
})();
