"""Find and inpaint the fixed Kling watermark in a video's frames.
mask_for(video, box)  -> binary mask (full frame) of pixels that are near-white in >=80% of sampled frames inside `box` (x0,y0,x1,y1), dilated.
clean(frame, mask)    -> inpainted frame.  The mark is static, the artwork underneath hardly moves, so a fixed mask is consistent over time."""
import cv2, numpy as np
def mask_for(path, box, step=8, thr=185, frac=0.8, grow=5):
    cap = cv2.VideoCapture(path); x0,y0,x1,y1 = box; acc=None; n=0; i=0; shape=None
    while True:
        ok, f = cap.read()
        if not ok: break
        shape = f.shape[:2]
        if i % step == 0:
            r = f[y0:y1, x0:x1].min(axis=2) > thr
            acc = r.astype(np.float32) if acc is None else acc + r; n += 1
        i += 1
    m = (acc/n >= frac).astype(np.uint8)*255
    m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*grow+1,2*grow+1)))
    full = np.zeros(shape, np.uint8); full[y0:y1, x0:x1] = m
    return full
def clean(frame, mask, radius=6):
    return cv2.inpaint(frame, mask, radius, cv2.INPAINT_TELEA)

import subprocess
# watermark boxes (x0,y0,x1,y1) in source pixels; threshold per source
BOXES = {"scene1": ((1385,1160,1635,1225), 200), "continue": ((1085,660,1262,706), 150)}
def clean_video(src, dst, key):
    """write a lossless copy of `src` (video only) with the watermark inpainted"""
    box, thr = BOXES[key]; m = mask_for(src, box, thr=thr, grow=5)
    cap = cv2.VideoCapture(src); w = int(cap.get(3)); h = int(cap.get(4)); fps = cap.get(5)
    p = subprocess.Popen(["ffmpeg","-y","-loglevel","error","-f","rawvideo","-pix_fmt","bgr24","-s",f"{w}x{h}","-r",str(fps),"-i","-","-c:v","ffv1",dst], stdin=subprocess.PIPE)
    n = 0
    while True:
        ok, f = cap.read()
        if not ok: break
        p.stdin.write(clean(f, m, 4).tobytes()); n += 1
    p.stdin.close(); p.wait(); return n
