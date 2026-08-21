# Osama Ebrahim Hasan — Portfolio

A compact, responsive portfolio for Osama Ebrahim Hasan. The site keeps its midnight editorial character while organizing the content into three focused pages for faster scanning by hiring managers and technical decision-makers.

## Pages

- `index.html` — concise overview, professional proof, featured work, impact, and contact
- `projects.html` — complete portfolio with four accessible, filterable project categories
- `experience.html` — experience, expertise, credentials, awards, education, and languages

## Run locally

No build step or package installation is required. Serve the repository with any static web server:

```powershell
cd C:\Users\pc\Desktop\Osama-Portfolio
python -m http.server 8080
```

Then visit `http://localhost:8080`. A local server is recommended when testing clipboard behavior because browsers may restrict it on `file://` pages.

## Project structure

```text
Osama-Portfolio/
|-- index.html
|-- projects.html
|-- experience.html
|-- README.md
|-- scripts/
|   `-- prepare_assets.py       # Downloads and creates responsive image derivatives
`-- assets/
    |-- css/
    |   |-- tokens.css          # Design tokens, local fonts, and cascade layers
    |   |-- base.css            # Reset, typography, focus, and accessibility helpers
    |   |-- layout.css          # Containers and shared layout primitives
    |   |-- components.css      # Navigation, buttons, cards, tags, and timelines
    |   |-- sections.css        # Original section treatments
    |   |-- responsive.css      # Existing breakpoint adaptations
    |   |-- redesign.css        # Multi-page layouts and compact visual treatments
    |   `-- print.css           # Print-friendly output rules
    |-- js/
    |   |-- navigation.js       # Accessible mobile navigation and Escape handling
    |   |-- projects.js         # Project-category tabs, filtering, and deep links
    |   |-- reveal.js           # Progressive reveal with reduced-motion support
    |   |-- contact.js          # Clipboard action and status feedback
    |   `-- ambient.js          # Restrained desktop ambient canvas
    |-- images/
    |   |-- ATTRIBUTION.md      # Sources and usage notes for concept visuals
    |   |-- brands/             # Official institutional marks
    |   `-- projects/           # Local AVIF, WebP, and JPEG project visuals
    |-- icons/                  # Local interface icons
    |-- fonts/                  # Self-hosted font files
    `-- documents/              # Downloadable résumé
```

## Project visuals

Every stock image is labeled **Concept visual** in the interface and is never presented as an institutional screenshot or shipped deliverable. Sources, photographers, and retrieval dates are recorded in `assets/images/ATTRIBUTION.md`.

The checked-in responsive assets are ready to use. To regenerate them, install Pillow in a Python environment with AVIF support and run:

```powershell
python scripts/prepare_assets.py
```

When genuine personal-project screenshots become available, replace each project’s `640` and `1200` AVIF/WebP files plus its `1200` JPEG fallback while retaining the filenames and 16:9 dimensions.

## Maintenance

- Preserve the public anchors `#projects`, `#project-categories`, `#credentials`, and `#contact`.
- Keep project filtering hooks (`data-project-*`) in `projects.html`; `projects.js` depends on that contract.
- Use semantic design tokens from `assets/css/tokens.css` instead of one-off color values where practical.
- Keep a unique page title, description, canonical URL, and social-sharing metadata on every page.
- Use only account-issued Microsoft, AWS, and PMI badge files when replacing the current text issuer marks.
- Retain `assets/documents/osama-ebrahim-hasan-resume.pdf` when updating the résumé so existing links remain valid.
- The ambient canvas is intentionally disabled on mobile and for reduced-motion users.

## Accessibility and progressive enhancement

The site uses semantic landmarks, sequential headings, keyboard-operable tabs, a skip link, visible focus treatment, live filtering status, reserved image dimensions, meaningful alternative text, and reduced-motion support. Without JavaScript, all project cards remain visible and the cross-page navigation, email link, and résumé download still work.

## Content and privacy

The public pages intentionally include only Osama’s professional email address and Manama, Bahrain location. They omit phone details, credential identifiers, verification URLs, confidential screenshots, client identities, sensitive implementation details, and unsupported metrics. The downloadable résumé is an original supplied document and contains additional contact information.

## Browser support

The site targets current Chrome, Edge, Firefox, and Safari releases. Responsive AVIF and WebP project and portrait sources include JPEG fallbacks for broader compatibility.
