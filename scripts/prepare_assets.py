"""Extract the supplied mockup photographs without baked-in captions.

Usage: python scripts/prepare_assets.py --source-dir /path/to/mockups
Requires Pillow. Coordinates were verified against the original 1–4.png files.
No source photograph is enlarged, retouched, or synthetically extended.
"""

import argparse
import json
from pathlib import Path

from PIL import Image


PHOTO_CROPS = {
    "hero-gate": ("1.png", (474, 206, 1254, 956)),
    "workshop": ("2.png", (82, 658, 834, 1014)),
    "project-gate": ("3.png", (63, 249, 732, 435)),
    "project-stairs": ("3.png", (756, 249, 1425, 435)),
    "project-pergola": ("3.png", (63, 519, 732, 707)),
    "project-railing": ("3.png", (756, 519, 1425, 707)),
}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", required=True, type=Path)
    args = parser.parse_args()
    output = Path(__file__).resolve().parents[1] / "public" / "images"
    output.mkdir(parents=True, exist_ok=True)
    manifest = {
        "note": (
            "Photographs extracted from the supplied mockups. Baked-in captions "
            "are excluded. Gallery crops are panoramic because the original "
            "caption strips hide the bottom of each photograph. No upscaling."
        ),
        "images": [],
    }

    for name, (source, box) in PHOTO_CROPS.items():
        with Image.open(args.source_dir / source) as original:
            photo = original.convert("RGB").crop(box)
        target = output / f"{name}.webp"
        photo.save(target, "WEBP", quality=88, method=6)
        small = photo.resize(
            (480, round(photo.height * 480 / photo.width)), Image.Resampling.LANCZOS
        )
        small_target = output / f"{name}-480.webp"
        small.save(small_target, "WEBP", quality=86, method=6)
        entry = {
            "file": target.name,
            "width": photo.width,
            "height": photo.height,
            "bytes": target.stat().st_size,
            "source": source,
            "crop": box,
            "small": {
                "file": small_target.name,
                "width": small.width,
                "height": small.height,
                "bytes": small_target.stat().st_size,
            },
        }
        manifest["images"].append(entry)
        print(f"{target.name}: {photo.width}x{photo.height}, {entry['bytes']:,} bytes")

    (output / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
