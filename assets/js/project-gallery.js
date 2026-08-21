(() => {
  'use strict';

  const createPicture = (visualId, visual, index) => {
    const picture = document.createElement('picture');
    const avif = document.createElement('source');
    const webp = document.createElement('source');
    const image = document.createElement('img');
    const isPrimary = index === 0;
    const sizes = isPrimary
      ? '(max-width: 48rem) calc(100vw - 2.25rem), 50rem'
      : '(max-width: 48rem) calc(100vw - 2.25rem), 28rem';
    const basePath = `assets/images/projects/${visualId}`;

    avif.type = 'image/avif';
    avif.srcset = `${basePath}-640.avif 640w, ${basePath}-1200.avif 1200w`;
    avif.sizes = sizes;
    webp.type = 'image/webp';
    webp.srcset = `${basePath}-640.webp 640w, ${basePath}-1200.webp 1200w`;
    webp.sizes = sizes;

    image.src = `${basePath}-1200.jpg`;
    image.width = 1200;
    image.height = 675;
    image.alt = visual.alt;
    image.decoding = 'async';

    if (isPrimary) {
      image.fetchPriority = 'high';
    }

    picture.append(avif, webp, image);
    return picture;
  };

  window.createProjectGallery = ({ container, visualIds, visuals }) => {
    if (!container || !visualIds?.length || !visuals) {
      return;
    }

    container.setAttribute('role', 'group');
    container.setAttribute('aria-label', 'Project visuals');

    visualIds.forEach((visualId, index) => {
      const visual = visuals[visualId];

      if (!visual) {
        return;
      }

      const figure = document.createElement('figure');
      const caption = document.createElement('figcaption');
      const number = document.createElement('span');
      const text = document.createElement('span');

      figure.className = `project-gallery__item${index === 0 ? ' project-gallery__item--primary' : ''}`;
      number.className = 'project-gallery__number';
      number.textContent = String(index + 1).padStart(2, '0');
      text.className = 'project-gallery__caption';
      text.textContent = visual.caption;

      caption.append(number, text);
      figure.append(createPicture(visualId, visual, index), caption);
      container.append(figure);
    });
  };
})();
