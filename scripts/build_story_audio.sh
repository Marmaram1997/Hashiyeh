#!/bin/bash
# Cut each scene's sound from the Kling clips and bring it to a clearly audible level (mean about -16 dB, peaks limited).
# usage: scripts/build_story_audio.sh SCENE1.mp4 CONTINUE20S.mp4   (scene 2-7 times = shot cuts of the 20 s clip, 24 fps frames 0,83,163,244,327,404,481)
A=$1; B=$2; D=assets/story/audio; mkdir -p $D
cut(){ # name src start end
  d=$(python3 -c "print(round($4-$3,3))")
  m=$(ffmpeg -hide_banner -ss $3 -t $d -i $2 -vn -af volumedetect -f null - 2>&1 </dev/null | grep mean_volume | sed 's/.*: \(.*\) dB/\1/')
  g=$(python3 -c "print(round(min(18,max(0,-16-($m))),1))")
  ffmpeg -v error -y -ss $3 -t $d -i $2 -vn -af "volume=${g}dB,alimiter=limit=0.89,afade=t=in:d=0.12,afade=t=out:st=$(python3 -c "print(max(0,round($d-0.25,3)))"):d=0.25" -c:a aac -b:a 112k $D/$1.m4a </dev/null
  echo $1 gain ${g}dB
}
cut s1 $A 0 5.04
i=2; prev=0
for f in 83 163 244 327 404 481; do cut s$i $B $(python3 -c "print(round($prev/24,3))") $(python3 -c "print(round($f/24,3))"); prev=$f; i=$((i+1)); done
