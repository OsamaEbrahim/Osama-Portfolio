(() => {
  'use strict';

  document.documentElement.classList.add('js');

  const toggle = document.querySelector('[data-nav-toggle]');
  const navigation = document.querySelector('#primary-navigation');

  if (!toggle || !navigation) {
    return;
  }

  const desktopMedia = window.matchMedia('(min-width: 64rem)');
  const links = navigation.querySelectorAll('.site-nav__link');

  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    document.body.classList.toggle('nav-open', open);
  };

  const closeNavigation = ({ returnFocus = false } = {}) => {
    if (!isOpen() && !document.body.classList.contains('nav-open')) {
      return;
    }

    setOpen(false);

    if (returnFocus) {
      toggle.focus();
    }
  };

  toggle.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('nav-open');

  toggle.addEventListener('click', () => {
    setOpen(!isOpen());
  });

  links.forEach((link) => {
    link.addEventListener('click', () => {
      closeNavigation();
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !isOpen()) {
      return;
    }

    event.preventDefault();
    closeNavigation({ returnFocus: true });
  });

  const handleDesktopChange = (event) => {
    if (event.matches) {
      closeNavigation();
    }
  };

  if (typeof desktopMedia.addEventListener === 'function') {
    desktopMedia.addEventListener('change', handleDesktopChange);
  } else {
    desktopMedia.addListener(handleDesktopChange);
  }
})();
