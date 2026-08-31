#!/usr/bin/env python3
"""Generate Pixel-style phone app icons (132x132 squircles)."""

from __future__ import annotations

import math
import urllib.request
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "phone-icons"
SIZE = 132
ICON_SIZE = 512


def squircle_mask(size: int, radius_ratio: float = 0.23) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    inset = int(size * 0.02)
    draw.rounded_rectangle(
        (inset, inset, size - inset - 1, size - inset - 1),
        radius=int(size * radius_ratio),
        fill=255,
    )
    return mask


def make_base() -> Image.Image:
    """White squircle with soft drop shadow, matching existing phone-icons."""
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    mask = squircle_mask(SIZE)

    shadow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        (4, 6, SIZE - 5, SIZE - 3),
        radius=int(SIZE * 0.23),
        fill=(0, 0, 0, 42),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(2))
    canvas = Image.alpha_composite(canvas, shadow)

    tile = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 255))
    canvas.paste(tile, (0, 0), mask)
    return canvas


def paste_graphic(base: Image.Image, graphic: Image.Image, scale: float = 0.62) -> Image.Image:
    g = graphic.convert("RGBA")
    target = int(SIZE * scale)
    g = g.resize((target, target), Image.Resampling.LANCZOS)
    x = (SIZE - target) // 2
    y = (SIZE - target) // 2
    out = base.copy()
    out.alpha_composite(g, (x, y))
    return out


def draw_download(size: int = ICON_SIZE) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = size // 2, size // 2
    shaft = int(size * 0.09)
    d.rounded_rectangle(
        (cx - shaft // 2, cy - int(size * 0.22), cx + shaft // 2, cy + int(size * 0.12)),
        radius=shaft // 2,
        fill="#1A73E8",
    )
    d.polygon(
        [
            (cx - int(size * 0.16), cy + int(size * 0.02)),
            (cx + int(size * 0.16), cy + int(size * 0.02)),
            (cx, cy + int(size * 0.18)),
        ],
        fill="#1A73E8",
    )
    d.rounded_rectangle(
        (cx - int(size * 0.22), cy + int(size * 0.2), cx + int(size * 0.22), cy + int(size * 0.27)),
        radius=int(size * 0.035),
        fill="#1A73E8",
    )
    return img


def draw_messages(size: int = ICON_SIZE) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = int(size * 0.16)
    d.rounded_rectangle(
        (pad, pad, size - pad, size - pad + int(size * 0.04)),
        radius=int(size * 0.12),
        fill="#1A73E8",
    )
    d.polygon(
        [
            (pad + int(size * 0.08), size - pad + int(size * 0.04)),
            (pad + int(size * 0.2), size - pad - int(size * 0.02)),
            (pad + int(size * 0.24), size - pad + int(size * 0.08)),
        ],
        fill="#1A73E8",
    )
    for y in (0.38, 0.5, 0.62):
        d.rounded_rectangle(
            (
                pad + int(size * 0.12),
                int(size * y) - int(size * 0.025),
                size - pad - int(size * 0.12),
                int(size * y) + int(size * 0.025),
            ),
            radius=int(size * 0.02),
            fill="#FFFFFF",
        )
    return img


def draw_settings(size: int = ICON_SIZE) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = size // 2, size // 2
    outer = int(size * 0.34)
    inner = int(size * 0.13)
    teeth = 8
    points: list[tuple[float, float]] = []
    for i in range(teeth * 2):
        angle = math.radians(i * 360 / (teeth * 2) - 90)
        r = outer if i % 2 == 0 else outer * 0.78
        points.append((cx + math.cos(angle) * r, cy + math.sin(angle) * r))
    d.polygon(points, fill="#5F6368")
    d.ellipse((cx - inner, cy - inner, cx + inner, cy + inner), fill="#FFFFFF")
    d.ellipse(
        (cx - inner * 0.55, cy - inner * 0.55, cx + inner * 0.55, cy + inner * 0.55),
        fill="#5F6368",
    )
    return img


def draw_phone(size: int = ICON_SIZE) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = int(size * 0.18)
    d.rounded_rectangle(
        (pad, pad, size - pad, size - pad),
        radius=int(size * 0.18),
        fill="#34A853",
    )
    cx, cy = size // 2, size // 2
    d.chord(
        (cx - int(size * 0.18), cy - int(size * 0.18), cx + int(size * 0.18), cy + int(size * 0.18)),
        300,
        60,
        fill="#FFFFFF",
    )
    d.chord(
        (cx - int(size * 0.18), cy - int(size * 0.18), cx + int(size * 0.18), cy + int(size * 0.18)),
        120,
        240,
        fill="#FFFFFF",
    )
    return img


def draw_camera(size: int = ICON_SIZE) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    body_top = int(size * 0.28)
    d.rounded_rectangle(
        (int(size * 0.14), body_top, int(size * 0.86), int(size * 0.78)),
        radius=int(size * 0.08),
        fill="#747775",
    )
    d.rounded_rectangle(
        (int(size * 0.34), int(size * 0.18), int(size * 0.66), int(size * 0.32)),
        radius=int(size * 0.04),
        fill="#747775",
    )
    cx, cy = size // 2, int(size * 0.53)
    lens = int(size * 0.16)
    d.ellipse((cx - lens, cy - lens, cx + lens, cy + lens), fill="#FFFFFF")
    d.ellipse(
        (cx - lens * 0.55, cy - lens * 0.55, cx + lens * 0.55, cy + lens * 0.55),
        fill="#747775",
    )
    return img


def fetch_flaticon(icon_id: int) -> Image.Image | None:
    folder = str(icon_id)[:4] if icon_id >= 10000 else str(icon_id)[:3]
    url = f"https://cdn-icons-png.flaticon.com/512/{folder}/{icon_id}.png"
    try:
        data = urllib.request.urlopen(url, timeout=15).read()
        return Image.open(BytesIO(data)).convert("RGBA")
    except Exception:
        return None


def save_icon(name: str, graphic: Image.Image, scale: float = 0.62) -> None:
    out = paste_graphic(make_base(), graphic, scale=scale)
    path = OUT / f"{name}.png"
    out.save(path, "PNG")
    print(f"wrote {path}")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    save_icon("downloads", draw_download())
    save_icon("messages", draw_messages())
    save_icon("settings", draw_settings())
    save_icon("phone", draw_phone(), scale=0.68)
    save_icon("camera", draw_camera(), scale=0.68)

    play = fetch_flaticon(888857)
    if play is not None:
        save_icon("play-store", play, scale=0.58)
    else:
        # Fallback: simple play triangle
        fb = Image.new("RGBA", (ICON_SIZE, ICON_SIZE), (0, 0, 0, 0))
        d = ImageDraw.Draw(fb)
        d.polygon(
            [
                (int(ICON_SIZE * 0.22), int(ICON_SIZE * 0.18)),
                (int(ICON_SIZE * 0.22), int(ICON_SIZE * 0.82)),
                (int(ICON_SIZE * 0.82), int(ICON_SIZE * 0.5)),
            ],
            fill="#34A853",
        )
        save_icon("play-store", fb, scale=0.58)

    # Refresh photos/files from Flaticon when available; keep existing if download fails.
    for name, icon_id, scale in (
        ("photos", 2991110, 0.62),
        ("files", 3767084, 0.62),
    ):
        graphic = fetch_flaticon(icon_id)
        if graphic is not None:
            save_icon(name, graphic, scale=scale)
        else:
            existing = OUT / f"{name}.png"
            if existing.exists():
                print(f"kept existing {existing}")


if __name__ == "__main__":
    main()
