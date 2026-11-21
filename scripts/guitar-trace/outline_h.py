"""Outline, pickguard and hardware positions for the S-style body in src/ui/Guitar.tsx, from a photo of a guitar
lying horizontally (neck to the left) on white. Usage:
  node scripts/guitar-trace/pixels.mjs photo.png px.json
  python3 scripts/guitar-trace/outline_h.py px.json > outline.json
The photo constants (neck band, horn tip and butt columns) and the pickguard/hardware points, read off zoomed crops
of the photo, are for the 239 × 161 reference (images/10.png in the session that made it). See HANDOFF section 15.
"""
import json, sys, collections

D = json.load(open(sys.argv[1]))
W, H, PX = D['w'], D['h'], D['px']
NECK_CY, NECK_HALF = 81.5, 12.5      # photo neck centre line and half-width
X_TIP, X_BUTT = 23, 235              # bass horn tip and butt columns
OX0, OX1 = 2, 349                    # our x for those
SX = (OX1 - OX0) / (X_BUTT - X_TIP)
REACH = 73.5                         # photo half-height of the body; maps to 110 (y 2 to 222)
K = (110 - 32) / (REACH - NECK_HALF)

def ox(px): return OX0 + (px - X_TIP) * SX
def oy(py):
    d = py - NECK_CY
    a = abs(d)
    f = a * 32 / NECK_HALF if a <= NECK_HALF else 32 + (a - NECK_HALF) * K
    return 112 + (f if d > 0 else -f)
def P(p): return (round(ox(p[0]), 1), round(oy(p[1]), 1))

def rgb(x, y): i = 3 * (y * W + x); return PX[i], PX[i + 1], PX[i + 2]
# Background: near-white pixels reachable from the border.
bg = [[False] * W for _ in range(H)]
q = collections.deque([(x, y) for x in range(W) for y in (0, H - 1)] + [(x, y) for y in range(H) for x in (0, W - 1)])
while q:
    x, y = q.popleft()
    if bg[y][x] or min(rgb(x, y)) <= 236: continue
    bg[y][x] = True
    for X, Y in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= X < W and 0 <= Y < H and not bg[Y][X]: q.append((X, Y))

def runs(x):
    out, s = [], -1
    for y in range(H + 1):
        m = y < H and not bg[y][x]
        if m and s < 0: s = y
        if not m and s >= 0:
            if y - s >= 2: out.append((s, y - 1))
            s = -1
    return out

top_out, bot_out, tre_in, bass_in = {}, {}, {}, {}
for x in range(X_TIP, X_BUTT + 1):
    rs = runs(x)
    if not rs: continue
    neck = [r for r in rs if r[0] <= NECK_CY <= r[1]]
    above = [r for r in rs if r[1] < NECK_CY - NECK_HALF]
    below = [r for r in rs if r[0] > NECK_CY + NECK_HALF]
    if above: top_out[x] = above[0][0] - 0.5; tre_in[x] = above[-1][1] + 0.5
    elif neck and neck[0][0] < NECK_CY - NECK_HALF - 2: top_out[x] = neck[0][0] - 0.5
    if below: bot_out[x] = below[-1][1] + 0.5; bass_in[x] = below[0][0] - 0.5
    elif neck and neck[0][1] > NECK_CY + NECK_HALF + 2: bot_out[x] = neck[0][1] + 0.5

def smooth(d, w=1):
    return {k: sum(d[j] for j in range(k - w, k + w + 1) if j in d) / len([j for j in range(k - w, k + w + 1) if j in d]) for k in d}
top_out, bot_out, tre_in, bass_in = map(smooth, (top_out, bot_out, tre_in, bass_in))
tre_in = smooth(tre_in)
# The strap buttons poke out at the bass horn tip and the butt: keep them out of the outline.
bass_tip = min(k for k in bass_in if k >= 26)
tre_tip = min(tre_in)
tre_join, bass_join = max(tre_in) + 1, max(bass_in) + 1

step = 2
pts = [(ox(tre_join), 80.0)]
for x in range(max(tre_in), tre_tip - 1, -step): pts.append((ox(x), oy(tre_in[x])))
pts.append((ox(tre_tip - 1.2), oy((tre_in[tre_tip] + top_out[tre_tip]) / 2)))
for x in range(tre_tip, X_BUTT - 3, step):
    if x in top_out: pts.append((ox(x), oy(top_out[x])))
pts.append((OX1, 112.0))
for x in range(X_BUTT - 4, bass_tip - 1, -step):
    if x in bot_out: pts.append((ox(x), oy(bot_out[x])))
pts.append((ox(bass_tip - 1.2), oy((bass_in[bass_tip] + bot_out[bass_tip]) / 2)))
for x in range(bass_tip, max(bass_in) + 1, step):
    if x in bass_in: pts.append((ox(x), oy(bass_in[x])))
pts.append((ox(bass_join), 144.0))

def cr2bez(P, closed=False):
    n = len(P)
    d = f"M{P[0][0]:.1f} {P[0][1]:.1f}"
    rng = range(n) if closed else range(n - 1)
    for i in rng:
        p0 = P[(i - 1) % n] if (closed or i > 0) else P[i]
        p1, p2 = P[i], P[(i + 1) % n]
        p3 = P[(i + 2) % n] if (closed or i + 2 < n) else p2
        # Tangents scaled by chord length, so a long segment next to short ones (the stretched neck band) doesn't
        # overshoot into a loop.
        L = lambda a, b: max(1e-6, ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5)
        d12 = L(p1, p2)
        k1 = d12 / (3 * (L(p0, p1) + d12)) if p0 != p1 else 1 / 3
        k2 = d12 / (3 * (d12 + L(p2, p3))) if p2 != p3 else 1 / 3
        t1 = (p2[0] - p0[0], p2[1] - p0[1]) if p0 != p1 else (p2[0] - p1[0], p2[1] - p1[1])
        t2 = (p3[0] - p1[0], p3[1] - p1[1]) if p2 != p3 else (p2[0] - p1[0], p2[1] - p1[1])
        c1 = (p1[0] + t1[0] * k1, p1[1] + t1[1] * k1)
        c2 = (p2[0] - t2[0] * k2, p2[1] - t2[1] * k2)
        d += f" C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}"
    return d + (' Z' if closed else '')

body = cr2bez(pts) + f" L{min(70, ox(bass_join)):.0f} 144 L{min(70, ox(tre_join)):.0f} 80 Z"
n_t = 1 + len(range(max(tre_in), tre_tip - 1, -step))
n_b = len([x for x in range(bass_tip, max(bass_in) + 1, step) if x in bass_in]) + 1

# Pickguard, clockwise from the treble lobe's tip (photo px, read off 7-9x crops). Where the neck covers it, the
# edge runs under the fretboard.
GUARD = [(63, 26.5), (65, 24.8), (68, 23.8), (72, 23.2), (78, 23), (84, 23.6), (88, 24.6), (92, 26), (96, 27.2),
         (100, 28.6), (104, 29.8), (108, 31.6), (112, 32.8), (116, 33.8), (120, 34.6), (124, 35), (127, 34.6),
         (130, 33.8), (134, 32.8), (138, 31.2), (142, 29.4), (146, 27.4), (150, 25.6), (154, 23.6), (158, 21.6),
         (162, 20), (166, 18.6), (170, 17), (175, 15.6), (180, 14.6), (184, 14), (187, 14.2), (189.5, 15.4),
         (191.5, 17.5), (192.4, 20), (191.5, 22.5), (190, 24.5), (188.5, 26.5), (186, 29), (183, 32), (180.5, 35.5),
         (178, 39), (176, 42.5), (174.5, 46), (173.5, 50), (172.6, 54.5), (171, 58.5), (169.2, 62), (168.6, 66),
         (168.6, 97), (171, 100.5), (171.8, 104), (170.8, 108), (168.5, 110.6), (165.5, 112.6), (162, 114.2),
         (158, 115.2), (153, 115.6), (148, 115.4), (143, 114.8), (139, 113.8), (135, 112.4), (131, 110.8),
         (127, 109.2), (123, 107.8), (119, 106.4), (115, 105.2), (110, 104.2), (104, 103.7), (98, 103.6),
         (92, 103.9), (87, 104.5), (82, 105.3), (78, 106.1), (75, 106.2), (73.3, 104.6), (73.2, 101.5), (74.4, 98.4),
         (76.5, 95.8), (80, 94.6), (86, 94), (86, 69), (89, 66), (90.4, 61), (90.4, 55), (89.6, 48.5), (88, 43.5),
         (85.8, 39.6), (83, 36.6), (80, 34.5), (76, 32.7), (72, 31.1), (68, 29.9), (65.2, 29), (63.6, 28)]
HW = {
    'pickups': [[(100.5, 64.5), (100.5, 99.5)], [(128.5, 64.5), (128.5, 99.5)], [(157, 64.5), (151, 99.5)]],
    'knobs': [(157, 55), (167.5, 38), (182.5, 21.5)],
    'switch': [(145.5, 40), (152.5, 32.5)],
    'arm': [(174, 58), (152, 42), (138.5, 42.5)],
    'jack': [(187, 52), (210, 22)],
    'bridge': [(167.3, 59), (186.5, 99)],
    'screws': [(69, 27), (91.5, 65.5), (77, 103), (122.5, 105), (129, 37.5), (154.5, 31), (170, 62.5), (170, 105),
               (188, 19)],
    'fretboard_end': 90.5,
    'strap': [(23, 128), (236, 82)],
}
out = {'body': body, 'cut_t': cr2bez(pts[:n_t + 1]), 'cut_b': cr2bez(pts[-n_b - 1:]),
       'guard': cr2bez([P(p) for p in GUARD], closed=True),
       'tre_join': ox(tre_join), 'bass_join': ox(bass_join), 'tre_tip': ox(tre_tip), 'bass_tip': ox(bass_tip),
       'miny': min(p[1] for p in pts), 'maxy': max(p[1] for p in pts)}
for k, v in HW.items():
    if k == 'fretboard_end': out[k] = round(ox(v), 1)
    elif k == 'pickups': out[k] = [[P(a), P(b)] for a, b in v]
    else: out[k] = [P(p) for p in v]
print(json.dumps(out, indent=1))
