(() => {
  'use strict';

  const root = document.querySelector('[data-project-detail-root]');
  const projects = window.PROJECTS;
  const visuals = window.PROJECT_VISUALS;

  if (!root) {
    return;
  }

  const elements = {
    index: root.querySelector('[data-detail-index]'),
    category: root.querySelector('[data-detail-category]'),
    title: root.querySelector('[data-detail-title]'),
    role: root.querySelector('[data-detail-role]'),
    summary: root.querySelector('[data-detail-summary]'),
    tags: root.querySelector('[data-detail-tags]'),
    gallery: root.querySelector('[data-detail-gallery]'),
    brief: root.querySelector('[data-detail-brief]'),
    focus: root.querySelector('[data-detail-focus]'),
    challenge: root.querySelector('[data-detail-challenge]'),
    outcome: root.querySelector('[data-detail-outcome]'),
    approach: root.querySelector('[data-detail-approach]'),
    deliverables: root.querySelector('[data-detail-deliverables]'),
    back: root.querySelector('[data-detail-back]'),
    previous: root.querySelector('[data-detail-previous]'),
    next: root.querySelector('[data-detail-next]'),
  };

  if (!Array.isArray(projects) || !projects.length || !visuals) {
    elements.title.textContent = 'Project details unavailable';
    elements.summary.textContent = 'Return to the project index to explore the complete portfolio.';
    root.dataset.projectError = 'true';
    return;
  }

  const requestedId = new URLSearchParams(window.location.search).get('id');
  const matchedIndex = projects.findIndex((project) => project.id === requestedId);
  const activeIndex = matchedIndex >= 0 ? matchedIndex : 0;
  const project = projects[activeIndex];
  const previous = projects[(activeIndex - 1 + projects.length) % projects.length];
  const next = projects[(activeIndex + 1) % projects.length];
  document.title = `${project.title} | Osama Ebrahim Hasan`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', project.summary);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', document.title);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', project.summary);

  if (window.location.protocol !== 'file:') {
    const canonicalUrl = `${window.location.origin}${window.location.pathname}?id=${project.id}`;
    const assetRoot = window.location.pathname.replace(/project\.html$/, '');
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonicalUrl);
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonicalUrl);
    document.querySelector('meta[property="og:image"]')?.setAttribute(
      'content',
      `${window.location.origin}${assetRoot}assets/images/projects/${project.gallery[0]}-1200.jpg`,
    );
  }

  elements.index.textContent = project.index;
  elements.category.textContent = project.category;
  elements.title.textContent = project.title;
  elements.role.textContent = project.role;
  elements.summary.textContent = project.summary;
  elements.back.href = `projects.html#${project.anchor}`;

  project.tags.forEach((tag) => {
    const item = document.createElement('li');
    item.className = 'tag';
    item.textContent = tag;
    elements.tags.append(item);
  });

  project.brief.forEach((paragraph) => {
    const element = document.createElement('p');
    element.textContent = paragraph;
    elements.brief.append(element);
  });

  project.focus.forEach((item, index) => {
    const element = document.createElement('li');
    const number = document.createElement('span');
    const text = document.createElement('p');
    number.textContent = String(index + 1).padStart(2, '0');
    text.textContent = item;
    element.append(number, text);
    elements.focus.append(element);
  });

  elements.challenge.textContent = project.challenge;
  elements.outcome.textContent = project.outcome;

  project.approach.forEach((step) => {
    const item = document.createElement('li');
    const title = document.createElement('h4');
    const description = document.createElement('p');
    title.textContent = step.title;
    description.textContent = step.description;
    item.append(title, description);
    elements.approach.append(item);
  });

  project.deliverables.forEach((deliverable, index) => {
    const item = document.createElement('li');
    const number = document.createElement('span');
    const text = document.createElement('p');
    number.textContent = String(index + 1).padStart(2, '0');
    text.textContent = deliverable;
    item.append(number, text);
    elements.deliverables.append(item);
  });

  window.createProjectGallery?.({
    container: elements.gallery,
    visualIds: project.gallery,
    visuals,
  });

  const setPagerLink = (link, targetProject, direction) => {
    link.href = `project.html?id=${targetProject.id}`;
    link.querySelector('strong').textContent = targetProject.title;
    link.setAttribute('aria-label', `${direction} project: ${targetProject.title}`);
  };

  setPagerLink(elements.previous, previous, 'Previous');
  setPagerLink(elements.next, next, 'Next');
  root.dataset.projectIndex = project.index;
  root.dataset.projectReady = 'true';
})();
