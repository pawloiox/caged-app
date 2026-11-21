"""Outline, pickguard and hardware for the S-style body in src/ui/Guitar.tsx, from a photo of a black guitar lying
horizontally (neck to the left) on a light grey (230, 230, 230) background: images/14.png in the session that made it,
936 x 626. Usage:
  node scripts/guitar-trace/pixels.mjs photo.png px.json
  python3 scripts/guitar-trace/body.py px.json > body.json
The body's silhouette is everything not reachable from the border through background-grey pixels; the pickguard is the
bright region round (450, 200), closed over the strings, with the maker's sticker painted out. Hardware positions are
read off gridded zooms of the photo. See HANDOFF section 15.
"""
import json, sys, collections, math
D = json.load(open(sys.argv[1])); W, H, PX = D['w'], D['h'], D['px']
def isbg(c): return all(abs(v - 230) <= 9 for v in c) and max(c) - min(c) <= 5
_bg = bytearray(W * H)
_q = collections.deque([(x, y) for x in range(W) for y in (0, H - 1)] + [(x, y) for y in range(H) for x in (0, W - 1)])
while _q:
    x, y = _q.popleft()
    i = y * W + x
    if _bg[i] or not isbg(PX[3 * i:3 * i + 3]): continue
    _bg[i] = 1
    for X, Y in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= X < W and 0 <= Y < H and not _bg[Y * W + X]: _q.append((X, Y))
bg = bytes(_bg)
def rgb(x, y): i = 3 * (y * W + x); return PX[i], PX[i + 1], PX[i + 2]
BAND = (263, 366)       # fretboard rows
def comp(mask, seed):
    out = bytearray(W * H); q = collections.deque([seed])
    while q:
        x, y = q.popleft()
        if not (0 <= x < W and 0 <= y < H) or out[y*W+x] or not mask[y*W+x]: continue
        out[y*W+x] = 1
        q.extend(((x+1,y),(x-1,y),(x,y+1),(x,y-1)))
    return out
def fill_holes(m):
    inv = bytearray(1 - v for v in m)
    outside = bytearray(W * H); q = collections.deque([(x, y) for x in range(W) for y in (0, H-1)] + [(x, y) for y in range(H) for x in (0, W-1)])
    while q:
        x, y = q.popleft()
        if not (0 <= x < W and 0 <= y < H) or outside[y*W+x] or not inv[y*W+x]: continue
        outside[y*W+x] = 1
        q.extend(((x+1,y),(x-1,y),(x,y+1),(x,y-1)))
    return bytearray(0 if outside[i] else 1 for i in range(W*H))
def trace(m):
    at = lambda x, y: 0 <= x < W and 0 <= y < H and m[y*W+x]
    start = next((x, y) for y in range(H) for x in range(W) if m[y*W+x])
    AL = {(1,0):(0,-1),(0,1):(0,0),(-1,0):(-1,0),(0,-1):(-1,-1)}
    AR = {(1,0):(0,0),(0,1):(-1,0),(-1,0):(-1,-1),(0,-1):(0,-1)}
    LEFT = {(1,0):(0,-1),(0,1):(1,0),(-1,0):(0,1),(0,-1):(-1,0)}
    RIGHT = {v:k for k,v in LEFT.items()}
    v, d, pts = start, (1,0), []
    while True:
        pts.append(v)
        al = AL[d]; ar = AR[d]
        if at(v[0]+al[0], v[1]+al[1]): d = LEFT[d]
        elif at(v[0]+ar[0], v[1]+ar[1]): pass
        else: d = RIGHT[d]
        v = (v[0]+d[0], v[1]+d[1])
        if v == start: break
        if len(pts) > 200000: raise SystemExit('runaway')
    return pts
def smooth(P, s, closed):
    n = len(P); r = int(3*s); w = [math.exp(-(k*k)/(2*s*s)) for k in range(-r, r+1)]
    out = []
    for i in range(n):
        sx = sy = sw = 0
        for k in range(-r, r+1):
            j = i + k
            if closed: j %= n
            elif j < 0 or j >= n: continue
            sx += P[j][0]*w[k+r]; sy += P[j][1]*w[k+r]; sw += w[k+r]
        out.append((sx/sw, sy/sw))
    return out
def dp(P, eps):
    if len(P) < 3: return P
    a, b = P[0], P[-1]; dx, dy = b[0]-a[0], b[1]-a[1]; L = math.hypot(dx, dy) or 1e-9
    i, dm = 0, -1
    for k in range(1, len(P)-1):
        dd = abs(dy*(P[k][0]-a[0]) - dx*(P[k][1]-a[1]))/L
        if dd > dm: i, dm = k, dd
    if dm <= eps: return [a, b]
    return dp(P[:i+1], eps)[:-1] + dp(P[i:], eps)
def maxgap(P, g):
    out = [P[0]]
    for p in P[1:]:
        q = out[-1]; n = int(math.hypot(p[0]-q[0], p[1]-q[1]) // g)
        for k in range(1, n+1): out.append((q[0]+(p[0]-q[0])*k/(n+1), q[1]+(p[1]-q[1])*k/(n+1)))
        out.append(p)
    return out

# ---- body
body = bytearray(0 if bg[i] else 1 for i in range(W*H))
for y in range(H):
    for x in range(W):
        if (x < 300 and BAND[0] <= y <= BAND[1]) or (x < 54 and 470 <= y <= 520) or (x > 912 and 296 <= y <= 340):
            body[y*W+x] = 0
body = fill_holes(comp(body, (600, 500)))
bp = trace(body)
# rotate so the chain starts just after the neck notch (upper joint), drop the notch
inn = lambda p: p[0] <= 300.5 and BAND[0]-0.5 <= p[1] <= BAND[1]+1.5
idx = [i for i, p in enumerate(bp) if inn(p)]
n = len(bp)
# find the notch as the longest run of consecutive 'in' points (cyclic)
flags = [inn(p) for p in bp]
k0 = flags.index(False)
rot = bp[k0:] + bp[:k0]; fl = flags[k0:] + flags[:k0]
best, s = (0, 0, 0), None
for i in range(len(rot)+1):
    f = i < len(rot) and fl[i]
    if f and s is None: s = i
    if not f and s is not None:
        if i - s > best[0]: best = (i - s, s, i)
        s = None
_, a, b = best
chain = rot[b:] + rot[:a]
# Bridge the strap buttons' cut-outs: replace the outline across each with a cubic Hermite curve between the points just
# outside it, following the edge's direction on either side, so no dent or step is left.
def bridge(P, sel):
    idx = [i for i, p in enumerate(P) if sel(p)]
    if not idx: return P
    i0, i1 = max(idx[0] - 6, 3), min(idx[-1] + 6, len(P) - 4)
    a, b = P[i0], P[i1]
    ta = ((a[0] - P[i0 - 3][0]) / 3, (a[1] - P[i0 - 3][1]) / 3)
    tb = ((P[i1 + 3][0] - b[0]) / 3, (P[i1 + 3][1] - b[1]) / 3)
    n = i1 - i0
    out = []
    for k in range(1, n):
        t = k / n; h00, h10, h01, h11 = 2*t**3 - 3*t**2 + 1, t**3 - 2*t**2 + t, -2*t**3 + 3*t**2, t**3 - t**2
        out.append(tuple(h00*a[j] + h10*n*ta[j] + h01*b[j] + h11*n*tb[j] for j in (0, 1)))
    return P[:i0 + 1] + out + P[i1:]
chain = bridge(chain, lambda p: p[0] > 900 and 290 <= p[1] <= 346)
chain = bridge(chain, lambda p: p[0] < 70 and 464 <= p[1] <= 526)
chain = smooth(chain, 2.2, False)
# ---- guard
bright = bytearray(1 if (not bg[i] and min(PX[3*i:3*i+3]) >= 196) else 0 for i in range(W*H))
for y in range(130, 240):
    for x in range(280, 440): bright[y*W+x] = 1          # the sticker: ignored, the guard runs under it
for y in range(BAND[0] + 2, BAND[1] - 1):
    for x in range(200, 300): bright[y*W+x] = 1          # under the fretboard, kept inside it
def morph(m, r, op):
    t = bytearray(W*H)
    for y in range(H):
        row = m[y*W:(y+1)*W]
        for x in range(W):
            seg = row[max(0,x-r):x+r+1]
            t[y*W+x] = op(seg)
    o = bytearray(W*H)
    for x in range(W):
        col = t[x::W]
        for y in range(H):
            o[y*W+x] = op(col[max(0,y-r):y+r+1])
    return o
# Close the thin dark lines the strings draw across the guard and the notches the screws near its edge leave.
bright = morph(morph(bright, 6, max), 6, min)
# Keep the guard 6 px inside the traced body (the closing can bridge the black strip at the treble cutaway to the light
# rolled edge beyond it), except under the fretboard, where it runs on under the neck.
inner = bytearray(body)
for y in range(BAND[0], BAND[1] + 1):
    for x in range(160, 300): inner[y*W+x] = 1           # the neck counts as body here
inner = morph(inner, 6, min)
bright = bytearray(a & b for a, b in zip(bright, inner))
# An opening then drops the thin strands the bright bridge saddles leave hanging off the guard's edge.
guard = morph(morph(fill_holes(comp(bright, (450, 200))), 3, min), 3, max)
guard = fill_holes(comp(guard, (450, 200)))
gp = smooth(trace(guard), 6.0, True)

# ---- mapping onto the guitar: the fretboard (photo rows 265-363 at the body) becomes our 64 px neck; away from it the
# body keeps the photo's shape at KX across and KY up and down, eased in with a tanh so there is no kink at the neck.
CY, HALF = 314.5, 49.5
KX, KY = 0.47, 0.441
C = (32 - KY * HALF) / math.tanh(1)
X_TIP = min(p[0] for p in chain)
def fy(py):
    d = py - CY
    return KY * d + C * math.tanh(d / HALF)
ys = [fy(p[1]) for p in chain]
BH = 2 * math.ceil(max(-min(ys), max(ys)) + 3)
MID = BH / 2
def X(px): return 3 + (px - X_TIP) * KX
def Y(py): return MID + fy(py)
def P(p): return (round(X(p[0]), 1), round(Y(p[1]), 1))
BW = math.ceil(X(max(p[0] for p in chain)) + 3)

def cr2bez(Pts, closed=False):
    n = len(Pts)
    d = f"M{Pts[0][0]:.1f} {Pts[0][1]:.1f}"
    L = lambda a, b: max(1e-6, math.hypot(a[0] - b[0], a[1] - b[1]))
    for i in (range(n) if closed else range(n - 1)):
        p0 = Pts[(i - 1) % n] if (closed or i > 0) else Pts[i]
        p1, p2 = Pts[i], Pts[(i + 1) % n]
        p3 = Pts[(i + 2) % n] if (closed or i + 2 < n) else p2
        d12 = L(p1, p2)
        k1 = d12 / (3 * (L(p0, p1) + d12)) if p0 != p1 else 1 / 3
        k2 = d12 / (3 * (d12 + L(p2, p3))) if p2 != p3 else 1 / 3
        t1 = (p2[0] - p0[0], p2[1] - p0[1]) if p0 != p1 else (p2[0] - p1[0], p2[1] - p1[1])
        t2 = (p3[0] - p1[0], p3[1] - p1[1]) if p2 != p3 else (p2[0] - p1[0], p2[1] - p1[1])
        c1 = (p1[0] + t1[0] * k1, p1[1] + t1[1] * k1)
        c2 = (p2[0] - t2[0] * k2, p2[1] - t2[1] * k2)
        d += f" C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}"
    return d + (' Z' if closed else '')

def simplify(Pts, closed, eps=0.45, gap=18):
    if closed:
        k = len(Pts) // 2
        a = dp(Pts[:k + 1], eps); b = dp(Pts[k:] + [Pts[0]], eps)
        return maxgap(a[:-1] + b[:-1], gap)
    return maxgap(dp(Pts, eps), 16)

cp = simplify(chain, False)
tre_tip = min(range(len(cp)), key=lambda i: cp[i][0] if cp[i][1] < CY else 1e9)
bass_tip = min(range(len(cp)), key=lambda i: cp[i][0] if cp[i][1] > CY else 1e9)
FB_START = 160          # photo x where our fretboard drawing starts: left of both cutaway joints
NT, NB = MID - 32, MID + 32
mapped = [P(p) for p in cp]
body = cr2bez(mapped) + f" L{X(FB_START) + 2:.1f} {NB:.1f} L{X(FB_START) + 2:.1f} {NT:.1f} Z"
gp = smooth(gp, 1.5, True)
# The guard's bevel is drawn as plain fills of the outline inset 0.8 and 2 px (the black middle ply, then the bevel,
# then the face), not as strokes clipped to the outline: Chrome draws clipped or masked content without anti-aliasing.
def inset(Q, d):
    n = len(Q); area = sum(Q[i][0]*Q[(i+1)%n][1] - Q[(i+1)%n][0]*Q[i][1] for i in range(n))
    sgn = 1 if area > 0 else -1
    out = []
    for i in range(n):
        a, b = Q[i-1], Q[(i+1)%n]; tx, ty = b[0]-a[0], b[1]-a[1]; L = math.hypot(tx, ty) or 1e-9
        out.append((Q[i][0] - sgn*ty/L*d, Q[i][1] + sgn*tx/L*d))
    return out
gq = [(X(x), Y(y)) for x, y in gp]
def guard_path(d):
    Q = simplify(inset(gq, d) if d else gq, True, 0.25, 8)
    return cr2bez([(round(x, 1), round(y, 1)) for x, y in Q], True)
gp = simplify(gp, True, 0.7)
HW = {
    'strap': [(48, 497), (914, 318)],
    # neck, middle, bridge pickups by their mounting screws (top, bottom)
    'pickups': [[(333.5, 244), (333.5, 388.5)], [(446, 245), (446, 389)], [(563, 246), (542, 389)]],
    'pickup_w': 32.5,
    'cover': [250, 383],
    'screws': [(207, 98), (317, 109), (494, 122.5), (589, 79), (698.5, 60), (623.5, 236.5), (631, 412), (522.5, 442),
               (425.6, 410), (237.5, 400.6), (295.6, 250.6)],
    'knobs': [(569, 214), (610, 142.5), (668.5, 76)],
    'knob_r': 22.5,
    'switch': [(510, 152.5), (537.5, 127.5)],
    'switch_screws': [(498.5, 161.5), (556.5, 110)],
    'jack': [(690, 205), (799, 77.5)],
    'jack_screws': [(705, 195), (790, 86)],
    'jack_socket': (735, 157.5),
    'bridge': {'x': [608, 687], 'top': 249, 'tab': [640, 230], 'bottom': 390, 'saddles': [627.5, 665],
               'studs': [(614, 266), (615, 372.5)], 'arm_hole': (662.5, 251)},
    'frets': [172.5, 198.5, 221.5, 244, 265, 285],
    'dots': [210, 255],
    'fb_end': 295,
    'xp': (700, 470),
}
def m(v):
    if isinstance(v, (int, float)): return v
    if isinstance(v, tuple) and len(v) == 2: return P(v)
    if isinstance(v, list): return [m(x) for x in v]
    if isinstance(v, dict): return {k: m(x) for k, x in v.items()}
    return v
hw = m({k: v for k, v in HW.items() if k not in ('bridge', 'frets', 'dots', 'fb_end', 'pickup_w', 'knob_r', 'cover')})
B = HW['bridge']
hw['bridge'] = {'x0': round(X(B['x'][0]), 1), 'x1': round(X(B['x'][1]), 1), 'top': round(Y(B['top']), 1),
                'tabx': round(X(B['tab'][0]), 1), 'taby': round(Y(B['tab'][1]), 1), 'bottom': round(Y(B['bottom']), 1),
                'saddles': [round(X(v), 1) for v in B['saddles']], 'studs': m(B['studs']), 'arm_hole': P(B['arm_hole'])}
hw['frets'] = [round(X(v), 1) for v in HW['frets']]
hw['dots'] = [round(X(v), 1) for v in HW['dots']]
hw['fb'] = [round(X(FB_START), 1), round(X(HW['fb_end']), 1)]
hw['pickup_w'] = round(HW['pickup_w'] * KX, 1)
hw['cover'] = [round(Y(v), 1) for v in HW['cover']]
hw['knob_r'] = round(HW['knob_r'] * (KX + KY) / 2, 1)
print(json.dumps({'W': BW, 'H': BH, 'mid': MID, 'body': body, 'cut_t': cr2bez(mapped[:tre_tip + 1]),
                  'cut_b': cr2bez(mapped[bass_tip:]), 'guard': guard_path(0), 'guard_ply': guard_path(0.8),
                  'guard_face': guard_path(2.0),
                  'joints': [P(chain[0]), P(chain[-1])], 'tips': [mapped[tre_tip], mapped[bass_tip]], 'hw': hw,
                  'npts': [len(cp), len(gp)]}, indent=1))
