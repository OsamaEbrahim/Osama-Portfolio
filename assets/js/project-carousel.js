const DEFAULT_INTERVAL = 5000;

const createPicture = (visualId, visual, isFirst) => {
  const picture = document.createElement('picture');
  const avif = document.createElement('source');
  const webp = document.createElement('source');
  const image = document.createElement('img');
  const sizes = '(max-width: 48rem) calc(100vw - 2.25rem), 78rem';
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

  if (isFirst) {
    image.fetchPriority = 'high';
  } else {
    image.loading = 'lazy';
  }

  picture.append(avif, webp, image);
  return picture;
};

const createArrowButton = (direction) => {
  const button = document.createElement('button');
  const icon = document.createElement('img');
  const isPrevious = direction === 'previous';

  button.type = 'button';
  button.className = `project-carousel__arrow project-carousel__arrow--${isPrevious ? 'previous' : 'next'}`;
  button.setAttribute('aria-label', `${isPrevious ? 'Previous' : 'Next'} project image`);
  icon.src = `assets/icons/chevron-${isPrevious ? 'left' : 'right'}.svg`;
  icon.width = 24;
  icon.height = 24;
  icon.alt = '';
  button.append(icon);
  return button;
};

const createSlide = (visualId, visual, index, count) => {
  const figure = document.createElement('figure');
  const caption = document.createElement('figcaption');
  const captionText = document.createElement('span');

  figure.className = 'project-carousel__slide';
  figure.setAttribute('role', 'group');
  figure.setAttribute('aria-roledescription', 'slide');
  figure.setAttribute('aria-label', `${index + 1} of ${count}`);
  figure.hidden = index !== 0;

  captionText.textContent = visual.caption;
  caption.append(captionText);
  figure.append(createPicture(visualId, visual, index === 0), caption);
  return figure;
};

export const createProjectCarousel = ({
  container,
  visualIds,
  visuals,
  interval = DEFAULT_INTERVAL,
}) => {
  if (!container || !visualIds?.length) {
    return null;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const track = document.createElement('div');
  const controls = document.createElement('div');
  const status = document.createElement('p');
  const toggle = document.createElement('button');
  const previous = createArrowButton('previous');
  const next = createArrowButton('next');
  const slides = visualIds.map((visualId, index) =>
    createSlide(visualId, visuals[visualId], index, visualIds.length),
  );
  let activeIndex = 0;
  let timer = 0;
  let userPaused = false;
  let interactionPaused = false;

  container.setAttribute('role', 'region');
  container.setAttribute('aria-roledescription', 'carousel');
  container.setAttribute('aria-label', 'Project visuals');
  track.className = 'project-carousel__track';
  controls.className = 'project-carousel__controls';
  status.className = 'project-carousel__status';
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  toggle.type = 'button';
  toggle.className = 'project-carousel__toggle';

  track.append(...slides, previous, next);
  controls.append(status, toggle);
  container.append(track, controls);

  const syncToggle = () => {
    const autoRotationAvailable = !reducedMotion.matches;
    toggle.hidden = !autoRotationAvailable;
    toggle.textContent = userPaused ? 'Resume rotation' : 'Pause rotation';
    toggle.setAttribute('aria-pressed', String(userPaused));
  };

  const updateStatus = () => {
    status.textContent = `Image ${activeIndex + 1} of ${visualIds.length}`;
  };

  const stop = () => {
    window.clearInterval(timer);
    timer = 0;
  };

  const canRotate = () =>
    !reducedMotion.matches &&
    !userPaused &&
    !interactionPaused &&
    !document.hidden;

  const syncLiveRegion = () => {
    status.setAttribute('aria-live', canRotate() ? 'off' : 'polite');
  };

  const start = () => {
    stop();
    syncLiveRegion();

    if (!canRotate()) {
      return;
    }

    timer = window.setInterval(() => {
      show(activeIndex + 1, { restart: false });
    }, interval);
  };

  const show = (nextIndex, { restart = true } = {}) => {
    activeIndex = (nextIndex + slides.length) % slides.length;
    slides.forEach((slide, index) => {
      slide.hidden = index !== activeIndex;
    });
    syncLiveRegion();
    updateStatus();

    if (restart) {
      start();
    }
  };

  const pauseForInteraction = () => {
    interactionPaused = true;
    stop();
  };

  const resumeAfterInteraction = (event) => {
    if (event.type === 'focusout' && container.contains(event.relatedTarget)) {
      return;
    }

    interactionPaused = false;
    start();
  };

  previous.addEventListener('click', () => show(activeIndex - 1));
  next.addEventListener('click', () => show(activeIndex + 1));
  toggle.addEventListener('click', () => {
    userPaused = !userPaused;
    syncToggle();
    start();
  });
  container.addEventListener('mouseenter', pauseForInteraction);
  container.addEventListener('mouseleave', resumeAfterInteraction);
  container.addEventListener('focusin', pauseForInteraction);
  container.addEventListener('focusout', resumeAfterInteraction);
  document.addEventListener('visibilitychange', start);
  reducedMotion.addEventListener('change', () => {
    syncToggle();
    start();
  });

  syncToggle();
  updateStatus();
  start();

  return {
    next: () => show(activeIndex + 1),
    previous: () => show(activeIndex - 1),
    stop,
  };
};
