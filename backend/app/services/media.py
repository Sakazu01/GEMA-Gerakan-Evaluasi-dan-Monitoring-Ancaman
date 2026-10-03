"""Bounded photo decoding; remove metadata before private storage."""

import hashlib
from io import BytesIO
import warnings

from fastapi import HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import settings

FORMATS = {"image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WEBP"}
Image.MAX_IMAGE_PIXELS = 25_000_000


def read_photo(photo: UploadFile) -> tuple[bytes, str, str, str]:
    if photo.content_type not in FORMATS:
        raise HTTPException(422, "Format foto harus JPEG, PNG, atau WebP")
    chunks = []
    total = 0
    while chunk := photo.file.read(64 * 1024):
        total += len(chunk)
        if total > settings.max_photo_bytes:
            raise HTTPException(413, "Foto melebihi batas 10 MB")
        chunks.append(chunk)
    original = b"".join(chunks)
    if not original:
        raise HTTPException(422, "Berkas foto kosong")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(original)) as probe:
                if probe.format != FORMATS[photo.content_type] or getattr(probe, "n_frames", 1) > 1:
                    raise ValueError("format_mismatch")
                probe.verify()
            with Image.open(BytesIO(original)) as decoded:
                image = ImageOps.exif_transpose(decoded).convert("RGB")
                image.thumbnail((2048, 2048))
                # Difference hash is a similarity signal, never an authenticity proof.
                small = image.convert("L").resize((9, 8))
                pixels = list(small.get_flattened_data())
                bits = [pixels[y*9+x] > pixels[y*9+x+1] for y in range(8) for x in range(8)]
                phash = f"{sum(int(b) << i for i,b in enumerate(bits)):016x}"
                output = BytesIO()
                image.save(output, "JPEG", quality=85, optimize=True)
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise HTTPException(422, "Isi atau dimensi foto tidak valid") from None
    data = output.getvalue()
    return data, "image/jpeg", hashlib.sha256(original).hexdigest(), phash
