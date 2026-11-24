#!/usr/bin/env python3
"""Per-scene MP4s (picture with the KlingAI watermark painted out + the clip's own sound, levelled) and first-frame posters for the book-style story page.
usage: python3 scripts/build_story_videos.py SCENE1.mp4 CONTINUE20S.mp4 [CLEAN_SCENE1.mkv CLEAN_CONTINUE.mkv]
Scene 1 = 5 s 4:3 clip; scenes 2-7 = the six shots of the 20 s clip (24 fps frames 0,83,163,244,327,404,481).
Output: assets/story/video/sN.mp4, assets/story/poster/pN.jpg"""
import subprocess, sys, os, tempfile, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import remove_watermark as WM
a, b = sys.argv[1], sys.argv[2]
if len(sys.argv) > 4: ca, cb = sys.argv[3], sys.argv[4]
else:
    t = tempfile.mkdtemp(); ca, cb = t+"/s1.mkv", t+"/s2.mkv"; WM.clean_video(a, ca, "scene1"); WM.clean_video(b, cb, "continue")
CUTS = [0, 83, 163, 244, 327, 404, 481]
scenes = [("s1", a, ca, 0.0, 5.04, "960:720")] + [(f"s{i+2}", b, cb, CUTS[i]/24, CUTS[i+1]/24, "1024:576") for i in range(6)]
def mean_vol(src, ss, d):
    r = subprocess.run(["ffmpeg","-hide_banner","-ss",str(ss),"-t",str(d),"-i",src,"-vn","-af","volumedetect","-f","null","-"],capture_output=True,text=True,stdin=subprocess.DEVNULL)
    return float(re.search(r"mean_volume: (-?[\d.]+)", r.stderr).group(1))
for sid, src, clean, s, e, size in scenes:
    d = round(e-s, 3); g = round(min(18, max(0, -16 - mean_vol(src, s, d))), 1)
    out = f"assets/story/video/{sid}.mp4"
    subprocess.run(["ffmpeg","-y","-loglevel","error","-ss",str(s),"-t",str(d),"-i",clean,"-ss",str(s),"-t",str(d),"-i",src,
        "-map","0:v:0","-map","1:a:0","-vf",f"scale={size}:flags=lanczos,format=yuv420p","-c:v","libx264","-preset","slow","-crf","26","-movflags","+faststart",
        "-af",f"volume={g}dB,alimiter=limit=0.89,afade=t=in:d=0.08,afade=t=out:st={max(0,round(d-0.25,3))}:d=0.25","-c:a","aac","-b:a","112k","-shortest",out],check=True,stdin=subprocess.DEVNULL)
    subprocess.run(["ffmpeg","-y","-loglevel","error","-i",out,"-frames:v","1","-q:v","3",f"assets/story/poster/p{sid[1:]}.jpg"],check=True,stdin=subprocess.DEVNULL)
    print(sid, d, "s", f"gain {g} dB", os.path.getsize(out)//1024, "KB")
