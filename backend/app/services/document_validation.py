"""Structural input validation is NOT malware scanning or clinical validation."""

import base64
import binascii
import hashlib
import re
import struct
import zlib
from backend.app.core.errors import AppError


def validate(data):
    name = data.filename
    if "/" in name or "\\" in name or any(ord(c) < 32 or ord(c) == 127 for c in name):
        raise AppError(
            "INVALID_DOCUMENT", "Filename must not contain paths or control characters", 422
        )
    try:
        content = base64.b64decode(data.content_base64, validate=True)
    except (binascii.Error, ValueError):
        raise AppError("INVALID_DOCUMENT", "Content must be valid base64", 422) from None
    if not 0 < len(content) <= 32768:
        raise AppError("DOCUMENT_LIMIT", "Supported files are limited to 32 KiB", 413)
    if data.media_type == "application/pdf":
        valid = (
            name.lower().endswith(".pdf")
            and bool(re.match(rb"%PDF-[12]\.\d", content))
            and content.rstrip().endswith(b"%%EOF")
        )
    else:
        valid = name.lower().endswith(".png") and content.startswith(b"\x89PNG\r\n\x1a\n")
        offset = 8
        first = True
        saw_data = False
        ended = False
        while valid and offset + 12 <= len(content):
            length = struct.unpack(">I", content[offset : offset + 4])[0]
            kind = content[offset + 4 : offset + 8]
            end = offset + 8 + length
            if end + 4 > len(content):
                valid = False
                break
            payload = content[offset + 8 : end]
            if (
                struct.unpack(">I", content[end : end + 4])[0]
                != zlib.crc32(kind + payload) & 0xFFFFFFFF
            ):
                valid = False
                break
            if first:
                if kind != b"IHDR" or length != 13:
                    valid = False
                    break
                width, height = struct.unpack(">II", payload[:8])
                if not 0 < width <= 4096 or not 0 < height <= 4096 or width * height > 16000000:
                    valid = False
                    break
                first = False
            if kind == b"IDAT":
                saw_data = True
            if kind == b"IEND":
                ended = length == 0 and end + 4 == len(content)
                break
            offset = end + 4
        valid = valid and ended and saw_data
    if not valid:
        raise AppError(
            "INVALID_DOCUMENT", "Filename, declared MIME and supported structure must agree", 422
        )
    return content, hashlib.sha256(content).hexdigest()
