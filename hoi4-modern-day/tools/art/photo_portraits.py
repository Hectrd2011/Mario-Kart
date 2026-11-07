"""Turn a freely licensed photo into a HOI4-style leader portrait.

1. find the face and crop head-and-shoulders at a fixed scale, so every
   leader sits in the frame the same way vanilla portraits do;
2. separate the person from the photo's background (GrabCut seeded
   from the face), and set them against a dark, flag-tinted backdrop;
3. a light oil-paint pass, muted warm grading and canvas grain give the
   painted look of the base game.
"""
import os

import cv2
import numpy as np
from PIL import Image, ImageFilter

from .portraits import background, W, H, S

_CASCADES = None


def _cascades():
    global _CASCADES
    if _CASCADES is None:
        base = cv2.data.haarcascades
        _CASCADES = [cv2.CascadeClassifier(os.path.join(base, n)) for n in
                     ("haarcascade_frontalface_alt2.xml", "haarcascade_frontalface_default.xml", "haarcascade_profileface.xml")]
    return _CASCADES


def find_face(bgr):
    gray = cv2.equalizeHist(cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY))
    h, w = gray.shape
    for cc in _cascades():
        faces = cc.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=6, minSize=(max(24, w // 12), max(24, w // 12)))
        if len(faces):
            # the biggest face in the upper two-thirds is the subject
            faces = sorted(faces, key=lambda f: (f[1] < h * 0.66, f[2] * f[3]), reverse=True)
            return tuple(int(v) for v in faces[0])
    return None


def _crop_box(face, shape):
    x, y, fw, fh = face
    cw = fw * 2.45                   # face is ~41% of the portrait width
    ch = cw * H / W
    cx = x + fw / 2
    cy = y + fh * 0.48               # eyes-ish
    top = cy - ch * 0.37
    return int(round(cx - cw / 2)), int(round(top)), int(round(cw)), int(round(ch))


def _padded_crop(bgr, box):
    x, y, w, h = box
    pad = max(w, h)
    big = cv2.copyMakeBorder(bgr, pad, pad, pad, pad, cv2.BORDER_REPLICATE)
    return big[y + pad:y + pad + h, x + pad:x + pad + w].copy()


def _person_mask(img, face_box_local):
    """Soft alpha for the person, seeded from the face position."""
    h, w = img.shape[:2]
    fx, fy, fw, fh = face_box_local
    mask = np.full((h, w), cv2.GC_PR_BGD, np.uint8)
    # body: a trapezoid under the head, head: an ellipse around the face
    body = np.array([[fx - fw * 0.9, h], [fx + fw * 1.9, h], [fx + fw * 1.45, fy + fh * 1.35], [fx - fw * 0.45, fy + fh * 1.35]], np.int32)
    cv2.fillPoly(mask, [body], cv2.GC_PR_FGD)
    cv2.ellipse(mask, (int(fx + fw / 2), int(fy + fh * 0.45)), (int(fw * 0.75), int(fh * 0.95)), 0, 0, 360, cv2.GC_PR_FGD, -1)
    cv2.ellipse(mask, (int(fx + fw / 2), int(fy + fh * 0.55)), (int(fw * 0.32), int(fh * 0.4)), 0, 0, 360, cv2.GC_FGD, -1)
    cv2.rectangle(mask, (int(fx + fw * 0.2), int(fy + fh * 1.6)), (int(fx + fw * 0.8), h - 1), cv2.GC_FGD, -1)
    # the outer border is almost certainly background
    m = max(2, w // 40)
    mask[:m, :] = cv2.GC_BGD
    mask[:, :m] = np.where(mask[:, :m] == cv2.GC_FGD, cv2.GC_FGD, cv2.GC_BGD)
    mask[:, -m:] = np.where(mask[:, -m:] == cv2.GC_FGD, cv2.GC_FGD, cv2.GC_BGD)
    bg, fg = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    try:
        cv2.grabCut(img, mask, None, bg, fg, 6, cv2.GC_INIT_WITH_MASK)
    except cv2.error:
        return None
    alpha = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    # keep the component that holds the face, smooth the edge
    n, lab = cv2.connectedComponents(alpha)
    if n > 2:
        keep = lab[min(h - 1, int(fy + fh * 0.55)), min(w - 1, int(fx + fw / 2))]
        if keep:
            alpha = np.where(lab == keep, 255, 0).astype(np.uint8)
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    alpha = cv2.GaussianBlur(alpha, (0, 0), max(1.5, w / 180))
    cover = alpha.mean() / 255
    if not 0.2 < cover < 0.85:          # segmentation went wrong
        return None
    return alpha


def _grade(rgb):
    """Muted, warm, slightly lifted blacks: the base game's palette."""
    f = rgb.astype(np.float32) / 255
    lum = f @ np.array([0.299, 0.587, 0.114], np.float32)
    f = lum[..., None] + (f - lum[..., None]) * 0.78                       # desaturate
    f = f * np.array([1.04, 1.0, 0.92], np.float32) + np.array([0.02, 0.012, 0.0], np.float32)   # warm
    f = 0.5 + (f - 0.5) * 1.06                                               # a touch of contrast
    f = 0.035 + f * 0.95                                                     # lifted blacks
    return (np.clip(f, 0, 1) * 255).astype(np.uint8)


def render(photo_path, iso, seed, size=(W, H)):
    bgr = cv2.imread(photo_path, cv2.IMREAD_COLOR)
    if bgr is None:
        return None
    face = find_face(bgr)
    if face is None:
        return None
    box = _crop_box(face, bgr.shape)
    crop = _padded_crop(bgr, box)
    work_w, work_h = size[0] * 3, size[1] * 3
    crop = cv2.resize(crop, (work_w, work_h), interpolation=cv2.INTER_LANCZOS4 if crop.shape[1] < work_w else cv2.INTER_AREA)
    scale = work_w / box[2]
    face_local = ((face[0] - box[0]) * scale, (face[1] - box[1]) * scale, face[2] * scale, face[3] * scale)
    alpha = _person_mask(crop, face_local)
    # painted finish
    painted = cv2.xphoto.oilPainting(crop, 4, 1)
    painted = cv2.addWeighted(painted, 0.55, cv2.bilateralFilter(crop, 9, 40, 9), 0.45, 0)
    painted = cv2.detailEnhance(painted, sigma_s=6, sigma_r=0.12)
    rgb = _grade(cv2.cvtColor(painted, cv2.COLOR_BGR2RGB))
    person = Image.fromarray(rgb).convert("RGBA")
    back = background(iso, seed).resize((work_w, work_h), Image.LANCZOS)
    if alpha is None:
        # fall back to the photo's own background, darkened towards the edges
        vig = Image.radial_gradient("L").resize((work_w, int(work_h * 1.15))).crop((0, int(work_h * 0.08), work_w, int(work_h * 1.08)))
        vig = vig.point(lambda v: int(min(255, v * 1.1)))
        dark = Image.new("RGBA", (work_w, work_h), (14, 14, 18, 255))
        out = Image.composite(dark, person, vig.point(lambda v: int(v * 0.65)))
    else:
        a = Image.fromarray(alpha)
        shadow = Image.new("RGBA", (work_w, work_h), (0, 0, 0, 0))
        shadow.putalpha(a.filter(ImageFilter.GaussianBlur(12)).point(lambda v: int(v * 0.5)))
        out = back.copy()
        out.alpha_composite(shadow, (8, 10))
        person.putalpha(a)
        out.alpha_composite(person)
        # rim light from the left so the figure sits in the scene
        edge = a.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(3))
        rim = Image.new("RGBA", (work_w, work_h), (255, 236, 205, 0))
        grad = Image.linear_gradient("L").rotate(90).resize((work_w, work_h)).point(lambda v: 255 - v)
        rim.putalpha(Image.fromarray((np.asarray(edge, np.float32) * np.asarray(grad, np.float32) / 255 * 0.35).astype(np.uint8)))
        out.alpha_composite(rim)
    out = out.resize(size, Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.0, percent=60, threshold=2))
    # canvas grain
    noise = Image.effect_noise(size, 16).convert("L")
    grain = Image.merge("RGBA", (noise, noise, noise, noise.point(lambda v: 16)))
    out = Image.alpha_composite(out.convert("RGBA"), grain)
    return out
