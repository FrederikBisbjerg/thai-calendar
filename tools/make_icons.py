"""Draws the app icon (full moon behind a chedi) with no dependencies. Run: python3 tools/make_icons.py"""
import os, struct, zlib

def inside(x, y):
    """Chedi silhouette in unit coordinates."""
    if 0.24 <= x <= 0.76 and 0.80 <= y <= 0.86: return True
    if 0.29 <= x <= 0.71 and 0.74 <= y <= 0.80: return True
    if 0.34 <= x <= 0.66 and 0.68 <= y <= 0.74: return True
    if y <= 0.68 and ((x - 0.5) / 0.135) ** 2 + ((y - 0.68) / 0.21) ** 2 <= 1: return True   # bell
    if 0.465 <= x <= 0.535 and 0.42 <= y <= 0.50: return True
    if 0.14 <= y <= 0.47 and abs(x - 0.5) <= 0.05 * (y - 0.14) / 0.33: return True              # spire
    return False

def pixel(x, y, scale):
    # scale < 1 shrinks the artwork towards the centre (safe zone for maskable icons)
    u, v = (x - 0.5) / scale + 0.5, (y - 0.5) / scale + 0.5
    t = y
    bg = (int(150 - 60 * t), int(32 - 16 * t), int(46 - 16 * t))
    if inside(u, v): return (52, 8, 18)
    d = ((u - 0.5) ** 2 + (v - 0.43) ** 2) ** 0.5
    if d <= 0.30: return (246, 196, 83)
    if d <= 0.335: return tuple(int(b + (g - b) * 0.22) for b, g in zip(bg, (246, 196, 83)))   # halo
    return bg

def png(path, size, scale=1.0, ss=3):
    rows = []
    for j in range(size):
        row = bytearray([0])
        for i in range(size):
            r = g = b = 0
            for a in range(ss):
                for c in range(ss):
                    p = pixel((i + (a + .5) / ss) / size, (j + (c + .5) / ss) / size, scale)
                    r += p[0]; g += p[1]; b += p[2]
            n = ss * ss
            row += bytes((r // n, g // n, b // n))
        rows.append(bytes(row))
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)) +
                chunk(b'IDAT', zlib.compress(b''.join(rows), 9)) + chunk(b'IEND', b''))

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'icons')
os.makedirs(out, exist_ok=True)
png(os.path.join(out, 'icon-512.png'), 512)
png(os.path.join(out, 'icon-192.png'), 192)
png(os.path.join(out, 'apple-touch-icon.png'), 180, 0.9)
png(os.path.join(out, 'icon-maskable-512.png'), 512, 0.72)
print('icons written')
