#!/usr/bin/env python3
"""
Trace the Noir reference sheet into pixel-grid sprite data.

    python3 script/mascot-trace.py

Reads  brand/mascot/noir-reference-sheet.jpg  (5 x 4 sheet, white ground, one
labelled pose per cell) and writes  src/mascot/sprites.ts.

What it does, in order:
  1. cuts the sheet into 20 cells, erases the black label boxes, and removes
     the white ground (including the white gaps between the legs)
  2. resamples every sprite to a uniform grid, 2 source pixels per grid pixel
  3. fixes the JPEG's white fringe on the silhouette
  4. quantizes to a small palette, with its own dedicated entries for the
     ice-blue glowing eyes (Noir's identity) so they never merge into grey
  5. splits effect marks (question marks, sparkles, motion lines) from the body
  6. run-length encodes the grids and writes the TypeScript module

The output is deterministic: fixed seeds, no clock. Re-running on the same
reference produces the same file.

Needs: pillow, numpy, scipy, scikit-learn. Dev tool only; nothing at render
time depends on Python or on the reference image.
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# ───────────────────────────── 1. extract ─────────────────────────────

SRC=os.path.join(ROOT,'brand','mascot','noir-reference-sheet.jpg')
im=Image.open(SRC).convert('RGB')
A=np.array(im).astype(np.float32)
H,W,_=A.shape

# 5 columns x 4 rows. Boundaries chosen in the gaps between sprites.
COLS=[0,330,640,930,1230,W]
ROWS=[0,258,510,764,H]

# 1) remove the black rounded label boxes ("1. Idle" ...)
dark=(A.max(axis=2)<80)
lab,n=ndi.label(dark)
for i,s in enumerate(ndi.find_objects(lab)):
    h=s[0].stop-s[0].start; w=s[1].stop-s[1].start
    if w>=50 and 14<=h<=32:
        fill=(lab[s]==i+1).sum()/(w*h)
        if fill>0.55:
            y0,y1=max(0,s[0].start-3),s[0].stop+3; x0,x1=max(0,s[1].start-3),s[1].stop+3
            A[y0:y1,x0:x1]=255.0

NAMES=['idle','idle-2','cross-arms','wave','thumbs-up',
       'point','peace','thinking','confused','shocked',
       'walk','run','jump','sit','crouch',
       'lie-down','lying-back','kneel','angry','victory']

cells={}
for idx,name in enumerate(NAMES):
    r,c=divmod(idx,5)
    x0,x1=COLS[c],COLS[c+1]; y0,y1=ROWS[r],ROWS[r+1]
    crop=A[y0:y1,x0:x1]
    near_white=(crop.min(axis=2)>=232)
    # background = near-white connected to the cell border
    bl,bn=ndi.label(near_white)
    border=set(np.unique(np.concatenate([bl[0,:],bl[-1,:],bl[:,0],bl[:,-1]])))-{0}
    bg=np.isin(bl,list(border))
    # enclosed white gaps (between the legs, under an arm) are background too;
    # sneaker whites are small, so only large enclosed regions qualify.
    for k in range(1,bn+1):
        if k in border: continue
        m=bl==k
        ys_,xs_=np.where(m)
        # gaps are tall; sneaker whites are short strips (3-7 px high)
        if m.sum()>=40 and (ys_.max()-ys_.min()+1)>=10: bg[m]=True
    fg=~bg
    # drop JPEG specks: tiny isolated components
    fl,fn=ndi.label(fg,structure=np.ones((3,3)))
    sizes=ndi.sum(fg,fl,range(1,fn+1))
    for k,sz in enumerate(sizes,1):
        if sz<14: fg[fl==k]=False
    ys,xs=np.where(fg)
    box=(xs.min(),ys.min(),xs.max()+1,ys.max()+1)
    cells[name]=(crop,fg,box)


# ───────────────────────────── 2-5. resample, quantize, split ─────────────────────────────
cells={k:(v[0],v[1],v[2]) for k,v in cells.items()}
NAMES=list(cells.keys())
from sklearn.cluster import KMeans

P=2

def downsample(crop,fg,box):
    x0,y0,x1,y1=box
    c=crop[y0:y1,x0:x1]; m=fg[y0:y1,x0:x1].astype(np.float32)
    h,w=m.shape
    H=(h+P-1)//P*P; W=(w+P-1)//P*P
    cp=np.zeros((H,W,3),np.float32); mp=np.zeros((H,W),np.float32)
    cp[:h,:w]=c; mp[:h,:w]=m
    ms=mp.reshape(H//P,P,W//P,P).sum(axis=(1,3))
    cs=(cp*mp[...,None]).reshape(H//P,P,W//P,P,3).sum(axis=(1,3))
    alpha=ms/(P*P)
    rgb=np.where(ms[...,None]>0, cs/np.maximum(ms[...,None],1), 0)
    return alpha>=0.5, rgb

lum=lambda c: c.max(axis=-1)

def fix_fringe(m,rgb):
    """The outermost layer is blended with the white page by the JPEG. Where it
    sits on a dark neighbour, take the neighbour's colour instead."""
    out=rgb.copy()
    pad=np.pad(m,1); prgb=np.pad(rgb,((1,1),(1,1),(0,0)))
    H,W=m.shape
    for y in range(H):
        for x in range(W):
            if not m[y,x]: continue
            nb=[(y-1,x),(y+1,x),(y,x-1),(y,x+1)]
            outside=any(not pad[ny+1,nx+1] for ny,nx in nb)
            if not outside: continue
            inner=[prgb[ny+1,nx+1] for ny,nx in nb if pad[ny+1,nx+1]]
            if not inner: continue
            dark=min(inner,key=lambda c:c.max())
            if dark.max()<48 and rgb[y,x].max()>dark.max()+30:
                out[y,x]=dark
    return out

grids={}
for n in NAMES:
    m,rgb=downsample(*cells[n])
    grids[n]=(m,fix_fringe(m,rgb))

def is_eye(rgb):
    r,g,b=rgb[...,0],rgb[...,1],rgb[...,2]
    return (b-r>=12)&(rgb.max(axis=-1)>=125)

allpx=np.concatenate([rgb[m] for m,rgb in grids.values()])
eyemask=is_eye(allpx)
eye_c=KMeans(n_clusters=3,n_init=5,random_state=3).fit(allpx[eyemask]).cluster_centers_
eye_c=eye_c[np.argsort(eye_c.sum(axis=1))]
rest=allpx[~eyemask]
val=rest.max(axis=1)
w=np.where(val<70,1.0,np.where(val<140,3.0,10.0))
main_c=KMeans(n_clusters=24,n_init=4,random_state=7).fit(rest,sample_weight=w).cluster_centers_
main_c=main_c[np.argsort(main_c.sum(axis=1))]

KEYS='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
palette={}
for i,c in enumerate(main_c): palette[KEYS[i]]=c
EYE_KEYS=[]
for j,c in enumerate(eye_c):
    k=KEYS[len(main_c)+j]; palette[k]=c; EYE_KEYS.append(k)
keys=list(palette.keys()); cen=np.array([palette[k] for k in keys])
eye_idx=[keys.index(k) for k in EYE_KEYS]; main_idx=[i for i in range(len(keys)) if i not in eye_idx]

def classify(m,rgb):
    d=((rgb[...,None,:]-cen[None,None,:,:])**2).sum(-1)
    d_main=d.copy(); d_main[...,eye_idx]=1e12
    d_eye=d.copy(); d_eye[...,main_idx]=1e12
    ey=is_eye(rgb)
    idx=np.where(ey[...,None],d_eye,d_main).argmin(-1)
    return idx

sprites={}
anchors={}
for n in NAMES:
    m,rgb=grids[n]; idx=classify(m,rgb)
    h,w_=m.shape
    bottom=m[max(0,h-6):,:]
    xs=np.where(bottom)[1]
    anchors[n]=float(xs.mean())
    sprites[n]=(m,idx)

L=int(np.ceil(max(anchors.values()))); R=int(np.ceil(max(sprites[n][0].shape[1]-anchors[n] for n in NAMES)))
Hc=max(sprites[n][0].shape[0] for n in NAMES)
HALF=max(L,R); CW=2*HALF

def rle(row_keys):
    out=[];prev=None;cnt=0
    for k in row_keys:
        if k==prev: cnt+=1
        else:
            if prev is not None: out.append(f'{prev}{cnt}')
            prev=k;cnt=1
    out.append(f'{prev}{cnt}')
    return ''.join(out)

GLYPH_POSES={'thinking','confused','shocked','lie-down'}   # ? ?? !! zzz must never be mirrored

def encode(mask,idx,box):
    y0,x0,y1,x1=box
    return [rle(['_' if not mask[y,x] else keys[idx[y,x]] for x in range(x0,x1)]) for y in range(y0,y1)]

data={}
for n in NAMES:
    m,idx=sprites[n]; h,w_=m.shape
    lab,cnt=ndi.label(m,structure=np.ones((3,3)))
    sizes=ndi.sum(m,lab,range(1,cnt+1))
    main_id=int(np.argmax(sizes))+1
    body=(lab==main_id)
    fx=[]
    for k,sz in enumerate(sizes,1):
        if k==main_id: continue
        cm=(lab==k)
        ys,xs=np.where(cm); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
        wd,ht=x1-x0,y1-y0
        floor_shadow = ht<=14 and wd/ht>=4 and y1>=h-3     # the ground shadow stays with the body
        if floor_shadow or sz<3: body|=cm; continue
        fx.append(dict(x=int(x0),y=int(y0),width=int(wd),height=int(ht),glyph=n in GLYPH_POSES,
                       rows=encode(cm,idx,(y0,x0,y1,x1))))
    data[n]=dict(x=HALF-int(round(anchors[n])),y=Hc-h,width=w_,height=h,
                 rows=encode(body,idx,(0,0,h,w_)),fx=fx)

pal_hex={k:'#%02x%02x%02x'%tuple(int(round(x)) for x in c) for k,c in palette.items()}
print('palette keys',len(pal_hex),'canvas',CW,'x',Hc)

# ───────────────────────────── 6. write TypeScript ─────────────────────────────
import json
pal,EYE,(CW,CH),data=pal_hex,EYE_KEYS,(CW,Hc),data
def layer(d,ind):
    sp=' '*ind
    rows=',\n'.join(f"{sp}    '{r}'" for r in d['rows'])
    return f"{{ x: {d['x']}, y: {d['y']}, width: {d['width']}, height: {d['height']},"+(f" glyph: {str(d['glyph']).lower()}," if 'glyph' in d else '')+f"\n{sp}  rows: [\n{rows},\n{sp}  ] }}"
out=[]
out.append("""/**
 * Noir sprite data. GENERATED by `script/mascot-trace.py` from the reference
 * sheet `brand/mascot/noir-reference-sheet.jpg`. Do not edit by hand: change the
 * reference or the tracer and regenerate.
 *
 * Each pose is a pixel grid, run-length encoded one row per string: a palette
 * key followed by its run length ("a12b3" = twelve `a`, then three `b`).
 * `_` is transparent. Coordinates are in grid pixels; `x`/`y` place the sprite
 * on the shared canvas so every pose stands on the same ground line.
 *
 * `fx` holds the pose's effects (question marks, sparkles, motion lines...) as
 * separate small grids, so they can be switched off and so glyphs such as `?`,
 * `!` and `z` are never mirrored when the character is flipped.
 *
 * This file is data: it is the one place hex colors are allowed.
 */

export type SpriteLayer = {
  x: number;
  y: number;
  width: number;
  height: number;
  rows: string[];
};

export type SpriteEffect = SpriteLayer & {
  /** Letter-like effect: follows a flip in position, never in shape. */
  glyph: boolean;
};

export type Sprite = SpriteLayer & { fx: SpriteEffect[] };
""")
out.append("export const SPRITE_CANVAS = { width: %d, height: %d } as const;\n"%(CW,CH))
out.append("export const SPRITE_PALETTE: Record<string, string> = {\n"+''.join(f"  {k}: '{v}',\n" for k,v in pal.items())+"};\n")
out.append("/** Palette keys of the glowing eyes: Noir's identity color. Never recolor. */\nexport const EYE_KEYS: readonly string[] = %s;\n"%json.dumps(EYE).replace('"',"'"))
out.append("export const SPRITES: Record<string, Sprite> = {")
for n,d in data.items():
    fx=',\n'.join('      '+layer(f,6) for f in d['fx'])
    out.append(f"  '{n}': {{ x: {d['x']}, y: {d['y']}, width: {d['width']}, height: {d['height']},\n    rows: [\n"+',\n'.join(f"      '{r}'" for r in d['rows'])+f",\n    ],\n    fx: [{(chr(10)+fx+','+chr(10)+'    ') if d['fx'] else ''}],\n  }},")
out.append("};\n")
OUT_PATH=os.path.join(ROOT,'src','mascot','sprites.ts')
open(OUT_PATH,'w').write('\n'.join(out))
print('wrote',os.path.relpath(OUT_PATH,ROOT),os.path.getsize(OUT_PATH),'bytes')
