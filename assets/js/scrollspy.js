(() => {
  'use strict';

  const sections = Array.from(document.querySelectorAll('[data-section]')).filter(
    (section) => section.id,
  );
  const links = Array.from(document.querySelectorAll('.site-nav__link'));

  if (!sections.length || !links.length) {
    return;
  }

  const linksBySection = new Map();

  links.forEach((link) => {
    const href = link.getAttribute('href');

    if (!href || !href.includes('#')) {
      return;
    }

    try {
      const url = new URL(href, window.location.href);

      if (
        url.origin !== window.location.origin ||
        url.pathname !== window.location.pathname ||
        !url.hash
      ) {
        return;
      }

      const sectionId = decodeURIComponent(url.hash.slice(1));

      if (!linksBySection.has(sectionId)) {
        linksBySection.set(sectionId, []);
      }

      linksBySection.get(sectionId).push(link);
    } catch (_error) {
      // Ignore malformed or non-navigational href values.
    }
  });

  if (!linksBySection.size) {
    return;
  }

  let activeSectionId = '';

  const setActiveSection = (sectionId) => {
    if (!linksBySection.has(sectionId) || sectionId === activeSectionId) {
      return;
    }

    activeSectionId = sectionId;

    links.forEach((link) => {
      link.removeAttribute('aria-current');
    });

    linksBySection.get(sectionId).forEach((link) => {
      link.setAttribute('aria-current', 'page');
    });
  };

  const sectionAtReadingLine = () => {
    const readingLine = window.innerHeight * 0.35;
    let candidate = sections[0];

    sections.forEach((section) => {
      if (section.getBoundingClientRect().top <= readingLine) {
        candidate = section;
      }
    });

    return candidate;
  };

  const updateFromPosition = () => {
    const section = sectionAtReadingLine();

    if (section) {
      setActiveSection(section.id);
    }
  };

  const hashSectionId = (() => {
    if (!window.location.hash) {
      return '';
    }

    try {
      return decodeURIComponent(window.location.hash.slice(1));
    } catch (_error) {
      return '';
    }
  })();

  if (linksBySection.has(hashSectionId)) {
    setActiveSection(hashSectionId);
  } else {
    updateFromPosition();
  }

  window.addEventListener('hashchange', updateFromPosition);

  if ('IntersectionObserver' in window) {
    const visibleSections = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleSections.set(entry.target.id, entry.boundingClientRect.top);
          } else {
            visibleSections.delete(entry.target.id);
          }
        });

        if (visibleSections.size) {
          const nearest = Array.from(visibleSections.entries()).sort(
            ([, firstTop], [, secondTop]) => Math.abs(firstTop) - Math.abs(secondTop),
          )[0];

          setActiveSection(nearest[0]);
          return;
        }

        updateFromPosition();
      },
      {
        rootMargin: '-20% 0px -60% 0px',
        threshold: [0, 0.1, 0.5],
      },
    );

    sections.forEach((section) => observer.observe(section));
    return;
  }

  let ticking = false;

  const requestPositionUpdate = () => {
    if (ticking) {
      return;
    }

    ticking = true;
    window.requestAnimationFrame(() => {
      updateFromPosition();
      ticking = false;
    });
  };

  window.addEventListener('scroll', requestPositionUpdate, { passive: true });
  window.addEventListener('resize', requestPositionUpdate);
})();
