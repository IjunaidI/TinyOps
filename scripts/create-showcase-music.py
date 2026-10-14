#!/usr/bin/env python3
"""Render the original Jevtown showcase score (no third-party audio samples).

Requires NumPy. Run with a Python environment containing it:
    python3 scripts/create-showcase-music.py

120 BPM / 4/4 / 28 bars / exactly 56 seconds. Beat = 0.5 seconds;
bar = 2 seconds. Main edit points: 0, 4, 12, 24, 28, 44, 52, 56.
The composition and all instruments are generated here from elementary waves.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import wave

import numpy as np

SR = 48_000
BPM = 120
BEAT = 60.0 / BPM
DURATION = 56.0
RNG = np.random.default_rng(76113)
N = int(SR * DURATION)


def hz(note: float) -> float:
    return 440.0 * 2 ** ((note - 69) / 12)


def timeline(seconds: float) -> np.ndarray:
    return np.arange(int(seconds * SR), dtype=np.float64) / SR


def envelope(t: np.ndarray, attack: float, decay: float) -> np.ndarray:
    return (1 - np.exp(-t / attack)) * np.exp(-t / decay)


def add(bus: np.ndarray, audio: np.ndarray, start: float, gain: float = 1, pan: float = 0):
    """Equal-power panning; clip a voice at the composition boundary."""
    offset = round(start * SR)
    if offset >= N:
        return
    if offset < 0:
        audio = audio[-offset:]
        offset = 0
    length = min(len(audio), N - offset)
    theta = (pan + 1) * math.pi / 4
    bus[offset:offset + length, 0] += audio[:length] * (gain * math.cos(theta))
    bus[offset:offset + length, 1] += audio[:length] * (gain * math.sin(theta))


def pluck(note: int, duration: float = 1.7, mellow: float = 1) -> np.ndarray:
    t = timeline(duration)
    f = hz(note)
    # Soft felt/glass hybrid: partials decay progressively faster, never a harsh square wave.
    signal = (
        np.sin(2 * np.pi * f * t) * envelope(t, .005, .46)
        + .28 * np.sin(2 * np.pi * (f * 2.003) * t) * envelope(t, .003, .22)
        + .075 * mellow * np.sin(2 * np.pi * (f * 3.001) * t) * envelope(t, .002, .12)
        + .04 * np.sin(2 * np.pi * f * .5 * t) * envelope(t, .009, .35)
    )
    return signal


def pad(notes: list[int], duration: float = 2.45) -> np.ndarray:
    t = timeline(duration)
    gate = (1 - np.exp(-t / .13)) * np.minimum(1, np.maximum(0, (duration - t) / .48))
    wave_sum = np.zeros_like(t)
    for i, note in enumerate(notes):
        f = hz(note)
        phase = i * .63
        wave_sum += (
            .66 * np.sin(2 * np.pi * f * t + phase)
            + .23 * np.sin(2 * np.pi * f * 1.0018 * t + phase + .25)
            + .11 * np.sin(2 * np.pi * f * 1.998 * t + phase)
        )
    return wave_sum * gate / len(notes)


def bass(note: int, duration: float = .4) -> np.ndarray:
    t = timeline(duration)
    f = hz(note)
    gate = (1 - np.exp(-t / .007)) * np.exp(-t / .34)
    gate *= np.minimum(1, np.maximum(0, (duration - t) / .055))
    body = np.sin(2 * np.pi * f * t) + .2 * np.sin(2 * np.pi * f * 2 * t)
    return np.tanh(body * 1.3) * gate


def kick() -> np.ndarray:
    t = timeline(.5)
    # Pitch settles quickly at 49Hz; tiny click remains soft on phone speakers.
    phase = 2 * np.pi * (49 * t + 85 * .025 * (1 - np.exp(-t / .025)))
    body = np.sin(phase) * envelope(t, .001, .11)
    click = RNG.normal(0, 1, len(t)) * np.exp(-t / .002) * .045
    return (body + click) * np.minimum(1, np.maximum(0, (.5 - t) / .025))


def snare() -> np.ndarray:
    t = timeline(.24)
    noise = RNG.normal(0, 1, len(t))
    # Small smoothing kernel eliminates fizzy extremes, then subtract low band.
    smooth = np.convolve(noise, np.array([.15, .7, .15]), mode="same")
    high = smooth - np.convolve(smooth, np.ones(29) / 29, mode="same")
    clap = high * envelope(t, .0018, .039)
    body = .23 * np.sin(2 * np.pi * 185 * t) * envelope(t, .001, .036)
    return clap * .38 + body


def hat(open_hat: bool = False) -> np.ndarray:
    duration = .27 if open_hat else .09
    t = timeline(duration)
    noise = RNG.normal(0, 1, len(t))
    high = noise - np.convolve(noise, np.ones(11) / 11, mode="same")
    high = np.convolve(high, np.array([.2, .6, .2]), mode="same")
    return high * envelope(t, .0007, .058 if open_hat else .017) * .22


def shimmer() -> np.ndarray:
    t = timeline(1.75)
    noise = RNG.normal(0, 1, len(t))
    softened = np.convolve(noise, np.ones(15) / 15, mode="same")
    high = softened - np.convolve(softened, np.ones(301) / 301, mode="same")
    return high * envelope(t, .016, .44)


def ambience() -> np.ndarray:
    """A sparse stereo delay and diffuse early reflections; original dry bus stays clear."""
    return np.zeros((N, 2), dtype=np.float64)


def render() -> tuple[np.ndarray, dict]:
    music = ambience()
    drums = ambience()
    lows = ambience()
    # D major, with open ninths and no busy melody under the captions.
    chords = [
        ([62, 66, 69, 73, 76], 38, [74, 78, 81, 85]),  # Dmaj9
        ([59, 62, 66, 69, 74], 31, [71, 74, 78, 81]),  # Gmaj9
        ([59, 62, 66, 69, 73], 35, [73, 74, 78, 81]),  # Bm9
        ([61, 64, 69, 71, 76], 33, [73, 76, 81, 83]),  # Aadd9
    ]
    for bar in range(28):
        at = bar * 4 * BEAT
        notes, root, arp = chords[bar % 4]
        if bar == 27:
            notes, root, arp = chords[0]
        breakdown = bar in (12, 13)
        closing = bar >= 26
        full = 6 <= bar < 26 and not breakdown
        # Pads widen without swallowing the transients.
        pad_gain = .095 if bar < 2 else .12
        if breakdown:
            pad_gain = .15
        add(music, pad(notes), at, pad_gain, -.34)
        add(music, pad([n + 12 for n in notes], 2.38), at + .015, pad_gain * .31, .48)

        # Felt chord stabs on the offbeats, each note slightly staggered.
        if bar >= 2 and not breakdown and not closing:
            for beat_at in (.5, 1.75, 2.5, 3.5):
                for index, note in enumerate(notes[:4]):
                    add(music, pluck(note, 1.1, .6), at + beat_at * BEAT + index * .004,
                        .055 if full else .042, -.15 + index * .1)

        # A short call/response that changes register and leaves intentional space.
        motif = [(0, 0), (.75, 2), (1.5, 1), (2.75, 3), (3.5, 2)]
        if bar % 2:
            motif = [(.5, 1), (1.25, 0), (2.5, 2), (3.25, 1)]
        if breakdown or closing:
            motif = [(0, 0), (2, 2)]
        for index, (beat_at, degree) in enumerate(motif):
            if bar == 27 and index > 0:
                continue
            gain = .104 if full else .095
            note = arp[degree] - (12 if breakdown else 0)
            add(music, pluck(note), at + beat_at * BEAT, gain,
                .22 if index % 2 == 0 else -.25)
        # A restrained upper counterline makes the late lift feel earned.
        if 22 <= bar < 26:
            for b, d in ((1, 0), (2.5, 1), (3, 2)):
                add(music, pluck(arp[d] + 12, 1.2, .5), at + b * BEAT, .032, .48)

        # Root and occasional fifth: rhythmic rather than a wall of sub-bass.
        if bar >= 1:
            pattern = [(0, root, .44), (1.5, root, .23), (2, root + 12, .34), (3.25, root + 7, .3)]
            if breakdown or closing:
                pattern = [(0, root, .82), (2, root + 12, .55)]
            if bar == 27:
                pattern = [(0, root, 1.4)]
            for b, note, length in pattern:
                add(lows, bass(note, length), at + b * BEAT, .19 if full else .16)

        # Drum entrances and dropouts give the edit obvious visual punctuation.
        if 2 <= bar < 27 and not breakdown:
            kick_beats = [0, 1, 2, 3] if not closing else [0, 2]
            for b in kick_beats:
                add(drums, kick(), at + b * BEAT, .32)
            if not closing:
                for b in (1, 3):
                    add(drums, snare(), at + b * BEAT + .007, .19)
                for step in range(8):
                    # Eight milliseconds of swing only on the light offbeats.
                    swing = .008 if step % 2 else 0
                    add(drums, hat(step in (3, 7) and full), at + step * BEAT / 2 + swing,
                        .34 if step % 2 else .21, -.3 if step % 2 else .25)
                if bar in (5, 11, 21, 25):
                    for b in (3.25, 3.75):
                        add(drums, snare(), at + b * BEAT, .055, .18)
        if bar in (2, 6, 14, 22):
            add(music, shimmer(), at, .13, .1)

    # Stereo eighth/dotted-eighth echoes and a quiet multi-tap room.
    wet = ambience()
    for delay, gain in ((.1875, .105), (.375, .09), (.5625, .065), (.75, .038)):
        shift = round(delay * SR)
        wet[shift:] += music[:-shift, ::-1] * gain
    for delay, gain, cross in ((.041, .045, False), (.067, .037, True), (.113, .031, False),
                               (.151, .025, True), (.227, .022, False), (.317, .017, True),
                               (.463, .014, False), (.631, .01, True), (.887, .008, False)):
        shift = round(delay * SR)
        wet[shift:] += music[:-shift, ::-1 if cross else 1] * gain

    # Gentle rhythmic breathing keeps the kick articulated in the busy sections.
    t = np.arange(N, dtype=np.float64) / SR
    phase = np.mod(t, BEAT)
    duck = 1 - .12 * np.exp(-phase / .10)
    mix = (music + wet) * duck[:, None] + drums + lows
    mix -= np.mean(mix, axis=0, keepdims=True)
    mix = np.tanh(mix * 1.25) / 1.25

    # Half-second opening and natural two-second end, no abrupt final waveform cut.
    fade_in = np.minimum(1, t / .32)
    fade_out = np.minimum(1, np.maximum(0, (DURATION - t) / 1.75)) ** 1.35
    mix *= (fade_in * fade_out)[:, None]
    mix *= .86 / np.max(np.abs(mix))
    stats = {
        "duration_seconds": DURATION, "sample_rate": SR, "channels": 2,
        "tempo_bpm": BPM, "beat_seconds": BEAT, "bar_seconds": BEAT * 4,
        "edit_points_seconds": [0, 4, 12, 24, 28, 44, 52, 56],
        "peak_dbfs": round(20 * np.log10(np.max(np.abs(mix))), 2),
        "rms_dbfs": round(20 * np.log10(np.sqrt(np.mean(mix ** 2))), 2),
        "clipped_samples": int(np.sum(np.abs(mix) >= 1)),
    }
    return mix, stats


def main():
    default = Path(__file__).resolve().parents[1] / "exports/jevtown/source/jevtown-music.wav"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=default)
    args = parser.parse_args()
    mix, stats = render()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    pcm = np.round(np.clip(mix, -1, 1) * 32767).astype("<i2")
    with wave.open(str(args.output), "wb") as out:
        out.setnchannels(2)
        out.setsampwidth(2)
        out.setframerate(SR)
        out.writeframes(pcm.tobytes())
    with wave.open(str(args.output), "rb") as check:
        assert check.getnframes() == N
        assert check.getframerate() == SR
        assert check.getnchannels() == 2
    assert stats["clipped_samples"] == 0
    print(json.dumps({"output": str(args.output), **stats}, indent=2))


if __name__ == "__main__":
    main()
