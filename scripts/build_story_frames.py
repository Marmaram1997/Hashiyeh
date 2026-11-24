#!/usr/bin/env python3
"""Cut the supplied Kling clips into per-scene WebP frame sequences for the scroll story.

Scene 1  = 5 s clip (4:3)                      -> assets/story/frames/s1
Scenes 2-7 = shots of the 20 s clip (16:9), cut at the detected shot boundaries -> s2..s7
(24 fps source, every 2nd frame kept = 12 fps, plus each shot's exact last frame.)

usage: python3 scripts/build_story_frames.py SCENE1.mp4 CONTINUE20S.mp4
The source videos are not stored in the repo (about 44 MB, third-party watermark, mixed audio).
"""
import subprocess, sys, os, shutil, glob, json
s1_src, s2_src = sys.argv[1], sys.argv[2]
OUT = "assets/story/frames"
# shot boundaries of the 20 s clip, detected from frame differences (first frame of each shot)
CUTS = [0, 83, 163, 244, 327, 404, 481]
def probe_frames(p):
    r = subprocess.run(["ffprobe","-v","error","-count_frames","-select_streams","v:0","-show_entries","stream=nb_read_frames","-of","csv=p=0",p],capture_output=True,text=True)
    return int(r.stdout.strip())
def cut(src, first, last, scale, d, q=42):
    """frames first..last-1 of src; keep even offsets and the final frame."""
    os.makedirs(d, exist_ok=True)
    for f in glob.glob(d+"/*.webp"): os.remove(f)
    n = last-first
    sel = "between(n\\,%d\\,%d)*(not(mod(n-%d\\,2))+eq(n\\,%d))" % (first,last-1,first,last-1)
    subprocess.run(["ffmpeg","-y","-loglevel","error","-i",src,"-vf","select='%s',scale=%s:flags=lanczos"%(sel,scale),"-vsync","vfr","-c:v","libwebp","-quality",str(q),"-compression_level","4",d+"/%03d.webp"],check=True)
    return len(glob.glob(d+"/*.webp"))
info = {}
n1 = probe_frames(s1_src)
info["s1"] = dict(count=cut(s1_src,0,n1,"960:720",OUT+"/s1"), src_frames=n1, w=960, h=720)
for k in range(6):
    a,b = CUTS[k],CUTS[k+1]
    info["s%d"%(k+2)] = dict(count=cut(s2_src,a,b,"1024:576",OUT+"/s%d"%(k+2)), src_frames=b-a, w=1024, h=576)
# one still per scene for the no-JS / reduced-motion reading sequence
for sid,v in info.items():
    mid = (v["count"]+1)//2 + (0 if sid!="s1" else 0)
    subprocess.run(["ffmpeg","-y","-loglevel","error","-i",f"{OUT}/{sid}/%03d.webp","-vf",f"select=eq(n\\,{v['count']//2})","-frames:v","1","-q:v","3",f"assets/story/{sid}-still.jpg"],check=True)
json.dump(info,open("assets/story/frames/info.json","w"),indent=1)
print(json.dumps(info))
