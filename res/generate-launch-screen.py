#!/usr/bin/env python3
"""Render Moonlight's native Samsung TV splash: animation plus static hold.

Eight sectors fade in sequentially. The logo then makes a clear, controlled
bounce while the gray disc and app name fade in; the final frame is held for
six additional seconds so the completed logo remains readable on the TV.
"""
import argparse
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path

FPS = 30
SECTOR_INTERVAL_FRAMES = 9  # 300 ms at 30 fps
SECTOR_FADE_FRAMES = 9      # 300 ms fade-in for each sector
SECTOR_PHASE_FRAMES = 8 * SECTOR_INTERVAL_FRAMES
SETTLE_FRAMES = 36          # 1.2 s for the bounce and accompanying fade
ANIMATED_FRAME_COUNT = SECTOR_PHASE_FRAMES + SETTLE_FRAMES
STATIC_HOLD_FRAMES = 6 * FPS
TOTAL_FRAMES = ANIMATED_FRAME_COUNT + STATIC_HOLD_FRAMES

FINAL_LOGO_SCALE = 0.78
OVERSIZED_LOGO_SCALE = FINAL_LOGO_SCALE * 1.15
BOUNCE_LOW_SCALE = FINAL_LOGO_SCALE * 0.93
BOUNCE_HIGH_SCALE = FINAL_LOGO_SCALE * 1.06
LOGO_CENTER_X = 639.84
LOGO_CENTER_Y = 274.84


def find_by_id(root, target_id):
    for element in root.iter():
        if element.get("id") == target_id:
            return element
    raise RuntimeError(f"Missing expected SVG element id={target_id!r}")


def smoothstep(value):
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def interpolate(start, end, progress):
    return start + (end - start) * smoothstep(progress)


def settling_scale(progress):
    """Bounce clearly below the final size, rebound above it, then settle."""
    if progress <= 0.42:
        return interpolate(OVERSIZED_LOGO_SCALE, BOUNCE_LOW_SCALE, progress / 0.42)
    if progress <= 0.72:
        return interpolate(BOUNCE_LOW_SCALE, BOUNCE_HIGH_SCALE, (progress - 0.42) / 0.30)
    return interpolate(BOUNCE_HIGH_SCALE, FINAL_LOGO_SCALE, (progress - 0.72) / 0.28)


def configure_frame(root, frame_number):
    logo_group = find_by_id(root, "logo-group")
    background = find_by_id(root, "background-circle")
    app_name = find_by_id(root, "app-name")
    sectors = [find_by_id(root, f"sector-{i}") for i in range(8)]

    if frame_number < SECTOR_PHASE_FRAMES:
        scale = OVERSIZED_LOGO_SCALE
        fade = 0.0
    else:
        settle_frame = frame_number - SECTOR_PHASE_FRAMES
        progress = min(1.0, (settle_frame + 1) / SETTLE_FRAMES)
        scale = settling_scale(progress)
        fade = progress

    # Keep the logo centered while its scale changes. At 0.78 this transform
    # is geometrically identical to the original translate(540 175) scale(0.78).
    logo_group.set(
        "transform",
        f"translate({LOGO_CENTER_X} {LOGO_CENTER_Y}) "
        f"scale({scale:.5f}) translate(-128 -128)",
    )
    background.set("fill-opacity", f"{fade:.4f}")
    app_name.set("opacity", f"{fade:.4f}")

    for index, sector in enumerate(sectors):
        start_frame = index * SECTOR_INTERVAL_FRAMES
        if frame_number < start_frame:
            opacity = 0.0
        else:
            opacity = min(1.0, (frame_number - start_frame + 1) / SECTOR_FADE_FRAMES)
        sector.set("opacity", f"{opacity:.4f}")


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

    # The fallback image is the fully assembled, final-size logo and app name.
    render_svg(args.template, args.static_svg)

    for frame_number in range(ANIMATED_FRAME_COUNT):
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

    # Repeat the completed frame instead of re-rendering identical PNGs.
    final_frame = args.frames / f"frame-{ANIMATED_FRAME_COUNT - 1:03d}.png"
    for frame_number in range(ANIMATED_FRAME_COUNT, TOTAL_FRAMES):
        (args.frames / f"frame-{frame_number:03d}.png").write_bytes(final_frame.read_bytes())

    (args.frames / "frame.svg").unlink(missing_ok=True)
    print(
        f"Generated {ANIMATED_FRAME_COUNT} animated frames plus "
        f"{STATIC_HOLD_FRAMES} static frames: {TOTAL_FRAMES} frames total at "
        f"{FPS} fps ({ANIMATED_FRAME_COUNT / FPS:.1f} s animation + "
        f"{STATIC_HOLD_FRAMES / FPS:.1f} s static hold = {TOTAL_FRAMES / FPS:.1f} s)."
    )


if __name__ == "__main__":
    main()
