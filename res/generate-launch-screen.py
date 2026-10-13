#!/usr/bin/env python3
"""Render the 3-second animation for Moonlight's native Samsung TV splash.

The top sector appears first, then one sector appears clockwise every 300 ms.
After all eight sectors have appeared, the gray disc and app name fade in
together for 600 ms. The final frame is also the static fallback image.
"""
import argparse
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path

FPS = 30
SECTOR_INTERVAL_FRAMES = 9  # 300 ms at 30 fps
SECTOR_PHASE_FRAMES = 8 * SECTOR_INTERVAL_FRAMES
FADE_FRAMES = 18  # 600 ms at 30 fps
TOTAL_FRAMES = SECTOR_PHASE_FRAMES + FADE_FRAMES


def find_by_id(root, target_id):
    for element in root.iter():
        if element.get("id") == target_id:
            return element
    raise RuntimeError(f"Missing expected SVG element id={target_id!r}")


def configure_frame(root, frame_number):
    background = find_by_id(root, "background-circle")
    app_name = find_by_id(root, "app-name")
    sectors = [find_by_id(root, f"sector-{i}") for i in range(8)]

    if frame_number < SECTOR_PHASE_FRAMES:
        visible_count = frame_number // SECTOR_INTERVAL_FRAMES + 1
        fade = 0.0
    else:
        visible_count = 8
        # Frame 72 starts the fade; frame 89 is fully visible.
        fade = (frame_number - SECTOR_PHASE_FRAMES + 1) / FADE_FRAMES

    background.set("fill-opacity", f"{fade:.4f}")
    app_name.set("opacity", f"{fade:.4f}")
    for index, sector in enumerate(sectors):
        sector.set("opacity", "1" if index < visible_count else "0")


def render_svg(template_path, output_path, frame_number=None):
    root = ET.parse(template_path).getroot()
    if frame_number is not None:
        configure_frame(root, frame_number)
    output_path.write_bytes(ET.tostring(root, encoding="utf-8", xml_declaration=True))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--template", required=True, type=Path)
    parser.add_argument("--frames", required=True, type=Path)
    parser.add_argument("--static-svg", required=True, type=Path)
    args = parser.parse_args()

    if not args.template.is_file():
        raise SystemExit(f"SVG template not found: {args.template}")
    args.frames.mkdir(parents=True, exist_ok=True)
    args.static_svg.parent.mkdir(parents=True, exist_ok=True)

    # Render a still frame for the native splash fallback; all components are visible.
    render_svg(args.template, args.static_svg)

    for frame_number in range(TOTAL_FRAMES):
        frame_svg = args.frames / "frame.svg"
        frame_png = args.frames / f"frame-{frame_number:03d}.png"
        render_svg(args.template, frame_svg, frame_number)
        subprocess.run(
            [
                "rsvg-convert", "-w", "1280", "-h", "720", "--format", "png",
                "-o", str(frame_png), str(frame_svg),
            ],
            check=True,
        )

    (args.frames / "frame.svg").unlink(missing_ok=True)
    print(f"Generated {TOTAL_FRAMES} frames at {FPS} fps ({TOTAL_FRAMES / FPS:.1f} seconds).")


if __name__ == "__main__":
    main()
