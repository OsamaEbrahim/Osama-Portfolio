"""Run lightweight structural checks against the static portfolio pages."""

from __future__ import annotations

from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
PAGES = (
    "index.html",
    "projects.html",
    "project.html",
    "experience.html",
    "credentials.html",
    "contact.html",
)


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.references: list[tuple[str, str]] = []
        self.images: list[dict[str, str | None]] = []
        self.headings: list[int] = []
        self.titles = 0
        self.descriptions = 0
        self.canonicals = 0
        self.og_fields: set[str] = set()
        self.project_groups: list[str] = []
        self.project_tabs: list[str] = []
        self.concept_labels = 0
        self.project_detail_links = 0
        self.h1_count = 0
        self.inline_scripts = 0
        self.inline_style_blocks = 0
        self.inline_style_attributes = 0
        self.inline_event_handlers = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)

        if tag == "script" and not values.get("src"):
            self.inline_scripts += 1

        if tag == "style":
            self.inline_style_blocks += 1

        if "style" in values:
            self.inline_style_attributes += 1

        self.inline_event_handlers += sum(
            1 for attribute, _ in attrs if attribute.lower().startswith("on")
        )

        if element_id := values.get("id"):
            self.ids.append(element_id)

        if tag in {"a", "link", "script", "img", "source"}:
            for attribute in ("href", "src"):
                if reference := values.get(attribute):
                    self.references.append((attribute, reference))
            if srcset := values.get("srcset"):
                for candidate in srcset.split(","):
                    self.references.append(("srcset", candidate.strip().split()[0]))

        if tag == "img":
            self.images.append(values)

        if tag == "title":
            self.titles += 1

        if tag == "meta" and values.get("name") == "description":
            self.descriptions += 1

        if tag == "meta" and (property_name := values.get("property", "")).startswith("og:"):
            self.og_fields.add(property_name)

        if tag == "link" and values.get("rel") == "canonical":
            self.canonicals += 1

        if tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            level = int(tag[1])
            self.headings.append(level)
            self.h1_count += int(level == 1)

        if group := values.get("data-project-group"):
            self.project_groups.append(group)

        if category := values.get("data-project-category"):
            self.project_tabs.append(category)

        if "concept-label" in values.get("class", "").split():
            self.concept_labels += 1

        if "project-card__detail-link" in values.get("class", "").split():
            self.project_detail_links += 1


def parse_page(path: Path) -> PageParser:
    parser = PageParser()
    parser.feed(path.read_text(encoding="utf-8"))
    return parser


def local_target(page: Path, reference: str) -> tuple[Path, str] | None:
    parts = urlsplit(reference)
    if parts.scheme or parts.netloc or reference.startswith(("mailto:", "tel:", "javascript:")):
        return None

    target = (page.parent / unquote(parts.path)).resolve() if parts.path else page.resolve()
    return target, unquote(parts.fragment)


def main() -> None:
    errors: list[str] = []
    parsed = {name: parse_page(ROOT / name) for name in PAGES}
    ids_by_path = {(ROOT / name).resolve(): set(parser.ids) for name, parser in parsed.items()}

    for name, parser in parsed.items():
        page = ROOT / name
        duplicate_ids = [item for item, count in Counter(parser.ids).items() if count > 1]
        if duplicate_ids:
            errors.append(f"{name}: duplicate IDs: {', '.join(duplicate_ids)}")

        if parser.h1_count != 1:
            errors.append(f"{name}: expected one h1, found {parser.h1_count}")

        for previous, current in zip(parser.headings, parser.headings[1:]):
            if current > previous + 1:
                errors.append(f"{name}: heading skips from h{previous} to h{current}")

        if (parser.titles, parser.descriptions, parser.canonicals) != (1, 1, 1):
            errors.append(
                f"{name}: expected one title, description, and canonical; found "
                f"{parser.titles}, {parser.descriptions}, {parser.canonicals}"
            )

        inline_assets = {
            "inline scripts": parser.inline_scripts,
            "style blocks": parser.inline_style_blocks,
            "style attributes": parser.inline_style_attributes,
            "inline event handlers": parser.inline_event_handlers,
        }
        if found_inline := [label for label, count in inline_assets.items() if count]:
            errors.append(f"{name}: inline assets are not allowed: {', '.join(found_inline)}")

        required_og = {"og:title", "og:description", "og:url"}
        if missing_og := required_og - parser.og_fields:
            errors.append(f"{name}: missing social metadata: {', '.join(sorted(missing_og))}")

        for index, image in enumerate(parser.images, start=1):
            missing = [attribute for attribute in ("src", "alt", "width", "height") if image.get(attribute) is None]
            if missing:
                errors.append(f"{name}: image {index} missing {', '.join(missing)}")

        for attribute, reference in parser.references:
            target = local_target(page, reference)
            if target is None:
                continue
            target_path, fragment = target
            if not target_path.is_file():
                errors.append(f"{name}: missing local {attribute} target {reference}")
                continue
            if fragment and target_path.suffix.lower() == ".html":
                target_ids = ids_by_path.get(target_path)
                if target_ids is None:
                    target_ids = set(parse_page(target_path).ids)
                    ids_by_path[target_path] = target_ids
                if fragment not in target_ids:
                    errors.append(f"{name}: missing anchor target {reference}")

    project_parser = parsed["projects.html"]
    expected_categories = {"ai", "forensics", "enterprise", "transformation"}
    group_counts = Counter(project_parser.project_groups)
    if set(project_parser.project_tabs) != expected_categories or "all" in project_parser.project_tabs:
        errors.append("projects.html: category tabs must contain the four named categories and no All tab")
    if group_counts != Counter({category: 3 for category in expected_categories}):
        errors.append(f"projects.html: expected three cards per category, found {dict(group_counts)}")
    if project_parser.concept_labels:
        errors.append(
            f"projects.html: expected no concept labels, found {project_parser.concept_labels}"
        )
    if project_parser.project_detail_links != 12:
        errors.append(
            f"projects.html: expected 12 project detail links, found {project_parser.project_detail_links}"
        )

    forbidden_remarks = (
        "Three representative projects spanning AI, 3D review, and mobile digital forensics.",
        "Each role combines technical work with the operating discipline needed to move initiatives forward.",
        "Focused groups make the technical and delivery range easier to scan.",
    )
    for name in PAGES:
        source = (ROOT / name).read_text(encoding="utf-8")
        for remark in forbidden_remarks:
            if remark in source:
                errors.append(f"{name}: contains removed section remark: {remark}")

    if errors:
        raise SystemExit("Site validation failed:\n- " + "\n- ".join(errors))

    print(
        f"Validated {len(PAGES)} pages: metadata, headings, anchors, assets, images, "
        "and project categories are consistent."
    )


if __name__ == "__main__":
    main()
