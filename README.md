# Osama Ebrahim Hasan - Personal Portfolio

A responsive, one-page portfolio for Osama Ebrahim Hasan. The visual direction combines a midnight editorial layout with restrained technical details, while the implementation stays lightweight, accessible, and easy to maintain.

## Run locally

No build step or package installation is required. Either open `index.html` directly in a modern browser or serve the folder locally:

```powershell
cd C:\Users\pc\Desktop\Osama-Portfolio
python -m http.server 8080
```

Then visit `http://localhost:8080`.

Serving the site is recommended when testing clipboard behavior because browsers may limit clipboard access on `file://` pages. The copy-email control includes a compatibility fallback.

## Project structure

```text
Osama-Portfolio/
|-- index.html
|-- README.md
`-- assets/
    |-- css/
    |   |-- tokens.css       # Design tokens, local fonts, and motion values
    |   |-- base.css         # Reset, typography, focus, and accessibility helpers
    |   |-- layout.css       # Containers, section rhythm, and shared grids
    |   |-- components.css   # Navigation, buttons, cards, tags, and timeline
    |   |-- sections.css     # Hero, impact, credentials, and contact treatments
    |   |-- responsive.css   # Mobile-first breakpoint adaptations
    |   `-- print.css        # Print and résumé-friendly output rules
    |-- js/
    |   |-- navigation.js    # Accessible mobile navigation and Escape handling
    |   |-- scrollspy.js     # Active-section navigation state
    |   |-- projects.js      # Accessible project-category tabs and filtering
    |   |-- reveal.js        # Progressive reveal with reduced-motion support
    |   |-- contact.js       # Clipboard action and status feedback
    |   `-- ambient.js       # Reactive circuit-network background
    |-- images/              # Portrait sources and local project illustrations
    |-- icons/               # Local interface and site icons
    |-- fonts/               # Self-hosted font files
    `-- documents/           # Downloadable résumé
```

## Maintenance

- Edit page copy and section order in `index.html`.
- Keep the seven stylesheet links in their current order so foundational rules load before section and responsive overrides.
- Use semantic design tokens from `assets/css/tokens.css` instead of introducing one-off colors or spacing values.
- Keep JavaScript behavior in the existing focused files and use `data-*` attributes as behavior hooks rather than styling hooks.
- The ambient background combines local CSS gradients with a lightweight circuit-network canvas, cursor scanner, scroll-driven data traffic, moving packets, and click/tap signal propagation; it does not depend on a remote visual asset or animation library.
- Preserve the `profile`, `experience`, `impact`, `projects`, `expertise`, `credentials`, and `contact` section IDs; navigation and active-section tracking depend on them.
- Replace the SVG files in `assets/images/projects/` when approved project screenshots or custom artwork become available; retain their filenames to avoid editing the page markup.
- When replacing the portrait, regenerate both optimized 800px sources and keep the original JPEG fallback at the existing filenames.
- When replacing the résumé, retain the filename `assets/documents/osama-ebrahim-hasan-resume.pdf` so the download link remains valid.

## Accessibility and progressive enhancement

The page uses semantic landmarks, sequential headings, keyboard-operable controls, a skip link, visible focus treatment, live status messaging, reserved image dimensions, and reduced-motion support. Core content, section navigation, the email link, and the résumé download remain available if JavaScript is disabled.

## Content and privacy

The public page intentionally includes only Osama's professional email address and Manama, Bahrain location. It omits phone details, credential identifiers, verification URLs, sensitive implementation details, and expired credentials. The downloadable résumé is an original supplied document and contains additional contact information.

## Browser support

The site targets current versions of Chrome, Edge, Firefox, and Safari. AVIF and WebP portrait sources are provided with a JPEG fallback for broader compatibility.
