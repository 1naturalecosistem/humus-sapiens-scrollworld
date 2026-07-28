#!/usr/bin/env python3
"""Derive the site's section photos and article covers from the originals.

    python3 scripts/prepare_media.py "../media da integrare"

The originals are phone/WhatsApp shots kept outside the repo: portrait 4:3, and
in the case of the beekeeping clips, 464x832 video. Every asset the site paints
is cut from them here rather than by hand, so re-running this after new photos
arrive gives the same crops instead of a slightly different set each time.

Two things are deliberate:

  * Crops are anchored, not centred. `focus` is where the subject sits along the
    axis being cut (0 = top/left, 1 = bottom/right). Centre-cropping a portrait
    photo of a hillside to 4:3 reliably throws away the hillside. Where an anchor
    is not enough — the subject occupies a small part of a much larger frame —
    `rect` narrows the source down first.
  * Nothing is ever enlarged. The stills pulled out of the clips are 464px wide
    and stay 464px wide; upscaling them to match the photos would only make the
    softness look like a mistake rather than what it is.
"""

import os
import subprocess
import sys
import tempfile

from PIL import Image, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(HERE, "..", "frontend", "public")

# (source file, output name, target aspect w/h, focus along the cut axis,
#  max width, rect to narrow the source to first — or None for the whole frame)
PHOTOS = [
    # Bee Humus — the apiary under the trees. Painted tall, so keep it 3:4.
    ("WhatsApp Image 2026-07-28 at 15.41.35.jpeg", "apiario.jpg", 3 / 4, 0.60, 1200, None),
    # R'Accolti — someone working the crescent beds. 4:5, anchored on the person.
    ("WhatsApp Image 2026-07-28 at 15.41.59.jpeg", "aiuole.jpg", 4 / 5, 0.58, 1200, None),
    # Agricampeggio — the food forest. Landscape, unlike the other section
    # photos: the subject is a wide hillside, and a tall crop of it both loses
    # the beds among the canopy and leaves the section badly out of balance.
    # The rect skips the bare track across the bottom of the frame.
    ("WhatsApp Image 2026-07-28 at 15.42.00.jpeg", "foodforest.jpg", 4 / 3, 0.45, 1200,
     (150, 350, 1200, 1150)),
    # Article covers, all 4:3 to match the Blog cards.
    ("WhatsApp Image 2026-07-28 at 15.42.16.jpeg", "cover-permacultura.jpg", 4 / 3, 0.52, 1440, None),
    # The sea seen through a window: the subject is the opening, and the wall
    # around it is pure black. Keep a thin edge of frame as a vignette, no more.
    ("WhatsApp Image 2026-07-28 at 15.41.35(1).jpeg", "cover-mare.jpg", 4 / 3, 0.50, 1440,
     (380, 600, 1440, 1420)),
    ("WhatsApp Image 2026-07-28 at 15.41.23.jpeg", "cover-orto.jpg", 4 / 3, 0.66, 1440, None),
]

# Stills pulled out of the beekeeping clips. There are no photographs of the
# hive interior or the honey, only video, so these frames are the only real
# images of either — hence 464px assets on a site that is otherwise 1200px+.
#
# (source clip, output name, timestamp as a % of the clip, target aspect, focus)
# `None` aspect keeps the frame whole.
FRAMES = [
    # the swarm hanging off the branch at dusk — the widest, calmest framing
    ("WhatsApp Video 2026-07-28 at 15.41.17.mp4", "cover-sciame.jpg", 90, 4 / 3, 0.45),
    # the row of hives with bees working the entrances
    ("WhatsApp Video 2026-07-28 at 15.41.27.mp4", "cover-arnie.jpg", 10, 4 / 3, 0.55),
    # uncapping: at 70% the hand and the tool are on the comb and the ring light
    # and window that clutter the opening seconds are out of frame
    ("WhatsApp Video 2026-07-28 at 15.41.33.mp4", "favo.jpg", 70, None, 0.5),
]

# Social card: 1.91:1 off the sunset panorama the site already ships.
OG = ("valle.jpg", "og-image.jpg", 1200, 630)


def crop_to(im, aspect, focus):
    """Cut `im` to `aspect`, keeping the band of it around `focus`."""
    w, h = im.size
    if w / h > aspect:  # too wide — cut the sides
        new_w = round(h * aspect)
        left = round((w - new_w) * focus)
        return im.crop((left, 0, left + new_w, h))
    new_h = round(w / aspect)  # too tall — cut top/bottom
    top = round((h - new_h) * focus)
    return im.crop((0, top, w, top + new_h))


# Every one of these is dense summer foliage, which is the worst case for JPEG:
# at 84 the leaf detail alone costs ~700KB a photo. 78 is where the artefacts
# stay invisible against that texture and the files come back in line with the
# ones the site already ships.
QUALITY = 78


def save(im, name, max_width=None):
    if max_width and im.width > max_width:
        im = im.resize((max_width, round(im.height * max_width / im.width)), Image.LANCZOS)
    out = os.path.join(PUBLIC, name)
    im.convert("RGB").save(out, "JPEG", quality=QUALITY, optimize=True, progressive=True)
    print(f"  {name:26} {im.width}x{im.height}  {os.path.getsize(out) / 1024:.0f} KB")


def grab_frame(clip, percent, tmpdir):
    """One frame out of a clip, at native resolution.

    ffmpegthumbnailer rather than ffmpeg: it is what this machine has, and a
    single still is all we need from these clips.
    """
    png = os.path.join(tmpdir, "frame.png")
    subprocess.run(
        ["ffmpegthumbnailer", "-i", clip, "-o", png, "-s", "0", "-t", f"{percent}%"],
        check=True,
        capture_output=True,
    )
    return Image.open(png).copy()


def main():
    if len(sys.argv) < 2:
        sys.exit(f"uso: {sys.argv[0]} <cartella dei media originali>")
    src = sys.argv[1]
    if not os.path.isdir(src):
        sys.exit(f"cartella non trovata: {src}")

    print("foto")
    for name, out, aspect, focus, max_w, rect in PHOTOS:
        im = ImageOps.exif_transpose(Image.open(os.path.join(src, name)))
        if rect:
            im = im.crop(rect)
        save(crop_to(im, aspect, focus), out, max_w)

    print("fotogrammi dai video")
    with tempfile.TemporaryDirectory() as tmp:
        for name, out, pct, aspect, focus in FRAMES:
            im = grab_frame(os.path.join(src, name), pct, tmp)
            save(crop_to(im, aspect, focus) if aspect else im, out)

    print("social card")
    src_name, out, w, h = OG
    im = crop_to(Image.open(os.path.join(PUBLIC, src_name)), w / h, 0.5)
    save(im, out, w)


if __name__ == "__main__":
    main()
