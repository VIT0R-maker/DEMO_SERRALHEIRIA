"""Prepare the supplied gate animation for a silent, inline website intro.

Example: python scripts/prepare_intro.py --source /path/to/animation.mp4
Requires ffmpeg, ffprobe and Pillow. Keeps the source's frame rate and timestamps;
H.264 encoding is necessary because the supplied source uses HEVC/H.265.
"""

import argparse
import json
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageStat


def run(command: list[str]) -> bytes:
    return subprocess.check_output(command, stderr=subprocess.PIPE)


def probe(binary: str, path: Path) -> dict:
    return json.loads(run([
        binary, "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)
    ]))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--ffmpeg", default=shutil.which("ffmpeg"))
    parser.add_argument("--ffprobe", default=shutil.which("ffprobe"))
    args = parser.parse_args()
    if not args.ffmpeg or not args.ffprobe:
        raise SystemExit("ffmpeg and ffprobe are required.")

    root = Path(__file__).resolve().parents[1]
    output = root / "public" / "media"
    output.mkdir(parents=True, exist_ok=True)
    target = output / "gate-intro.mp4"
    run([
        args.ffmpeg, "-y", "-v", "error", "-i", str(args.source),
        "-map", "0:v:0", "-an", "-c:v", "libx264", "-preset", "slow",
        "-crf", "18", "-pix_fmt", "yuv420p", "-profile:v", "high", "-level:v", "4.1",
        "-fps_mode", "passthrough", "-movflags", "+faststart", "-map_metadata", "-1", str(target),
    ])
    # Decode the first production frame so poster and playback have the same color treatment.
    poster_bytes = run([
        args.ffmpeg, "-v", "error", "-i", str(target), "-frames:v", "1", "-f", "rawvideo",
        "-pix_fmt", "rgb24", "pipe:1",
    ])
    destination_metadata = probe(args.ffprobe, target)
    video = next(stream for stream in destination_metadata["streams"] if stream["codec_type"] == "video")
    poster = Image.frombytes("RGB", (video["width"], video["height"]), poster_bytes)
    poster.save(output / "gate-poster.webp", "WEBP", quality=90, method=6)

    # Small decoded frames are enough to inspect the opening and final white interval.
    raw_frames = run([
        args.ffmpeg, "-v", "error", "-i", str(args.source), "-vf", "scale=480:270",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1",
    ])
    frame_size = 480 * 270 * 3
    frames = [Image.frombytes("RGB", (480, 270), raw_frames[i:i + frame_size])
              for i in range(0, len(raw_frames), frame_size)]
    selected = [0, 15, 30, 45, 60, 75, 87, len(frames) - 1]
    sheet = Image.new("RGB", (1920, 600), "#e7e7e7")
    draw = ImageDraw.Draw(sheet)
    for index, number in enumerate(selected):
        x, y = (index % 4) * 480, (index // 4) * 300
        sheet.paste(frames[number], (x, y))
        draw.text((x + 12, y + 278), f"frame {number} | {number / 30:.3f} s", fill="#202522")
    qa_dir = root / "test-results"
    qa_dir.mkdir(exist_ok=True)
    sheet.save(qa_dir / "intro-source.jpg", quality=92)

    whites = []
    for index, frame in enumerate(frames):
        luminance = frame.convert("L")
        histogram = luminance.histogram()
        below248 = sum(histogram[:248]) / (480 * 270)
        whites.append({"frame": index, "time": round(index / 30, 6),
                       "min_luma": luminance.getextrema()[0],
                       "mean_luma": round(ImageStat.Stat(luminance).mean[0], 3),
                       "fraction_below_248": round(below248, 6)})
    report = {
        "source": probe(args.ffprobe, args.source),
        "output": destination_metadata,
        "poster_bytes": (output / "gate-poster.webp").stat().st_size,
        "frame_white_analysis": whites,
    }
    (qa_dir / "intro-media-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"file": str(target), "bytes": target.stat().st_size,
                      "video": video, "poster_bytes": report["poster_bytes"],
                      "white_frames": [frame for frame in whites if frame["fraction_below_248"] == 0]}, indent=2))


if __name__ == "__main__":
    main()
