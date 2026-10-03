"""Robust background removal via corner flood-fill + unmultiply.

For each pixel:
  1. Compute distance to sampled BG_COLOR (from 4 corner 5x5 patches)
  2. Flood-fill: keep only connected components of 'likely bg' (dist<50) touching the border
  3. In flood-filled bg region:
       - dist < 20  -> alpha = 0 (hard transparent)
       - dist 20-80 -> gradient alpha for smooth anti-aliased edges
  4. Outside the flood-fill region (foreground):
       - alpha = max(R, G, B)   (brightness-based)
  5. Unmultiply RGB everywhere so the color on top of transparent background
     is the "pre-multiplied" original foreground color.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

def process(path: str) -> None:
    img = Image.open(path).convert('RGBA')
    arr = np.array(img)
    h, w = arr.shape[:2]
    rgb_f = arr[..., :3].astype(np.float32)

    # Sample BG from the 4 corners (5x5 patches)
    patches = np.vstack([
        rgb_f[:5, :5].reshape(-1, 3),
        rgb_f[:5, -5:].reshape(-1, 3),
        rgb_f[-5:, :5].reshape(-1, 3),
        rgb_f[-5:, -5:].reshape(-1, 3),
    ])
    BG = patches.mean(axis=0)
    print(f"\n[{path}]")
    print(f"  BG_COLOR (RGB): ({BG[0]:.1f}, {BG[1]:.1f}, {BG[2]:.1f})")

    # Distance of every pixel from BG
    dist = np.sqrt(((rgb_f - BG) ** 2).sum(axis=2))

    # Loose bg-candidate mask + keep only connected components touching the border
    candidate = dist < 50
    labeled, _ = ndimage.label(candidate)
    border = np.concatenate([labeled[0], labeled[-1], labeled[:, 0], labeled[:, -1]])
    border_labels = np.unique(border)
    border_labels = border_labels[border_labels != 0]
    bg_mask = np.isin(labeled, border_labels)

    # New alpha
    brightness = rgb_f.max(axis=2)              # for fg
    new_alpha = np.full((h, w), 0.0, dtype=np.float32)

    bg_hard = bg_mask & (dist < 20)
    bg_ramp = bg_mask & (dist >= 20) & (dist < 80)
    fg_full = ~bg_mask

    new_alpha[bg_hard] = 0.0
    # Smooth ramp: dist 20 -> 0 alpha, dist 80 -> full brightness alpha
    ramp = (dist[bg_ramp] - 20.0) / 60.0
    new_alpha[bg_ramp] = ramp * brightness[bg_ramp]
    new_alpha[fg_full] = brightness[fg_full]

    # Unmultiply RGB
    safe = np.where(new_alpha > 0, new_alpha, 1.0)
    scale = 255.0 / safe
    rgb_new = np.clip(rgb_f * scale[..., None], 0, 255)
    rgb_new[new_alpha <= 0] = 0  # zero out RGB where fully transparent

    out = np.zeros_like(arr)
    out[..., :3] = rgb_new
    out[..., 3] = new_alpha
    Image.fromarray(out.astype(np.uint8), mode='RGBA').save(path, 'PNG', optimize=True)

    # Report alpha histogram
    bins = [0, 1, 11, 51, 101, 201, 255, 256]
    labels = ['=0', '1-10', '11-50', '51-100', '101-200', '201-254', '=255']
    hist, _ = np.histogram(new_alpha.flatten(), bins=bins)
    total = h * w
    print(f"  Pixels: {total}")
    for lab, cnt in zip(labels, hist.tolist()):
        print(f"    alpha {lab:>8}: {cnt:>10}  ({100*cnt/total:.2f}%)")

if __name__ == '__main__':
    for p in sys.argv[1:]:
        process(p)
