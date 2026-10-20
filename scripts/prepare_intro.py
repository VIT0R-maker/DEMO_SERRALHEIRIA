"""Retime the two gate films while preserving each original soundtrack's timing.

python scripts/prepare_intro.py --desktop /path/COMPUTADOR.mp4 --mobile /path/CELULAR.mp4
Requires FFmpeg, FFprobe and Pillow. Visual tracks: 1.6 s desktop / 1.8 s mobile.
The container/audio retain the full source duration. Never use -shortest.
"""
import argparse
import json
import shutil
import subprocess
from fractions import Fraction
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageStat


def run(command: list[str]) -> bytes:
    return subprocess.check_output(command, stderr=subprocess.PIPE)


def probe(binary: str, path: Path) -> dict:
    return json.loads(run([binary, "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)]))


def prepare(source: Path, variant: str, seconds: float, ffmpeg: str, ffprobe: str, root: Path) -> dict:
    original = probe(ffprobe, source)
    original_video = next(s for s in original["streams"] if s["codec_type"] == "video")
    original_audio = next(s for s in original["streams"] if s["codec_type"] == "audio")
    if original_audio["codec_name"] != "aac":
        raise ValueError("This workflow expects the supplied AAC soundtrack.")
    fps = 30
    source_fps = float(Fraction(original_video["avg_frame_rate"]))
    samples = round(int(original_audio["duration_ts"]) * Fraction(original_audio["time_base"]) * int(original_audio["sample_rate"]))
    # Remove the static lead-in and white tail from the image only. Keep the
    # last closed frame immediately before sustained movement, so releasing a
    # swipe produces visible motion without changing any of the audio timing.
    thumbnails = run([ffmpeg, "-v", "error", "-i", str(source), "-map", "0:v:0",
                      "-vf", "scale=160:90", "-fps_mode", "passthrough",
                      "-f", "rawvideo", "-pix_fmt", "gray", "pipe:1"])
    source_frames = [Image.frombytes("L", (160, 90), thumbnails[i:i + 14400])
                     for i in range(0, len(thumbnails), 14400)]
    first_white = next(i for i, frame in enumerate(source_frames)
                       if frame.getextrema()[0] >= 235 and ImageStat.Stat(frame).mean[0] > 240)
    differences = [ImageStat.Stat(ImageChops.difference(source_frames[0], frame)).mean[0]
                   for frame in source_frames]
    first_motion = next(i for i in range(1, first_white - 2)
                        if all(value > 3 for value in differences[i:i + 3]))
    first_visual_frame = first_motion - 1
    last_visual_frame = min(first_white + 1, len(source_frames) - 1)
    opening_seconds = (last_visual_frame - first_visual_frame) / source_fps
    # Include the very last white source frame at the last target frame.
    speed_factor = (seconds - 1 / fps) / opening_seconds
    output = root / "public" / "media"
    output.mkdir(parents=True, exist_ok=True)
    target = output / f"gate-{variant}-v4.mp4"
    if source.resolve() == target.resolve():
        raise ValueError("Use the original film or previous prepared version, not the output file.")
    video_filter = (f"trim=start_frame={first_visual_frame}:end_frame={last_visual_frame + 1},"
                    f"setpts=(PTS-STARTPTS)*{speed_factor:.15f},fps={fps},"
                    f"tpad=stop_mode=clone:stop_duration={1 / fps:.15f},"
                    f"trim=duration={seconds},setpts=PTS-STARTPTS")
    run([ffmpeg, "-y", "-v", "error", "-i", str(source), "-map", "0:v:0", "-map", "0:a:0",
         "-vf", video_filter, "-c:v", "libx264", "-preset", "slow", "-crf", "18",
         "-pix_fmt", "yuv420p", "-profile:v", "high", "-level:v", "4.1",
         # Re-encoding retains the source's sample-accurate edit boundary instead
         # of exposing the extra AAC packet padding that stream copy retains.
         "-af", f"atrim=end_sample={samples},asetpts=PTS-STARTPTS", "-c:a", "aac", "-b:a", "192k",
         "-fps_mode", "passthrough", "-movie_timescale", "90000",
         "-movflags", "+faststart", "-map_metadata", "-1", str(target)])
    prepared = probe(ffprobe, target)
    video = next(s for s in prepared["streams"] if s["codec_type"] == "video")
    audio = next(s for s in prepared["streams"] if s["codec_type"] == "audio")
    assert int(video["nb_frames"]) == round(seconds * fps), video
    assert abs(float(video["duration"]) - seconds) < 0.00002, video
    assert audio["duration_ts"] == original_audio["duration_ts"], "Audio sample duration changed"
    assert audio["time_base"] == original_audio["time_base"], "Audio time base changed"
    assert abs(float(prepared["format"]["duration"]) - float(original["format"]["duration"])) < 0.00002

    first_frame = run([ffmpeg, "-v", "error", "-i", str(target), "-map", "0:v:0",
                       "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"])
    Image.frombytes("RGB", (video["width"], video["height"]), first_frame).save(
        output / f"gate-{variant}-v4.webp", "WEBP", quality=90, method=6)
    width, height = (480, 270) if variant == "desktop" else (270, 480)
    raw = run([ffmpeg, "-v", "error", "-i", str(target), "-map", "0:v:0",
               "-vf", f"scale={width}:{height}", "-fps_mode", "passthrough",
               "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"])
    frame_size = width * height * 3
    frames = [Image.frombytes("RGB", (width, height), raw[i:i + frame_size])
              for i in range(0, len(raw), frame_size)]
    first_output_motion = next(i for i, frame in enumerate(frames)
                               if sum(ImageStat.Stat(ImageChops.difference(frames[0], frame)).mean) / 3 > 3)
    assert first_output_motion / fps <= 0.15, "The prepared film still has a static lead-in"
    selected = [round(i * (len(frames) - 1) / 5) for i in range(6)]
    sheet = Image.new("RGB", (width * 3, (height + 30) * 2), "#e7e7e7")
    draw = ImageDraw.Draw(sheet)
    for i, frame in enumerate(selected):
        x, y = (i % 3) * width, (i // 3) * (height + 30)
        sheet.paste(frames[frame], (x, y))
        draw.text((x + 10, y + height + 8), f"{variant} | {frame / fps:.3f} s", fill="#202522")
    qa = root / "test-results"
    qa.mkdir(exist_ok=True)
    sheet.save(qa / f"intro-{variant}-frames.jpg", quality=92)
    last_mean = ImageStat.Stat(frames[-1]).mean
    report = {"variant": variant, "source_opening_seconds": opening_seconds,
              "removed_static_seconds": first_visual_frame / source_fps,
              "first_visible_motion_seconds": first_output_motion / fps,
              "visual_seconds": float(video["duration"]),
              "frames": int(video["nb_frames"]), "audio_seconds": float(audio["duration"]),
              "total_seconds": float(prepared["format"]["duration"]), "bytes": target.stat().st_size,
              "audio_sample_duration_unchanged": True, "last_frame_rgb_mean": last_mean}
    (qa / f"intro-{variant}-media.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--desktop", required=True, type=Path)
    parser.add_argument("--mobile", required=True, type=Path)
    args = parser.parse_args()
    ffmpeg, ffprobe = shutil.which("ffmpeg"), shutil.which("ffprobe")
    if not ffmpeg or not ffprobe:
        raise SystemExit("ffmpeg and ffprobe are required.")
    root = Path(__file__).resolve().parents[1]
    for variant, source, seconds in [("desktop", args.desktop, 1.6), ("mobile", args.mobile, 1.8)]:
        print(json.dumps(prepare(source, variant, seconds, ffmpeg, ffprobe, root), indent=2), flush=True)


if __name__ == "__main__":
    main()
