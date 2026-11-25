#!/usr/bin/env python3
"""Scene 5 (the lion holds the hare and looks into the well) from the 10 s Kling clip of 25 Nov.
usage: python3 scripts/build_story_scene5.py CLIP.mp4
Writes assets/story/video/s5.mp4, poster/p5.jpg and bed/b5.m4a (whole clip as a cross-faded loop)."""
import subprocess, sys, os, re, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import remove_watermark as WM
src = sys.argv[1]; clean = tempfile.mkdtemp() + "/s5.mkv"; WM.clean_video(src, clean, "scene5")
def run(a): subprocess.run(a, check=True, stdin=subprocess.DEVNULL)
r = subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",src],capture_output=True,text=True); d = round(float(r.stdout), 3)
v = subprocess.run(["ffmpeg","-hide_banner","-i",src,"-vn","-af","volumedetect","-f","null","-"],capture_output=True,text=True,stdin=subprocess.DEVNULL)
m = float(re.search(r"mean_volume: (-?[\d.]+)", v.stderr).group(1))
g = round(min(18, max(0, -16 - m)), 1); gb = round(min(8, max(0, -16 - m)), 1)
out = "assets/story/video/s5.mp4"
run(["ffmpeg","-y","-loglevel","error","-i",clean,"-i",src,"-map","0:v:0","-map","1:a:0","-vf","scale=1024:576:flags=lanczos,format=yuv420p",
     "-c:v","libx264","-preset","slow","-crf","26","-movflags","+faststart","-af",f"volume={g}dB,alimiter=limit=0.89,afade=t=in:d=0.08,afade=t=out:st={round(d-0.25,3)}:d=0.25",
     "-c:a","aac","-b:a","112k","-shortest",out])
run(["ffmpeg","-y","-loglevel","error","-i",out,"-frames:v","1","-q:v","3","assets/story/poster/p5.jpg"])
f = 0.6
fc = (f"[0:a]volume={gb}dB,alimiter=limit=0.89,asplit=3[x][h][t];[h]atrim=0:{f},asetpts=PTS-STARTPTS[head];[t]atrim={d-f}:{d},asetpts=PTS-STARTPTS[tail];"
      f"[tail]afade=t=out:d={f}:curve=qsin[to];[head]afade=t=in:d={f}:curve=qsin[hi];[to][hi]amix=inputs=2:normalize=0:duration=longest[mix];[x]atrim={f}:{d-f},asetpts=PTS-STARTPTS[mid];[mix][mid]concat=n=2:v=0:a=1[o]")
run(["ffmpeg","-y","-loglevel","error","-i",src,"-filter_complex",fc,"-map","[o]","-c:a","aac","-b:a","112k","assets/story/bed/b5.m4a"])
print("s5", d, "s gain", g, os.path.getsize(out)//1024, "KB")
