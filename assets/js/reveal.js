(() => {
  'use strict';

  const items = Array.from(document.querySelectorAll('[data-reveal]'));

  if (!items.length) {
    return;
  }

  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let observer = null;

  const reveal = (item) => {
    item.classList.remove('is-reveal-pending');
    item.classList.add('is-revealed');

    if (observer) {
      observer.unobserve(item);
    }
  };

  const revealAll = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    items.forEach(reveal);
  };

  if (motionPreference.matches || !('IntersectionObserver' in window)) {
    revealAll();
    return;
  }

  const belowFoldItems = items.filter(
    (item) => item.getBoundingClientRect().top >= window.innerHeight,
  );

  items.forEach((item) => {
    if (belowFoldItems.includes(item)) {
      item.classList.add('is-reveal-pending');
    } else {
      item.classList.add('is-revealed');
    }
  });

  if (!belowFoldItems.length) {
    return;
  }

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          reveal(entry.target);
        }
      });
    },
    {
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.08,
    },
  );

  belowFoldItems.forEach((item) => observer.observe(item));

  const handleMotionChange = (event) => {
    if (event.matches) {
      revealAll();
    }
  };

  if (typeof motionPreference.addEventListener === 'function') {
    motionPreference.addEventListener('change', handleMotionChange, { once: true });
  } else {
    motionPreference.addListener(handleMotionChange);
  }
})();
