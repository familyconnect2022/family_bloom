#!/usr/bin/env python3
"""Generate the eight offline, theme-specific Family Bloom hero reading veils.

Builds no runtime blur, filter or mask: expo-image merely draws a local transparent
PNG.  This intentionally covers the text's rightmost line more strongly than the
original short left-edge shade. Run with Pillow + numpy only when regenerating art;
all assets are checked in so Android builds need neither dependency.
"""
from pathlib import Path
import math
import numpy as np
from PIL import Image

HERE = Path(__file__).resolve()
OUTPUT = HERE.parents[2] / 'assets/images/storybook/shades'
SIZE = (512, 512)
# These are the appearance background tones in src/theme/palette.ts.
THEMES = {
    'rose': {'light': '#FFF6F8', 'dark': '#18141C'},
    'garden': {'light': '#F2F8F3', 'dark': '#131A17'},
    'heritage': {'light': '#FCF6ED', 'dark': '#1D1814'},
    'midnight': {'light': '#F4F2FC', 'dark': '#161521'},
}

def smooth(value, left, right):
    t = np.clip((value-left)/(right-left), 0.0, 1.0)
    return t*t*(3-2*t)

def shaped_veil(dark):
    w,h = SIZE
    y,x = np.mgrid[0:h,0:w].astype(np.float32)
    y /= (h-1)
    x /= (w-1)
    # Low-frequency cloud edge, not a sharply bounded left-side rectangle.
    wobble = (0.018*np.sin(2*math.pi*(y*2.1+0.18))
             +0.011*np.sin(2*math.pi*(y*3.7+0.48)))
    xx = x+wobble
    # Opaque underneath even the final character of long 3/4-line subtitles;
    # fades to zero only once outside the 80% headline copy region.
    xs = [0, 0.32, 0.56, 0.74, 0.82, 0.91, 1.0]
    vals = [0.93,0.93,0.91,0.86,0.77,0.40,0.00] if dark else [0.88,0.88,0.86,0.81,0.70,0.33,0.00]
    horizontal = np.zeros_like(xx)
    horizontal.fill(vals[-1])
    for i in range(len(xs)-1):
        a,b = xs[i],xs[i+1]
        blend=smooth(xx,a,b)
        value=vals[i]+(vals[i+1]-vals[i])*blend
        horizontal=np.where((xx>=a)&(xx<b), value, horizontal)
    horizontal=np.where(xx<xs[0],vals[0],horizontal)
    # Slight mist behind status bar, stronger reading veil under title/subtitle,
    # tapering naturally into the independent lower-edge atmospheric fog.
    vertical=(0.43 + 0.57*smooth(y,0.05,0.28))*(1-0.99*smooth(y,0.82,1.0))
    # Subtle asymmetric drifting cloud contour, kept below one alpha percent in
    # the main reading region so it cannot create contrast holes in the text.
    mist=1-0.018*np.maximum(0,np.sin(2*math.pi*(x*1.8+y*2.7)))
    return np.uint8(np.clip(horizontal*vertical*mist, 0,1)*255+0.5)

def write():
    OUTPUT.mkdir(parents=True,exist_ok=True)
    for theme, modes in THEMES.items():
        for mode,hex_color in modes.items():
            rgb=tuple(int(hex_color[i:i+2],16) for i in (1,3,5))
            arr=np.empty((SIZE[1],SIZE[0],4),dtype=np.uint8)
            arr[:,:,:3]=rgb
            arr[:,:,3]=shaped_veil(mode=='dark')
            file=OUTPUT/f'{theme}_{mode}.png'
            Image.fromarray(arr,'RGBA').save(file,optimize=True)
            print(file.relative_to(HERE.parents[2]), 'RGBA', file.stat().st_size)

if __name__=='__main__': write()
