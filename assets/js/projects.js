(() => {
  'use strict';

  const tabList = document.querySelector('[data-project-filter]');
  const panel = document.querySelector('#projects-panel');
  const status = document.querySelector('[data-project-status]');
  const backLink = document.querySelector('[data-project-back]');
  const projectsSection = tabList?.closest('.projects');

  if (!tabList || !panel || !projectsSection) {
    return;
  }

  const tabs = Array.from(tabList.querySelectorAll('[role="tab"]'));
  const cards = Array.from(panel.querySelectorAll('[data-project-group]'));

  if (!tabs.length || !cards.length) {
    return;
  }

  const selectCategory = (tab, { moveFocus = false } = {}) => {
    const category = tab.dataset.projectCategory;
    const label = tab.querySelector('span')?.textContent.trim() || tab.textContent.trim();
    let visibleCount = 0;

    tabs.forEach((item) => {
      const isSelected = item === tab;
      item.setAttribute('aria-selected', String(isSelected));
      item.tabIndex = isSelected ? 0 : -1;
    });

    projectsSection.dataset.activeProjectCategory = category;

    cards.forEach((card) => {
      const isVisible = card.dataset.projectGroup === category;
      card.hidden = !isVisible;
      visibleCount += Number(isVisible);
    });

    panel.setAttribute('aria-labelledby', tab.id);

    if (status) {
      status.textContent = `${visibleCount} ${visibleCount === 1 ? 'project' : 'projects'} shown in ${label}.`;
    }

    if (moveFocus) {
      tab.focus();
    }
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      selectCategory(tab);
    });

    tab.addEventListener('keydown', (event) => {
      let nextIndex = index;

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIndex = (index + 1) % tabs.length;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIndex = (index - 1 + tabs.length) % tabs.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = tabs.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      selectCategory(tabs[nextIndex], { moveFocus: true });
    });
  });

  backLink?.addEventListener('click', () => {
    const selectedTab = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true');

    window.requestAnimationFrame(() => {
      selectedTab?.focus({ preventScroll: true });
    });
  });

  const initialTab = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0];
  selectCategory(initialTab);
})();
