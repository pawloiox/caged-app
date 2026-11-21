"""Headstock outline from the 3 + 3 reference photo (330x264, nut on the right at x 300, neck edges y 91 and 171).

Points were read off brightened 4-5x crops (the face is black on a black background). The photo maps onto the
headstock SVG at 0.8 px per photo pixel both ways, so its 80 px neck becomes our 64 px neck; the tip lands at
x 0 and the nut at x 220. Prints the outline path and the post and key positions.
"""
import json

def X(px): return round((px - 22) * 0.8, 1)
def Y(py): return round(112 + (py - 131) * 0.8, 1)

def cr2bez(P):
    L = lambda a, b: max(1e-6, ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5)
    d = ''
    n = len(P)
    for i in range(n - 1):
        p0, p1, p2 = P[max(i - 1, 0)], P[i], P[i + 1]
        p3 = P[min(i + 2, n - 1)]
        d12 = L(p1, p2)
        k1 = d12 / (3 * (L(p0, p1) + d12)) if p0 != p1 else 1 / 3
        k2 = d12 / (3 * (d12 + L(p2, p3))) if p2 != p3 else 1 / 3
        t1 = (p2[0] - p0[0], p2[1] - p0[1])
        t2 = (p3[0] - p1[0], p3[1] - p1[1])
        c1 = (p1[0] + t1[0] * k1, p1[1] + t1[1] * k1)
        c2 = (p2[0] - t2[0] * k2, p2[1] - t2[1] * k2)
        d += f' C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}'
    return d

# Clockwise from the top of the nut; each run ends on a corner (the two ears and the two tip corners).
RUNS = [
    [(300, 91), (295, 91.3), (285, 88.5), (275, 83), (264, 74), (256, 63), (249.5, 52), (245, 46)],
    [(245, 46), (240, 47.2), (225, 51.5), (200, 61.5), (180, 67), (150, 73.5), (120, 77.5), (90, 80), (60, 81.3),
     (35, 81.8), (25, 82.3), (22.4, 83.5)],
    [(22.4, 83.5), (27, 90), (34, 100), (41.6, 110), (47, 120), (50, 130), (51.6, 140), (52, 150), (51.4, 160),
     (49.4, 170), (47.5, 177), (46.6, 181.5)],
    [(46.6, 181.5), (50, 182), (70, 182.6), (90, 183.6), (120, 186), (150, 189.5), (180, 194.5), (200, 200),
     (220, 206.5), (235, 212), (245, 216.5)],
    [(245, 216.5), (249, 208), (254, 195), (262.5, 181), (275, 172.5), (287.5, 169.5), (300, 171)],
]
d = f'M{X(300)} {Y(91)}'
for run in RUNS:
    d += cr2bez([(X(x), Y(y)) for x, y in run])
d += ' L228 144 L228 80 Z'
POSTS = [(217.3, 88.3), (153.3, 100), (90, 111.7), (89.3, 152.3), (153.3, 163.3), (216.7, 174)]
# Key bounding boxes (x0, y0, x1, y1): top row, then bottom row, each from the tip toward the nut.
KEYS = [(72.7, 46.7, 111.7, 73.3), (135, 36.7, 175, 64), (198, 25, 237, 53),
        (71, 183, 111, 215), (134, 190, 174, 224), (197, 205, 237, 236)]
print(json.dumps({
    'outline': d,
    'posts': [(X(x), Y(y)) for x, y in POSTS],
    'keys': [(X(a), Y(b), X(c), Y(e)) for a, b, c, e in KEYS],
    'truss': (X(217.3), Y(132.7)),
}, indent=1))
