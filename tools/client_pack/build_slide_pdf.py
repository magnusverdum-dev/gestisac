from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas


def build_pdf(preview_dir: Path, output: Path) -> None:
    slides = sorted(preview_dir.glob("slide-*.png"))
    if not slides:
        raise SystemExit(f"No slide previews found in {preview_dir}")

    output.parent.mkdir(parents=True, exist_ok=True)
    page_size = landscape(letter)
    c = canvas.Canvas(str(output), pagesize=page_size)
    page_w, page_h = page_size

    for slide in slides:
        with Image.open(slide) as img:
            img_w, img_h = img.size
        scale = min(page_w / img_w, page_h / img_h)
        draw_w = img_w * scale
        draw_h = img_h * scale
        x = (page_w - draw_w) / 2
        y = (page_h - draw_h) / 2
        c.drawImage(str(slide), x, y, width=draw_w, height=draw_h)
        c.showPage()

    c.save()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview-dir", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    build_pdf(args.preview_dir, args.out)
    print(args.out)


if __name__ == "__main__":
    main()
