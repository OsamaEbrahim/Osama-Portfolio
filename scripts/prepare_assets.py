"""Download and optimize the portfolio's approved concept-image assets."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path
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


def main() -> None:
    PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
    BRANDS_DIR.mkdir(parents=True, exist_ok=True)

    for slug, photo_id, centering in PROJECT_IMAGES:
        prepare_project_image(slug, photo_id, centering)
        print(f"Prepared {slug}")

    prepare_university_logo()
    print("Prepared University of Bahrain logo")


if __name__ == "__main__":
    main()
