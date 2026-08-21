"""Download and optimize the portfolio's approved concept-image assets."""

from __future__ import annotations

import argparse
from io import BytesIO
from pathlib import Path
from shutil import copyfile
from urllib.request import Request, urlopen

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
PROJECTS_DIR = ROOT / "assets" / "images" / "projects"
BRANDS_DIR = ROOT / "assets" / "images" / "brands"

PROJECT_IMAGES = (
    ("01-ai-evidence", 36496927, (0.5, 0.5)),
    ("02-3d-scene", 3913016, (0.5, 0.5)),
    ("03-android-triage", 30868621, (0.5, 0.55)),
    ("04-executive-analytics", 30535628, (0.55, 0.5)),
    ("05-monitoring", 4508751, (0.5, 0.5)),
    ("06-authentication", 5483248, (0.5, 0.5)),
    ("07-case-management", 6804093, (0.5, 0.5)),
    ("08-lab-establishment", 18471533, (0.5, 0.5)),
    ("09-transformation", 3912478, (0.5, 0.5)),
    ("10-governance", 17724736, (0.5, 0.5)),
    ("11-devops", 1181673, (0.5, 0.5)),
    ("12-password-vault", 15470523, (0.5, 0.5)),
)

SIZES = ((640, 360), (1200, 675))

BRAND_ASSETS = (
    (
        "microsoft-certified-associate-badge.svg",
        "https://learn.microsoft.com/en-us/media/learn/certification/badges/"
        "microsoft-certified-associate-badge.svg",
    ),
    (
        "aws-certified-ai-practitioner-badge.png",
        "https://images.credly.com/images/4d4693bb-530e-4bca-9327-de07f3aa2348/image.png",
    ),
    (
        "pmp-badge.png",
        "https://images.credly.com/images/731e7ef4-9b0c-4d7b-ab65-23cc699c0aa3/blob",
    ),
)

ORGANIZATION_ASSETS = (
    (
        "bahrain-public-prosecution.svg",
        "https://cdn.prod.website-files.com/63a327f073bbfd0ed01684d8/"
        "63a327f073bbfd0a02168b45_Public%20Prosecution.svg",
    ),
    (
        "danat.png",
        "https://www.danat.bh/wp-content/uploads/2017/06/"
        "web-1-1-e1594724600197.png",
    ),
    (
        "bahrain-airport-services.png",
        "https://bas.com.bh/wp-content/uploads/2024/11/BAS-logo.png",
    ),
)

def download(url: str) -> bytes:
    request = Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 Chrome/127 Safari/537.36"
            )
        },
    )
    with urlopen(request, timeout=45) as response:
        content_type = response.headers.get_content_type()
        if not content_type.startswith("image/"):
            raise RuntimeError(f"Expected an image from {url}, received {content_type}")
        return response.read()


def prepare_project_image(slug: str, photo_id: int, centering: tuple[float, float]) -> None:
    url = (
        f"https://images.pexels.com/photos/{photo_id}/pexels-photo-{photo_id}.jpeg"
        "?auto=compress&cs=tinysrgb&w=1800"
    )
    source = Image.open(BytesIO(download(url))).convert("RGB")

    for width, height in SIZES:
        image = ImageOps.fit(
            source,
            (width, height),
            method=Image.Resampling.LANCZOS,
            centering=centering,
        )
        stem = PROJECTS_DIR / f"{slug}-{width}"
        image.save(stem.with_suffix(".avif"), "AVIF", quality=52, speed=6)
        image.save(stem.with_suffix(".webp"), "WEBP", quality=76, method=6)

        if width == 1200:
            image.save(stem.with_suffix(".jpg"), "JPEG", quality=80, optimize=True, progressive=True)


def prepare_university_logo() -> None:
    url = "https://www.uob.edu.bh/wp-content/uploads/site-prod/uploads/UOB-new-logo.png"
    logo = Image.open(BytesIO(download(url))).convert("RGBA")
    logo.save(BRANDS_DIR / "university-of-bahrain.png", "PNG", optimize=True)


def prepare_brand_assets() -> None:
    """Download official certification badges without altering them."""
    BRANDS_DIR.mkdir(parents=True, exist_ok=True)

    for filename, url in BRAND_ASSETS:
        (BRANDS_DIR / filename).write_bytes(download(url))


def prepare_organization_assets() -> None:
    """Download organization marks without recoloring or reshaping them."""
    BRANDS_DIR.mkdir(parents=True, exist_ok=True)

    for filename, url in ORGANIZATION_ASSETS:
        (BRANDS_DIR / filename).write_bytes(download(url))


def import_award_logo(source: Path) -> None:
    """Copy the user-supplied award logo byte-for-byte into the site assets."""
    if not source.is_file():
        raise FileNotFoundError(f"Award logo not found: {source}")

    BRANDS_DIR.mkdir(parents=True, exist_ok=True)
    copyfile(source, BRANDS_DIR / "bahrain-egovernment-excellence-award.png")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--award-logo",
        type=Path,
        help="Copy a supplied PNG award logo into the portfolio assets.",
    )
    parser.add_argument(
        "--award-logo-only",
        action="store_true",
        help="Import only the supplied award logo without downloading other assets.",
    )
    parser.add_argument(
        "--organization-assets-only",
        action="store_true",
        help="Download only the organization marks used on the experience page.",
    )
    args = parser.parse_args()

    if args.award_logo_only:
        if args.award_logo is None:
            parser.error("--award-logo-only requires --award-logo")
        import_award_logo(args.award_logo)
        print("Imported supplied eGovernment Excellence Award logo")
        return

    if args.organization_assets_only:
        prepare_organization_assets()
        print("Prepared organization marks")
        return

    PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
    BRANDS_DIR.mkdir(parents=True, exist_ok=True)

    for slug, photo_id, centering in PROJECT_IMAGES:
        prepare_project_image(slug, photo_id, centering)
        print(f"Prepared {slug}")

    prepare_university_logo()
    print("Prepared University of Bahrain logo")
    prepare_brand_assets()
    print("Prepared certification artwork")
    prepare_organization_assets()
    print("Prepared organization marks")

    if args.award_logo is not None:
        import_award_logo(args.award_logo)
        print("Imported supplied eGovernment Excellence Award logo")


if __name__ == "__main__":
    main()
