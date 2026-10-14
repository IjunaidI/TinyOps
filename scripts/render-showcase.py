#!/usr/bin/env python3
"""Render a designed Jevtown film from recorded gameplay and original music.

Usage:
  python3 scripts/render-showcase.py [exports/jevtown/source/edit.json]
  python3 scripts/render-showcase.py --formats landscape --preview

Manifest (paths are relative to the manifest):
{
  "music": "jevtown-music.wav",
  "shots": [
    {"file":"city.webm", "start":0, "duration":7, "speed":1,
     "headline":"Meet your new mayor.", "subline":"A living city. Real trade-offs.",
     "kicker":"WELCOME TO JEVTOWN", "crop":[0,0,1,1],
     "portrait_crop":[0.2,0,0.65,1], "zoom":0.015}
  ],
  "poster_shot":0
}

Duration is the EDITED duration, in seconds. A 7-second shot at speed=4 consumes
28 seconds of source. Crop values are normalized x,y,width,height. Optional
landscape_crop / portrait_crop override crop. No crop is applied by default.
portrait_headline / landscape_headline can supply intentional line breaks.
fit="cover" fills the frame after the explicit crop; default "contain" retains
all of that crop. portrait_fit / landscape_fit override fit for one format.
The source audio is discarded. There is no narration or invented gameplay.
"""
from __future__ import annotations

import argparse
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "exports/jevtown/source/edit.json"
FFMPEG_CANDIDATES = [
    Path("/tmp/jevtown-video-tools/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1"),
]
REGULAR = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
BOLD = Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")
PALETTE = {
    "paper": "#F3F1E9", "ink": "#253332", "muted": "#637370",
    "teal": "#427D78", "mint": "#AFC6BC", "gold": "#C29A55",
    "line": "#D4DCD4", "screen": "#DCE3DB", "white": "#FFFFFF",
}
LAYOUTS = {
    "landscape": {"size": (1920, 1080), "frame": (56, 252, 1808, 760),
                  "copy_x": 60, "headline_y": 111, "headline_w": 1792,
                  "headline_size": 64, "headline_lines": 1, "sub_y": 191,
                  "sub_size": 28, "sub_lines": 1},
    "portrait": {"size": (1080, 1350), "frame": (36, 442, 1008, 804),
                 "copy_x": 48, "headline_y": 148, "headline_w": 984,
                 "headline_size": 76, "headline_lines": 2, "sub_y": 324,
                 "sub_size": 33, "sub_lines": 2},
}


def font(size: int, bold: bool = False):
    source = BOLD if bold else REGULAR
    if source.exists():
        return ImageFont.truetype(str(source), size)
    for source in (["DejaVuSans-Bold.ttf"] if bold else ["DejaVuSans.ttf"]):
        try:
            return ImageFont.truetype(source, size)
        except OSError:
            pass
    raise RuntimeError("Install Arial or DejaVu Sans to render clean captions.")


def text_width(draw, text, face):
    return draw.textlength(text, font=face)


def tracked(draw, xy, text, face, fill, tracking=2):
    x, y = xy
    for character in text:
        draw.text((x, y), character, font=face, fill=fill)
        x += text_width(draw, character, face) + tracking
    return x


def wrap(draw, text, face, width):
    lines = []
    for paragraph in str(text).splitlines() or [""]:
        current = ""
        for word in paragraph.split():
            candidate = f"{current} {word}".strip()
            if current and text_width(draw, candidate, face) > width:
                lines.append(current)
                current = word
            else:
                current = candidate
        if current:
            lines.append(current)
    return lines


def fitted(draw, text, width, size, maximum_lines, bold=False):
    for candidate_size in range(size, min(24, size) - 1, -1):
        face = font(candidate_size, bold)
        lines = wrap(draw, text, face, width)
        if len(lines) <= maximum_lines and all(text_width(draw, line, face) <= width for line in lines):
            return face, lines, candidate_size
    raise ValueError(f"Caption is too long for the layout: {text!r}")


def city_logo(draw, x, y, unit=6):
    """Small original pixel skyline; the game retains its own artwork."""
    draw.rectangle((x, y + unit * 2, x + unit * 3, y + unit * 7), fill=PALETTE["teal"])
    draw.rectangle((x + unit * 4, y, x + unit * 7, y + unit * 7), fill=PALETTE["ink"])
    draw.rectangle((x + unit * 8, y + unit * 3, x + unit * 11, y + unit * 7), fill=PALETTE["gold"])
    for px, py in [(1, 3), (1, 5), (5, 1), (5, 3), (5, 5), (9, 4)]:
        draw.rectangle((x + px * unit, y + py * unit, x + (px + 1) * unit - 1,
                        y + (py + 1) * unit - 1), fill=PALETTE["paper"])


def design_graphics(shot, orientation, index, count, destination):
    config = LAYOUTS[orientation]
    width, height = config["size"]
    x, y, video_width, video_height = config["frame"]
    image = Image.new("RGB", (width, height), PALETTE["paper"])
    draw = ImageDraw.Draw(image)
    # Restrained editorial chrome keeps the recorded city as the central object.
    draw.rounded_rectangle((x - 7, y - 7, x + video_width + 7, y + video_height + 14),
                           radius=18, fill="#E0E3D9")
    draw.rounded_rectangle((x - 4, y - 4, x + video_width + 4, y + video_height + 4),
                           radius=14, fill=PALETTE["white"])
    draw.rectangle((x, y, x + video_width - 1, y + video_height - 1), fill=PALETTE["screen"])
    if orientation == "landscape":
        city_logo(draw, 60, 44, 5)
        draw.text((132, 33), "jevtown", font=font(42, True), fill=PALETTE["ink"])
        draw.rectangle((309, 65, 317, 73), fill=PALETTE["gold"])
        tracked(draw, (354, 48), "AI MAYOR SIMULATOR", font(19, True), PALETTE["muted"], 2)
        footer_y = 1038
        tracked(draw, (60, footer_y), "A LITTLE CITY. BIG DECISIONS.", font(15, True), PALETTE["muted"], 1.8)
        dot_y = footer_y + 7
        gap = 23
        dot_x = width - 60 - count * gap
        label = f"{index + 1:02d} / {count:02d}"
        draw.text((dot_x - 105, footer_y - 1), label, font=font(18, True), fill=PALETTE["teal"])
    else:
        city_logo(draw, 48, 42, 6)
        draw.text((135, 31), "jevtown", font=font(51, True), fill=PALETTE["ink"])
        draw.rectangle((350, 69, 360, 79), fill=PALETTE["gold"])
        tracked(draw, (48, 105), "AI MAYOR SIMULATOR", font(18, True), PALETTE["muted"], 2.6)
        footer_y = 1280
        tracked(draw, (48, footer_y), "A LITTLE CITY. BIG DECISIONS.", font(15, True), PALETTE["muted"], 1.35)
        dot_y = footer_y + 9
        gap = 24
        dot_x = width - 45 - count * gap
    for dot_index in range(count):
        cx = dot_x + dot_index * gap
        if dot_index == index:
            draw.rounded_rectangle((cx - 1, dot_y - 4, cx + 12, dot_y + 4), radius=4, fill=PALETTE["teal"])
        else:
            draw.ellipse((cx + 1, dot_y - 3, cx + 7, dot_y + 3),
                         fill=PALETTE["mint"] if dot_index < index else PALETTE["line"])
    base_path = destination / f"{orientation}-{index:02d}-base.png"
    image.save(base_path)

    copy = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(copy)
    # The copy enters gently. It never covers the gameplay or its decisions.
    headline = shot.get(f"{orientation}_headline", shot["headline"])
    face, lines, size = fitted(draw, headline, config["headline_w"],
                               config["headline_size"], config["headline_lines"], True)
    for line_index, line in enumerate(lines):
        draw.text((config["copy_x"], config["headline_y"] + line_index * int(size * 1.12)),
                  line, font=face, fill=PALETTE["ink"])
    face, lines, size = fitted(draw, shot.get("subline", ""), config["headline_w"],
                               config["sub_size"], config["sub_lines"])
    for line_index, line in enumerate(lines):
        draw.text((config["copy_x"] + 3, config["sub_y"] + line_index * int(size * 1.3)),
                  line, font=face, fill=PALETTE["muted"])
    kicker = shot.get("kicker", "INSIDE JEVTOWN").upper()
    if orientation == "landscape":
        kicker_face, _, kicker_size = fitted(draw, kicker, 750, 19, 1, True)
        tracking = 1.9
        kicker_width = text_width(draw, kicker, kicker_face) + max(0, len(kicker) - 1) * tracking
        tracked(draw, (width - 60 - kicker_width, 48), kicker, kicker_face, PALETTE["teal"], tracking)
    else:
        # Upper-right kicker is short enough to coexist with the wordmark.
        kicker_face, _, _ = fitted(draw, kicker, 580, 18, 1, True)
        kicker_width = text_width(draw, kicker, kicker_face)
        draw.text((width - 48 - kicker_width, 53), kicker, font=kicker_face, fill=PALETTE["teal"])
    copy_path = destination / f"{orientation}-{index:02d}-copy.png"
    copy.save(copy_path)
    return base_path, copy_path


def find_ffmpeg():
    explicit = os.environ.get("JEVTOWN_FFMPEG")
    if explicit:
        return explicit
    installed = shutil.which("ffmpeg")
    if installed:
        return installed
    for candidate in FFMPEG_CANDIDATES:
        if candidate.exists():
            return str(candidate)
    raise RuntimeError("ffmpeg was not found. Set JEVTOWN_FFMPEG to its executable path.")


def run(command):
    result = subprocess.run([str(part) for part in command], stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr[-12000:])
    return result


def resolve_path(value, parent):
    path = Path(value).expanduser()
    return path if path.is_absolute() else (parent / path).resolve()


def check_source_durations(ffmpeg, shots):
    """Catch an accidental speed/trim mismatch before a long encode begins."""
    durations = {}
    for index, shot in enumerate(shots):
        path = shot["file"]
        if path not in durations:
            probe = subprocess.run([ffmpeg, "-hide_banner", "-i", path],
                                   stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            match = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", probe.stderr)
            durations[path] = (sum(float(value) * factor for value, factor in
                                   zip(match.groups(), (3600, 60, 1))) if match else None)
        source_length = durations[path]
        needed = shot["start"] + shot["duration"] * shot["speed"]
        if source_length is not None and needed > source_length + 0.1:
            raise ValueError(f"Shot {index + 1} needs source through {needed:.2f}s, "
                             f"but {Path(path).name} is only {source_length:.2f}s long. "
                             "Reduce start, edited duration, or speed.")


def validate_manifest(manifest, parent):
    shots = manifest.get("shots")
    if not isinstance(shots, list) or not shots:
        raise ValueError("The edit manifest needs a nonempty shots list.")
    for index, shot in enumerate(shots):
        if not shot.get("headline") or not shot.get("file"):
            raise ValueError(f"Shot {index + 1} needs file and headline.")
        path = resolve_path(shot["file"], parent)
        if not path.is_file():
            raise FileNotFoundError(f"Missing footage for shot {index + 1}: {path}")
        shot["file"] = str(path)
        for key, default in [("duration", 0), ("start", 0), ("speed", 1), ("zoom", 0)]:
            shot[key] = float(shot.get(key, default))
            if not math.isfinite(shot[key]):
                raise ValueError(f"Shot {index + 1} has nonfinite {key}.")
        if shot["duration"] <= 0 or shot["start"] < 0 or shot["speed"] <= 0:
            raise ValueError(f"Shot {index + 1} has invalid timing.")
        if not 0 <= shot["zoom"] <= 0.12:
            raise ValueError("zoom must be a subtle 0–0.12 fraction.")
        for key in ("fit", "landscape_fit", "portrait_fit"):
            if shot.get(key, "contain") not in ("contain", "cover"):
                raise ValueError(f"Shot {index + 1} {key} must be contain or cover.")
        for key in ("crop", "landscape_crop", "portrait_crop"):
            value = shot.get(key)
            if value is None:
                continue
            if isinstance(value, dict):
                value = [value[axis] for axis in ["x", "y", "w", "h"]]
                shot[key] = value
            if len(value) != 4:
                raise ValueError(f"{key} needs [x,y,width,height].")
            cx, cy, cw, ch = [float(coordinate) for coordinate in value]
            if (not all(math.isfinite(v) for v in [cx, cy, cw, ch]) or min(cx, cy) < 0 or
                    min(cw, ch) <= 0 or cx + cw > 1.00001 or cy + ch > 1.00001):
                raise ValueError(f"Shot {index + 1} has an out-of-bounds {key}.")
    music = resolve_path(manifest.get("music", "jevtown-music.wav"), parent)
    if not music.is_file():
        raise FileNotFoundError(f"Missing original music: {music}")
    return shots, music


def render_segment(ffmpeg, shot, orientation, index, count, graphics, segments, args):
    base_path, copy_path = design_graphics(shot, orientation, index, count, graphics)
    x, y, width, height = LAYOUTS[orientation]["frame"]
    duration, speed = shot["duration"], shot["speed"]
    frames = max(1, round(duration * 30))
    source_duration = duration * speed
    filters = [f"trim=duration={source_duration:.6f}", f"setpts=(PTS-STARTPTS)/{speed:.6f}", "fps=30"]
    crop = shot.get(f"{orientation}_crop", shot.get("crop"))
    if crop:
        cx, cy, cw, ch = crop
        filters.append(f"crop=trunc(iw*{cw}/2)*2:trunc(ih*{ch}/2)*2:trunc(iw*{cx}/2)*2:trunc(ih*{cy}/2)*2")
    fit = shot.get(f"{orientation}_fit", shot.get("fit", "contain"))
    if fit == "cover":
        filters += [f"scale={width}:{height}:force_original_aspect_ratio=increase:flags=lanczos",
                    f"crop={width}:{height}:(iw-ow)/2:(ih-oh)/2", "setsar=1"]
    else:
        filters += [f"scale={width}:{height}:force_original_aspect_ratio=decrease:flags=lanczos",
                    f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=0xDCE3DB", "setsar=1"]
    if shot["zoom"] > 0:
        # A 2% push is optional. Panel-heavy shots should leave zoom at zero.
        filters += [f"scale={width * 2}:{height * 2}:flags=lanczos",
                    f"zoompan=z='1+{shot['zoom']:.6f}*on/{frames}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s={width}x{height}:fps=30"]
    graph = (f"[0:v]{','.join(filters)}[game];"
             "[1:v]format=yuv420p[base];"
             f"[base][game]overlay={x}:{y}:shortest=1[scene];"
             "[2:v]format=rgba,fade=t=in:st=0:d=0.25:alpha=1[copy];"
             "[scene][copy]overlay=0:'if(lt(t,0.32),14*(1-t/0.32),0)':shortest=1,"
             "format=yuv420p[v]")
    target = segments / f"{orientation}-{index:02d}.mp4"
    run([ffmpeg, "-hide_banner", "-loglevel", "warning", "-y", "-ss", shot["start"],
         "-t", source_duration, "-i", shot["file"],
         "-loop", "1", "-framerate", "30", "-i", base_path,
         "-loop", "1", "-framerate", "30", "-i", copy_path,
         "-filter_complex", graph, "-map", "[v]", "-t", duration, "-an", "-r", "30",
         "-c:v", "libx264", "-preset", args.preset, "-crf", args.crf,
         "-pix_fmt", "yuv420p", "-movflags", "+faststart", target])
    return target


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("manifest", nargs="?", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--formats", default="landscape,portrait", help="landscape,portrait (default) or one format")
    parser.add_argument("--preview", action="store_true", help="Render just the first shot, with a preview filename")
    parser.add_argument("--preset", default="fast", help="x264 speed preset; default fast")
    parser.add_argument("--crf", type=int, default=19, help="x264 quality; lower is larger, default 19")
    parser.add_argument("--output", type=Path, help="Output directory; default manifest parent’s parent")
    args = parser.parse_args()
    manifest_path = args.manifest.expanduser().resolve()
    if not manifest_path.is_file():
        parser.error(f"No edit manifest at {manifest_path}. Record footage and create the manifest first.")
    manifest = json.loads(manifest_path.read_text())
    shots, music = validate_manifest(manifest, manifest_path.parent)
    all_count = len(shots)
    if args.preview:
        shots = shots[:1]
    formats = [item.strip() for item in args.formats.split(",")]
    if any(item not in LAYOUTS for item in formats):
        parser.error("--formats must contain landscape, portrait, or both separated by a comma.")
    output = (args.output or manifest_path.parent.parent).resolve()
    graphics = manifest_path.parent / "graphics"
    segments = manifest_path.parent / "segments"
    for folder in (output, graphics, segments):
        folder.mkdir(parents=True, exist_ok=True)
    ffmpeg = find_ffmpeg()
    check_source_durations(ffmpeg, shots)
    total = sum(round(shot["duration"] * 30) / 30 for shot in shots)
    for orientation in formats:
        rendered = []
        for index, shot in enumerate(shots):
            print(f"Rendering {orientation} {index + 1}/{len(shots)}: {shot['headline']}", flush=True)
            rendered.append(render_segment(ffmpeg, shot, orientation, index, all_count, graphics, segments, args))
        list_path = segments / f"{orientation}-concat.txt"
        list_path.write_text("\n".join("file '" + str(path).replace("'", "'\\''") + "'" for path in rendered) + "\n")
        suffix = "-preview" if args.preview else ""
        final = output / f"jevtown-linkedin-{orientation}{suffix}.mp4"
        fade_start = max(0, total - 2.5)
        music_filter = (f"[1:a]atrim=0:{total},asetpts=PTS-STARTPTS,"
                        f"loudnorm=I=-19:TP=-1.5:LRA=8,afade=t=in:st=0:d=0.35,"
                        f"afade=t=out:st={fade_start}:d=2.5[a]")
        run([ffmpeg, "-hide_banner", "-loglevel", "warning", "-y", "-f", "concat", "-safe", "0",
             "-i", list_path, "-stream_loop", "-1", "-i", music,
             "-filter_complex", music_filter, "-map", "0:v:0", "-map", "[a]", "-c:v", "copy",
             "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-t", total,
             "-movflags", "+faststart", final])
        poster_index = min(max(0, int(manifest.get("poster_shot", 0))), len(rendered) - 1)
        poster = output / f"jevtown-poster-{orientation}{suffix}.png"
        run([ffmpeg, "-hide_banner", "-loglevel", "warning", "-y", "-ss", "0.8", "-i", rendered[poster_index],
             "-frames:v", "1", "-update", "1", poster])
        print(f"Saved {final} ({total:.2f}s)\nSaved {poster}", flush=True)
    print("Done. All displayed gameplay comes from the supplied recorded clips.", flush=True)


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError, KeyError, FileNotFoundError) as exc:
        print(f"Render failed: {exc}", file=sys.stderr)
        sys.exit(1)
