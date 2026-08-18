(() => {
  'use strict';

  const buttons = Array.from(document.querySelectorAll('[data-copy-email]'));
  const status = document.querySelector('#copy-status');
  const source = document.querySelector('#email-copy-source');

  if (!buttons.length || !status || !source) {
    return;
  }

  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');

  const sourceValue = () => {
    if ('value' in source) {
      return source.value.trim();
    }

    return source.textContent.trim();
  };

  const fallbackCopy = () => {
    if (typeof source.select !== 'function') {
      return false;
    }

    const selectionStart = source.selectionStart;
    const selectionEnd = source.selectionEnd;

    try {
      source.focus({ preventScroll: true });
    } catch (_error) {
      source.focus();
    }

    source.select();

    if (typeof source.setSelectionRange === 'function') {
      source.setSelectionRange(0, sourceValue().length);
    }

    let copied = false;

    try {
      copied = document.execCommand('copy');
    } catch (_error) {
      copied = false;
    }

    if (
      typeof source.setSelectionRange === 'function' &&
      Number.isInteger(selectionStart) &&
      Number.isInteger(selectionEnd)
    ) {
      source.setSelectionRange(selectionStart, selectionEnd);
    }

    return copied;
  };

  const copyEmail = async (email) => {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(email);
        return true;
      } catch (_error) {
        // File URLs and restricted browsers may require the legacy selection fallback.
      }
    }

    return fallbackCopy();
  };

  buttons.forEach((button) => {
    const label = button.querySelector('[data-copy-label]') || button;
    const originalLabel = label.textContent;
    let restoreTimer = 0;

    button.addEventListener('click', async () => {
      const attributeEmail = button.dataset.email || button.getAttribute('data-copy-email');
      const email =
        attributeEmail && attributeEmail !== 'true' ? attributeEmail.trim() : sourceValue();

      window.clearTimeout(restoreTimer);
      button.disabled = true;

      const copied = email ? await copyEmail(email) : false;

      if (copied) {
        label.textContent = 'Copied';
        status.textContent = 'Email address copied to the clipboard.';
      } else {
        label.textContent = 'Copy failed';
        status.textContent =
          'Unable to copy automatically. Use the email link to copy it manually.';
      }

      button.disabled = false;
      button.focus();

      restoreTimer = window.setTimeout(() => {
        label.textContent = originalLabel;
      }, 2400);
    });
  });
})();
