(() => {
  'use strict';

  const buttons = Array.from(document.querySelectorAll('[data-copy-email]'));
  const status = document.querySelector('#copy-status');
  const source = document.querySelector('#email-copy-source');

  const sourceValue = () => {
    if (!source) {
      return '';
    }

    if ('value' in source) {
      return source.value.trim();
    }

    return source.textContent.trim();
  };

  const fallbackCopy = () => {
    if (!source || typeof source.select !== 'function') {
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

  if (buttons.length && status && source) {
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');

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
  }

  const form = document.querySelector('[data-contact-form]');

  if (!form) {
    return;
  }

  const submitButton = form.querySelector('[data-contact-submit]');
  const whatsappButton = form.querySelector('[data-contact-whatsapp]');
  const whatsappLabel = whatsappButton?.querySelector('[data-whatsapp-label]');
  const formStatus = form.querySelector('[data-contact-status]');
  const originalSubmitLabel = submitButton ? submitButton.textContent : '';
  const originalWhatsappLabel = whatsappLabel ? whatsappLabel.textContent : '';

  const validateForm = () => {
    if (form.checkValidity()) {
      return true;
    }

    form.reportValidity();
    const firstInvalidField = form.querySelector(':invalid');
    firstInvalidField?.focus();
    return false;
  };

  const getMessageDetails = () => {
    const formData = new FormData(form);

    return {
      subject: String(formData.get('subject') || '').trim(),
      contactType: String(formData.get('contactType') || '').trim(),
      message: String(formData.get('message') || '').trim(),
    };
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    const recipient = form.dataset.recipient?.trim();
    const { subject, contactType, message } = getMessageDetails();

    if (!recipient) {
      if (formStatus) {
        formStatus.textContent = 'The email address is unavailable. Please use the direct email link.';
      }
      return;
    }

    const emailBody = [
      'Hello Osama,',
      '',
      message,
      '',
      `Contact type: ${contactType}`,
    ].join('\r\n');
    const mailtoUrl = `mailto:${recipient}?subject=${encodeURIComponent(`[${contactType}] ${subject}`)}&body=${encodeURIComponent(emailBody)}`;

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Opening email app…';
    }

    if (formStatus) {
      formStatus.textContent = 'Your email app should open with the message prepared.';
    }

    window.location.href = mailtoUrl;

    window.setTimeout(() => {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalSubmitLabel;
      }
    }, 1200);
  });

  whatsappButton?.addEventListener('click', () => {
    if (!validateForm()) {
      return;
    }

    const whatsappNumber = String(form.dataset.whatsappNumber || '').replace(/\D/g, '');
    const { subject, contactType, message } = getMessageDetails();

    if (!whatsappNumber) {
      if (formStatus) {
        formStatus.textContent = 'The WhatsApp number is unavailable. Please use the direct WhatsApp link.';
      }
      return;
    }

    const whatsappMessage = [
      'Hello Osama,',
      '',
      `Subject: ${subject}`,
      `Contact type: ${contactType}`,
      '',
      message,
    ].join('\n');
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

    whatsappButton.disabled = true;
    if (whatsappLabel) {
      whatsappLabel.textContent = 'Opening WhatsApp…';
    }

    if (formStatus) {
      formStatus.textContent = 'WhatsApp should open with your message prepared.';
    }

    window.location.href = whatsappUrl;

    window.setTimeout(() => {
      whatsappButton.disabled = false;
      if (whatsappLabel) {
        whatsappLabel.textContent = originalWhatsappLabel;
      }
    }, 1200);
  });
})();
