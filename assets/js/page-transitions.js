(() => {
  'use strict';

  if (
    window.location.protocol === 'file:' ||
    typeof window.Swup !== 'function' ||
    typeof window.SwupFadeTheme !== 'function' ||
    typeof window.SwupHeadPlugin !== 'function' ||
    typeof window.SwupBodyClassPlugin !== 'function' ||
    typeof window.SwupScriptsPlugin !== 'function' ||
    typeof window.SwupA11yPlugin !== 'function'
  ) {
    return;
  }

  const pageName = (url) => {
    const path = new URL(url, window.location.href).pathname;
    const name = path.split('/').filter(Boolean).pop() || 'index.html';

    return name === 'project.html' ? 'projects.html' : name;
  };

  const syncPrimaryNavigation = () => {
    const currentPage = pageName(window.location.href);

    document.querySelectorAll('.site-nav__link:not([download])').forEach((link) => {
      link.removeAttribute('aria-current');

      if (pageName(link.href) === currentPage) {
        link.setAttribute('aria-current', 'page');
      }
    });
  };

  const swup = new window.Swup({
    containers: ['#main-content', '#site-footer'],
    animateHistoryBrowsing: true,
    timeout: 8000,
    plugins: [
      new window.SwupHeadPlugin({ awaitAssets: true }),
      new window.SwupBodyClassPlugin({ prefix: 'page-' }),
      new window.SwupScriptsPlugin({ head: true, body: false, optin: true }),
      new window.SwupFadeTheme({ mainElement: '#main-content' }),
      new window.SwupA11yPlugin({
        headingSelector: ['#main-content h1', 'h1'],
        respectReducedMotion: true,
      }),
    ],
  });

  swup.hooks.on('page:view', syncPrimaryNavigation);
  syncPrimaryNavigation();

  window.portfolioPageTransitions = swup;
})();
