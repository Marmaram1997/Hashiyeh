#!/usr/bin/env python3
"""Loopable background beds from each scene's own sound (animals, water, music as the clip has them).
For each scene the clip's audio is levelled (mean about -16 dB) and made loop-ready: the last f seconds are cross-faded into the first f seconds,
so playing the file in a loop has no click and no dip. Output assets/story/bed/bN.m4a (length = clip length - f).
usage: python3 scripts/build_story_beds.py SCENE1.mp4 CONTINUE20S.mp4   (same cuts as build_story_videos.py)"""
import subprocess, sys, re
a, b = sys.argv[1], sys.argv[2]
CUTS = [0, 83, 163, 244, 327, 404, 481]
scenes = [("b1", a, 0.0, 5.04)] + [(f"b{i+2}", b, CUTS[i]/24, CUTS[i+1]/24) for i in range(6)]
for name, src, s, e in scenes:
    d = round(e - s, 3)
    r = subprocess.run(["ffmpeg","-hide_banner","-ss",str(s),"-t",str(d),"-i",src,"-vn","-af","volumedetect","-f","null","-"],capture_output=True,text=True,stdin=subprocess.DEVNULL)
    g = round(min(8, max(0, -16 - float(re.search(r"mean_volume: (-?[\d.]+)", r.stderr).group(1)))), 1)
    f = round(min(0.6, d * 0.2), 3)
    fc = (f"[0:a]volume={g}dB,alimiter=limit=0.89,asplit=3[x][h][t];[h]atrim=0:{f},asetpts=PTS-STARTPTS[head];[t]atrim={d-f}:{d},asetpts=PTS-STARTPTS[tail];"
          f"[tail]afade=t=out:d={f}:curve=qsin[to];[head]afade=t=in:d={f}:curve=qsin[hi];[to][hi]amix=inputs=2:normalize=0:duration=longest[mix];[x]atrim={f}:{d-f},asetpts=PTS-STARTPTS[mid];[mix][mid]concat=n=2:v=0:a=1[o]")
    subprocess.run(["ffmpeg","-y","-loglevel","error","-ss",str(s),"-t",str(d),"-i",src,"-filter_complex",fc,"-map","[o]","-c:a","aac","-b:a","112k",f"assets/story/bed/{name}.m4a"],check=True,stdin=subprocess.DEVNULL)
    out = subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f"assets/story/bed/{name}.m4a"],capture_output=True,text=True).stdout.strip()
    print(name, "clip", d, "loop", out, "s, gain", g, "dB")
