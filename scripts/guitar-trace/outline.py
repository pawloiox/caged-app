import json, sys
"""Turn rows.json (from rows.mjs) into BODY_PATH, CUT_TREBLE and CUT_BASS for src/ui/Guitar.tsx.
Usage: python3 scripts/guitar-trace/outline.py rows.json > outline.json
The photo constants below (neck edges, centre line, horn tip and butt rows) are for the 600×600 reference photo.
"""
R = json.load(open(sys.argv[1]))['rows']
NECK_L, NECK_R = 283, 315          # photo neck edges near the body
CX = 299                            # photo centre line
TIP_Y, BUTT_Y = 316, 592            # bass horn tip, butt (photo rows)
X0, X1 = 2, 349                     # our x for those
SX = (X1 - X0) / (BUTT_Y - TIP_Y)

def ox(py): return X0 + (py - TIP_Y) * SX
def oy(px):
    dx = px - CX
    a = abs(dx)
    f = 2 * a if a <= 16 else 32 + (a - 16) * (110 - 32) / (97 - 16)
    return 112 - (f if dx > 0 else -f)

def segs(py): return [s for s in R[py] if s[1] >= 195 and s[0] <= 405]

bass_in, bass_out, tre_in, tre_out = {}, {}, {}, {}
for py in range(TIP_Y, BUTT_Y + 1):
    ss = segs(py)
    if not ss: continue
    left = ss[0]; right = ss[-1]
    bass_out[py] = left[0]
    tre_out[py] = right[1]
    # Horns are separate from the neck above the cutaway bottoms.
    # Horns are only above the cutaway bottoms (pickups and the bridge split rows further down).
    if py < 380 and len(ss) >= 2 and left[1] < NECK_L - 3:
        bass_in[py] = left[1]
    if py < 380 and len(ss) >= 2 and right[0] > NECK_R + 3:
        tre_in[py] = right[0]

# Outer edges start where each horn starts (above that, the rightmost/leftmost run is the neck).
tre_out = {k: v for k, v in tre_out.items() if k >= min(tre_in)}
bass_out = {k: v for k, v in bass_out.items() if k >= min(bass_in)}

def smooth(d, w=2):
    ks = sorted(d); out = {}
    for k in ks:
        vals = [d[j] for j in range(k - w, k + w + 1) if j in d]
        out[k] = sum(vals) / len(vals)
    return out
bass_in, bass_out, tre_in, tre_out = map(smooth, (bass_in, bass_out, tre_in, tre_out))

tre_tip = min(tre_out[k] and k for k in tre_in) if tre_in else None
tre_tip = min(tre_in)            # first row of the treble horn
bass_tip = min(bass_in)
tre_join = max(tre_in) + 2       # cutaway bottom rows
bass_join = max(bass_in) + 2
step = 4
pts = []
# 1. Treble joint on the neck's top edge, up the treble cutaway to the horn tip.
pts.append((ox(tre_join), 80.0))
for py in range(max(tre_in), tre_tip - 1, -step):
    if py in tre_in: pts.append((ox(py), oy(tre_in[py])))
# 2. Round the treble tip and down the treble outer edge to the butt.
for py in range(tre_tip, BUTT_Y - 6, step):
    if py in tre_out: pts.append((ox(py), oy(tre_out[py])))
# 3. Butt.
pts.append((X1, 112.0))
# 4. Up the bass outer edge to the bass horn tip.
for py in range(BUTT_Y - 8, bass_tip - 1, -step):
    if py in bass_out: pts.append((ox(py), oy(bass_out[py])))
# 5. Down the bass cutaway to the bass joint on the neck's bottom edge.
for py in range(bass_tip, max(bass_in) + 1, step):
    if py in bass_in: pts.append((ox(py), oy(bass_in[py])))
pts.append((ox(bass_join), 144.0))

def cr2bez(P):
    """Closed-ish Catmull-Rom through points -> cubic Bezier path (open, we close via the pocket)."""
    d = f"M{P[0][0]:.1f} {P[0][1]:.1f}"
    for i in range(len(P) - 1):
        p0 = P[i - 1] if i > 0 else P[i]
        p1, p2 = P[i], P[i + 1]
        p3 = P[i + 2] if i + 2 < len(P) else p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f" C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}"
    return d

body = cr2bez(pts) + f" L{min(70, ox(bass_join)):.0f} 144 L{min(70, ox(tre_join)):.0f} 80 Z"
# Cutaway edges (joint to tip) for shading.
n_t = 1 + len([py for py in range(max(tre_in), tre_tip - 1, -step) if py in tre_in])
cut_t = cr2bez(pts[:n_t])
n_b = len([py for py in range(bass_tip, max(bass_in) + 1, step) if py in bass_in]) + 1
cut_b = cr2bez(pts[-n_b:])
print(json.dumps({
  'tre_tip': [tre_tip, ox(tre_tip)], 'bass_tip': [bass_tip, ox(bass_tip)], 'tre_join': [tre_join, ox(tre_join)],
  'bass_join': [bass_join, ox(bass_join)], 'n': len(pts),
  'miny': min(p[1] for p in pts), 'maxy': max(p[1] for p in pts),
  'body': body, 'cut_t': cut_t, 'cut_b': cut_b}))
